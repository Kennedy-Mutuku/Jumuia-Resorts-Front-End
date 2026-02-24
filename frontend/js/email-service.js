// js/email-service.js
class EmailService {
    constructor() {
        this.serviceID = 'service_9yusqtl';
        this.publicKey = 'QABuHzAPilhRW0PTT';
        this.privateKey = 'Ssz0cTqMngP15Nc8ub_AW';
        this.resortEmails = {
            'limuru': 'reservations.limuru@resortjumuia.com',
            'kanamai': 'reservations.kanamai@resortjumuia.com',
            'kisumu': 'reservations.kisumu@resortjumuia.com',
            'admin': 'admin@resortjumuia.com'
        };
    }

    async sendBookingNotification(bookingData) {
        try {
            const resortEmail = this.resortEmails[bookingData.resort];
            const adminEmail = this.resortEmails['admin'];
            
            // Email content for resort
            const resortEmailContent = {
                service_id: this.serviceID,
                template_id: 'booking_notification_resort',
                user_id: this.publicKey,
                accessToken: this.privateKey,
                template_params: {
                    'to_email': resortEmail,
                    'booking_id': bookingData.bookingId,
                    'guest_name': `${bookingData.firstName} ${bookingData.lastName}`,
                    'guest_email': bookingData.email,
                    'guest_phone': bookingData.phone,
                    'resort_name': this.getResortName(bookingData.resort),
                    'check_in': bookingData.checkIn,
                    'check_out': bookingData.checkOut,
                    'room_type': bookingData.roomType,
                    'package_type': bookingData.packageType,
                    'total_amount': `KSh ${bookingData.totalAmount}`,
                    'special_requests': bookingData.specialRequests || 'None',
                    'payment_method': bookingData.paymentMethod || 'Not specified'
                }
            };

            // Email content for guest
            const guestEmailContent = {
                service_id: this.serviceID,
                template_id: 'booking_confirmation_guest',
                user_id: this.publicKey,
                accessToken: this.privateKey,
                template_params: {
                    'to_email': bookingData.email,
                    'booking_id': bookingData.bookingId,
                    'guest_name': `${bookingData.firstName} ${bookingData.lastName}`,
                    'resort_name': this.getResortName(bookingData.resort),
                    'resort_email': resortEmail,
                    'resort_phone': this.getResortPhone(bookingData.resort),
                    'check_in': bookingData.checkIn,
                    'check_out': bookingData.checkOut,
                    'room_type': bookingData.roomType,
                    'package_type': bookingData.packageType,
                    'total_amount': `KSh ${bookingData.totalAmount}`,
                    'payment_status': bookingData.paymentStatus || 'Pending',
                    'booking_date': new Date().toLocaleDateString('en-KE')
                }
            };

            // Send emails
            await this.sendEmail(resortEmailContent);
            await this.sendEmail(guestEmailContent);
            
            // Send to admin if it's a group booking
            if (bookingData.resort === 'all' || bookingData.sendToAdmin) {
                const adminEmailContent = {
                    ...resortEmailContent,
                    template_params: {
                        ...resortEmailContent.template_params,
                        'to_email': adminEmail
                    }
                };
                await this.sendEmail(adminEmailContent);
            }
            
            return true;
        } catch (error) {
            console.error('Email sending failed:', error);
            // Fallback to Firebase Functions email
            await this.sendFallbackEmail(bookingData);
            return false;
        }
    }

    async sendEmail(emailData) {
        // Using EmailJS service
        return new Promise((resolve, reject) => {
            emailjs.send(
                emailData.service_id,
                emailData.template_id,
                emailData.template_params,
                emailData.accessToken
            )
            .then(response => {
                console.log('Email sent successfully:', response);
                resolve(response);
            })
            .catch(error => {
                console.error('EmailJS error:', error);
                reject(error);
            });
        });
    }

    getResortName(resortCode) {
        const resortNames = {
            'limuru': 'Jumuia Conference & Country Home - Limuru',
            'kanamai': 'Jumuia Conference & Beach Resort - Kanamai',
            'kisumu': 'Jumuia Hotel - Kisumu'
        };
        return resortNames[resortCode] || resortCode;
    }

    getResortPhone(resortCode) {
        const resortPhones = {
            'limuru': '0759 423 589, 020 2048881',
            'kanamai': '0710 288 043',
            'kisumu': '0713 576969, 0115 994486'
        };
        return resortPhones[resortCode] || 'Contact Resort';
    }
}
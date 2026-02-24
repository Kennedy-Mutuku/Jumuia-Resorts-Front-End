// functions/mpesa-integration.js (Cloud Functions)
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// M-Pesa Daraja API Configuration
const MPESA_CONFIG = {
    consumerKey: 'your_consumer_key',
    consumerSecret: 'your_consumer_secret',
    shortCode: 'your_shortcode',
    passKey: 'your_passkey',
    callbackUrl: 'https://your-domain.com/api/mpesa-callback'
};

// Generate access token
async function getMpesaAccessToken() {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    
    try {
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa access token:', error);
        throw error;
    }
}

// STK Push for M-Pesa payment
exports.initiateMpesaPayment = functions.https.onCall(async (data, context) => {
    try {
        const { phoneNumber, amount, bookingId, accountReference } = data;
        
        // Validate input
        if (!phoneNumber || !amount || !bookingId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required parameters'
            );
        }
        
        // Format phone number (254XXXXXXXXX)
        const formattedPhone = phoneNumber.startsWith('0') ? 
            `254${phoneNumber.substring(1)}` : 
            phoneNumber.startsWith('+254') ? 
            phoneNumber.substring(1) : phoneNumber;
        
        // Get access token
        const accessToken = await getMpesaAccessToken();
        
        // Generate timestamp
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        
        // Generate password
        const password = Buffer.from(
            `${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passKey}${timestamp}`
        ).toString('base64');
        
        // STK Push request
        const stkPushRequest = {
            BusinessShortCode: MPESA_CONFIG.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: MPESA_CONFIG.shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: MPESA_CONFIG.callbackUrl,
            AccountReference: accountReference || bookingId,
            TransactionDesc: `Jumuia Resorts Booking - ${bookingId}`
        };
        
        // Make STK Push request
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkPushRequest,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.ResponseCode === '0') {
            // Save payment request to Firestore
            await admin.firestore().collection('mpesa_payments').doc(bookingId).set({
                bookingId: bookingId,
                phoneNumber: formattedPhone,
                amount: amount,
                requestId: response.data.CheckoutRequestID,
                merchantRequestId: response.data.MerchantRequestID,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return {
                success: true,
                checkoutRequestId: response.data.CheckoutRequestID,
                merchantRequestId: response.data.MerchantRequestID,
                message: 'Payment request sent successfully'
            };
        } else {
            throw new functions.https.HttpsError(
                'internal',
                'Failed to initiate M-Pesa payment'
            );
        }
    } catch (error) {
        console.error('M-Pesa payment error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Payment processing failed'
        );
    }
});

// M-Pesa Callback Handler
exports.mpesaCallback = functions.https.onRequest(async (req, res) => {
    try {
        const callbackData = req.body;
        
        // Validate callback
        if (!callbackData.Body.stkCallback) {
            return res.status(400).send('Invalid callback data');
        }
        
        const resultCode = callbackData.Body.stkCallback.ResultCode;
        const resultDesc = callbackData.Body.stkCallback.ResultDesc;
        const checkoutRequestId = callbackData.Body.stkCallback.CheckoutRequestID;
        const merchantRequestId = callbackData.Body.stkCallback.MerchantRequestID;
        
        // Find payment record
        const paymentsRef = admin.firestore().collection('mpesa_payments');
        const querySnapshot = await paymentsRef
            .where('checkoutRequestId', '==', checkoutRequestId)
            .limit(1)
            .get();
        
        if (querySnapshot.empty) {
            return res.status(404).send('Payment record not found');
        }
        
        const paymentDoc = querySnapshot.docs[0];
        const paymentData = paymentDoc.data();
        const bookingId = paymentData.bookingId;
        
        if (resultCode === 0) {
            // Payment successful
            const metadata = callbackData.Body.stkCallback.CallbackMetadata;
            const mpesaReceipt = metadata.Item.find(item => item.Name === 'MpesaReceiptNumber').Value;
            const amount = metadata.Item.find(item => item.Name === 'Amount').Value;
            const phoneNumber = metadata.Item.find(item => item.Name === 'PhoneNumber').Value;
            
            // Update payment record
            await paymentDoc.ref.update({
                status: 'completed',
                mpesaReceipt: mpesaReceipt,
                amountPaid: amount,
                phoneNumberPaid: phoneNumber,
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Update booking status
            const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
            await bookingRef.update({
                paymentStatus: 'paid',
                mpesaReceipt: mpesaReceipt,
                paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Send confirmation email
            await sendPaymentConfirmationEmail(bookingId, mpesaReceipt);
            
            console.log(`Payment completed for booking ${bookingId}, receipt: ${mpesaReceipt}`);
        } else {
            // Payment failed
            await paymentDoc.ref.update({
                status: 'failed',
                failureReason: resultDesc,
                failedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Update booking status
            const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
            await bookingRef.update({
                paymentStatus: 'failed',
                paymentFailureReason: resultDesc
            });
            
            console.log(`Payment failed for booking ${bookingId}: ${resultDesc}`);
        }
        
        res.status(200).send('Callback processed');
    } catch (error) {
        console.error('Callback processing error:', error);
        res.status(500).send('Error processing callback');
    }
});

// Check payment status
exports.checkPaymentStatus = functions.https.onCall(async (data, context) => {
    try {
        const { checkoutRequestId } = data;
        
        if (!checkoutRequestId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing checkoutRequestId'
            );
        }
        
        // Get access token
        const accessToken = await getMpesaAccessToken();
        
        // Check status from M-Pesa
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            {
                BusinessShortCode: MPESA_CONFIG.shortCode,
                Password: Buffer.from(
                    `${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passKey}${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}`
                ).toString('base64'),
                Timestamp: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
                CheckoutRequestID: checkoutRequestId
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            status: response.data.ResultCode === '0' ? 'completed' : 'pending',
            data: response.data
        };
    } catch (error) {
        console.error('Payment status check error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to check payment status'
        );
    }
});

async function sendPaymentConfirmationEmail(bookingId, receiptNumber) {
    try {
        // Get booking details
        const bookingDoc = await admin.firestore()
            .collection('bookings')
            .doc(bookingId)
            .get();
        
        if (!bookingDoc.exists) {
            console.error('Booking not found:', bookingId);
            return;
        }
        
        const bookingData = bookingDoc.data();
        
        // Send email using your EmailJS service
        const emailData = {
            service_id: 'service_9yusqtl',
            template_id: 'template_payment_confirmation',
            user_id: 'QABuHzAPilhRW0PTT',
            template_params: {
                to_email: bookingData.email,
                guest_name: `${bookingData.firstName} ${bookingData.lastName}`,
                booking_id: bookingId,
                mpesa_receipt: receiptNumber,
                amount_paid: `KSh ${bookingData.totalAmount.toLocaleString()}`,
                resort_name: getResortName(bookingData.resort),
                payment_date: new Date().toLocaleDateString('en-KE')
            }
        };
        
        // Send email (implement with your email service)
        await sendEmail(emailData);
        
    } catch (error) {
        console.error('Payment confirmation email error:', error);
    }
}

function getResortName(resortCode) {
    const resorts = {
        'limuru': 'Jumuia Conference & Country Home - Limuru',
        'kanamai': 'Jumuia Conference & Beach Resort - Kanamai',
        'kisumu': 'Jumuia Hotel - Kisumu'
    };
    return resorts[resortCode] || resortCode;
}
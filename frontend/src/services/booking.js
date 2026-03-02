import api from './api';

const RATES = {
    limuru: {
        'standard-room': { bnb: 6500, hb: 8500, fb: 10500 },
        'deluxe-room': { bnb: 8500, hb: 10500, fb: 12500 },
        'family-room': { bnb: 12000, hb: 15000, fb: 18000 },
        'hostel-bed': { bnb: 2500, hb: 3500, fb: 4500 },
        'conference-delegate': { conference: 3500 }
    },
    kanamai: {
        'standard-room': { bnb: 7500, hb: 9500, fb: 11500 },
        'deluxe-room': { bnb: 10000, hb: 12000, fb: 14000 },
        'cottage': { bnb: 15000, hb: 18000, fb: 21000 },
        'hostel-bed': { bnb: 2500, hb: 3500, fb: 4500 },
        'conference-delegate': { conference: 4000 }
    },
    kisumu: {
        'standard-room': { bnb: 7000, hb: 9000, fb: 11000 },
        'deluxe-room': { bnb: 9500, hb: 11500, fb: 13500 },
        'suite': { bnb: 14000, hb: 17000, fb: 20000 },
        'hostel-bed': { bnb: 2000, hb: 3000, fb: 4000 },
        'conference-delegate': { conference: 3500 }
    }
};

const ROOM_TYPES = {
    limuru: [
        { value: 'standard-room', label: 'Standard Room' },
        { value: 'deluxe-room', label: 'Deluxe Room' },
        { value: 'family-room', label: 'Family Room' },
        { value: 'hostel-bed', label: 'Hostel Bed' },
        { value: 'conference-delegate', label: 'Conference Delegate' }
    ],
    kanamai: [
        { value: 'standard-room', label: 'Standard Room' },
        { value: 'deluxe-room', label: 'Deluxe Room' },
        { value: 'cottage', label: 'Cottage' },
        { value: 'hostel-bed', label: 'Hostel Bed' },
        { value: 'conference-delegate', label: 'Conference Delegate' }
    ],
    kisumu: [
        { value: 'standard-room', label: 'Standard Room' },
        { value: 'deluxe-room', label: 'Deluxe Room' },
        { value: 'suite', label: 'Suite' },
        { value: 'hostel-bed', label: 'Hostel Bed' },
        { value: 'conference-delegate', label: 'Conference Delegate' }
    ]
};

export function getRoomTypes(resort) {
    return ROOM_TYPES[resort] || [];
}

export function calculateRate(resort, roomType, packageType, nights, adults, children = 0) {
    const resortRates = RATES[resort];
    if (!resortRates || !resortRates[roomType]) return 0;

    const rate = resortRates[roomType][packageType] || 0;
    const childRate = Math.round(rate * 0.5);
    const total = (rate * adults + childRate * children) * nights;
    return total;
}

export async function saveBooking(bookingData) {
    const response = await api.post('/bookings', bookingData);
    return response.data;
}

export async function getBooking(bookingId) {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
}

export async function checkAvailability(resort, checkIn, checkOut, roomType) {
    const response = await api.get('/bookings/availability', {
        params: { resort, checkIn, checkOut, roomType }
    });
    return response.data;
}

export function getResortName(code) {
    const names = {
        limuru: 'Jumuia Conference & Country Home, Limuru',
        kanamai: 'Jumuia Conference & Beach Resort, Kanamai',
        kisumu: 'Jumuia Hotel Kisumu'
    };
    return names[code] || code;
}

export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-KE', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
}

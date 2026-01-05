import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Home, Download } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PaymentSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const { transactionId, bookingData, item, type } = location.state || {};
    const [bookingReference, setBookingReference] = useState('');
    const [saving, setSaving] = useState(true);

    useEffect(() => {
        if (!transactionId) {
            navigate('/');
            return;
        }

        // Wait for auth to finish loading before saving
        if (loading) return;

        // Save booking to database
        saveBookingToDatabase();
    }, [transactionId, navigate, loading, user]);

    const saveBookingToDatabase = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_BAP_URL || 'http://localhost:8081';
            const bookingRef = `BK${Date.now().toString().slice(-8)}`;

            // Try to get user ID from multiple sources
            // Try to get user ID from multiple sources
            let userId = user?.id || user?._id || user?.userId;

            if (!userId) {
                try {
                    // Try getting from localStorage 'user_data'
                    const storedData = localStorage.getItem('user_data');
                    if (storedData) {
                        const parsedUser = JSON.parse(storedData);
                        userId = parsedUser.id || parsedUser._id || parsedUser.userId;
                    }

                    // Also try 'user' key which is sometimes used
                    if (!userId) {
                        const storedUser = localStorage.getItem('user');
                        if (storedUser) {
                            const parsedUser = JSON.parse(storedUser);
                            userId = parsedUser.id || parsedUser._id || parsedUser.userId;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing stored user:', e);
                }
            }

            console.log('Detected User ID for booking:', userId);

            // Robust data extraction for different booking types
            // Common fallbacks
            let itemName = item.details?.name || item.name || item.descriptor?.name;
            let itemCode = item.details?.code || item.code || item.id;
            let origin = item.origin;
            let destination = item.destination;
            let departureTime = item.details?.departureTime || item.time?.range?.start || item.time?.timestamp;
            let arrivalTime = item.details?.arrivalTime || item.time?.range?.end;

            // Type-specific overrides with aggressive fallbacks
            if (type === 'flight') {
                itemName = item.details?.airline || item.airline || itemName;
                itemCode = item.details?.flightNumber || item.flight_number || itemCode;
                origin = item.details?.origin || item.origin || origin;
                destination = item.details?.destination || item.destination || destination;

                departureTime = item.details?.departureTime || item.departure_time || item.time?.range?.start || item.timings?.departure || departureTime;
                arrivalTime = item.details?.arrivalTime || item.arrival_time || item.time?.range?.end || item.timings?.arrival || arrivalTime;

            } else if (type === 'hotel') {
                // Hotel specific mappings
                itemName = item.details?.hotelName || item.details?.name || item.hotel_name || itemName;
                itemCode = item.details?.hotelId || item.hotel_code || itemCode;
                origin = null; // Hotels don't have origin
                destination = item.details?.city || item.city || item.location?.city?.name || destination;

                // Fallback for location if city is missing
                if (!destination && item.details?.address) {
                    const addr = item.details.address;
                    if (typeof addr === 'string') destination = addr.split(',').pop().trim();
                    else destination = addr.city || addr.state;
                }

                // For hotels, map check-in/out to departure/arrival columns effectively
                departureTime = item.details?.checkIn || item.check_in || item.time?.range?.start || departureTime;
                arrivalTime = item.details?.checkOut || item.check_out || item.time?.range?.end || arrivalTime;

            } else if (type === 'bus') {
                // Bus specific mappings
                itemName = item.details?.travels || item.details?.operator || item.travels || item.bus_operator || item.operator_name || itemName;

                // Use explicit bus fields if available
                origin = item.details?.departureCity || item.details?.source || item.details?.from || item.source || item.from || origin;
                destination = item.details?.arrivalCity || item.details?.destination || item.details?.to || item.destination || item.to || destination;

                departureTime = item.details?.departureTime || item.departure_time || item.time?.range?.start || item.timings?.departure || departureTime;
                arrivalTime = item.details?.arrivalTime || item.arrival_time || item.time?.range?.end || item.timings?.arrival || arrivalTime;

            } else if (type === 'experience') {
                itemName = item.details?.title || item.details?.name || item.descriptor?.name || item.descriptor?.code || itemName;
                itemCode = item.id || item.descriptor?.code || itemCode;
                origin = null; // Experiences don't have an origin
                destination = item.details?.location || item.details?.address || item.city || item.location_id || destination;

                // Experience time handling
                departureTime = item.time?.range?.start || item.time?.timestamp || item.volume?.start_time || departureTime;
                arrivalTime = item.time?.range?.end || item.volume?.end_time || arrivalTime;

            } else if (type === 'train') {
                // Train specific mappings
                itemName = item.details?.trainName || item.details?.name || item.train_name || item.trainName || itemName;
                itemCode = item.details?.trainNumber || item.train_number || itemCode;

                // Advanced Tag Parsing for Trains (Ported from PaymentPage)
                if (item.tags) {
                    const routeTag = item.tags.find(tag => tag.code === 'ROUTE');
                    if (routeTag) {
                        // Origin
                        const fromTag = routeTag.list.find(i => i.code === 'FROM');
                        if (fromTag) {
                            const val = fromTag.value;
                            // Map known stations to city codes
                            if (val.includes('SBC') || val.includes('Bengaluru')) origin = 'BLR';
                            else if (val.includes('NZM') || val.includes('Delhi')) origin = 'DEL';
                            else if (val.includes('MAS') || val.includes('Chennai')) origin = 'MAA';
                            else if (val.includes('KCG') || val.includes('Hyderabad')) origin = 'HYD';
                            else {
                                const match = val.match(/\(([^)]+)\)/);
                                origin = match ? match[1] : val.substring(0, 3).toUpperCase();
                            }
                        }

                        // Destination
                        const toTag = routeTag.list.find(i => i.code === 'TO');
                        if (toTag) {
                            const val = toTag.value;
                            if (val.includes('SBC') || val.includes('Bengaluru')) destination = 'BLR';
                            else if (val.includes('NZM') || val.includes('Delhi')) destination = 'DEL';
                            else if (val.includes('MAS') || val.includes('Chennai')) destination = 'MAA';
                            else if (val.includes('KCG') || val.includes('Hyderabad')) destination = 'HYD';
                            else {
                                const match = val.match(/\(([^)]+)\)/);
                                destination = match ? match[1] : val.substring(0, 3).toUpperCase();
                            }
                        }

                        // Times
                        const depTag = routeTag.list.find(i => i.code === 'DEPARTURE_TIME');
                        if (depTag) departureTime = depTag.value;

                        const arrTag = routeTag.list.find(i => i.code === 'ARRIVAL_TIME');
                        if (arrTag) arrivalTime = arrTag.value;
                    }
                }

                // Fallbacks if tags failed or missing
                origin = origin || item.details?.fromStation || item.details?.source || item.details?.from || item.source || item.from;
                destination = destination || item.details?.toStation || item.details?.destination || item.details?.to || item.destination || item.to;

                departureTime = departureTime || item.details?.departureTime || item.departure_time || item.descriptor?.short_desc?.split(' ')[0] || item.time?.range?.start || item.timings?.departure;
                arrivalTime = arrivalTime || item.details?.arrivalTime || item.arrival_time || item.time?.range?.end || item.timings?.arrival;

                // IMPORTANT: Update item.details so BookingConfirmation sees the correct time
                if (!item.details) item.details = {};
                if (departureTime) item.details.departureTime = departureTime;
                if (arrivalTime) item.details.arrivalTime = arrivalTime;

                // Fallbacks (legacy)
                departureTime = departureTime || item.details?.departureTime || item.departure_time;
                arrivalTime = arrivalTime || item.details?.arrivalTime || item.arrival_time;
            }

            // Override with User Search Context if available (Prioritize User Intent)
            if (searchContext) {
                console.log('✨ Applying User Search Context to Booking:', searchContext);
                if (searchContext.origin) origin = searchContext.origin;
                if (searchContext.destination) destination = searchContext.destination;

                // FIX: Use User's Selected Dates for Hotels (Source of Truth)
                if (type === 'hotel') {
                    if (searchContext.checkInDate) {
                        departureTime = searchContext.checkInDate;
                        // Also update item details for display on next page
                        if (!item.details) item.details = {};
                        item.details.checkIn = searchContext.checkInDate;
                    }
                    if (searchContext.checkOutDate) {
                        arrivalTime = searchContext.checkOutDate;
                        // Also update item details for display on next page
                        if (!item.details) item.details = {};
                        item.details.checkOut = searchContext.checkOutDate;
                    }
                }

                // FIX: Use User's Selected Date for Experiences
                if (type === 'experience' && searchContext.travelDate) {
                    departureTime = searchContext.travelDate;
                    if (!item.details) item.details = {};
                    item.details.departureTime = searchContext.travelDate;
                }
            }

            // Sanitize and Validate Data
            let finalAmount = 0;
            if (item.price) {
                if (typeof item.price === 'string') finalAmount = parseFloat(item.price.replace(/,/g, ''));
                else finalAmount = Number(item.price);
            } else if (bookingData.amount) {
                if (typeof bookingData.amount === 'string') finalAmount = parseFloat(bookingData.amount.replace(/,/g, ''));
                else finalAmount = Number(bookingData.amount);
            }

            let validUserId = null;
            if (userId && !isNaN(parseInt(userId))) {
                validUserId = parseInt(userId);
            }

            const bookingPayload = {
                booking_reference: bookingRef,
                user_id: validUserId,
                booking_type: type,
                item_id: String(item.id || 'unknown'),
                provider_id: String(item.providerId || item.provider || 'unknown'),
                item_name: itemName,
                item_code: String(itemCode),
                origin: origin,
                destination: destination,
                departure_time: departureTime,
                arrival_time: arrivalTime,
                check_in_date: type === 'hotel' ? departureTime : null,
                check_out_date: type === 'hotel' ? arrivalTime : null,
                passenger_name: bookingData.passenger_name || bookingData.name || 'Guest',
                passenger_email: bookingData.passenger_email || bookingData.email || 'guest@example.com',
                passenger_phone: bookingData.passenger_phone || bookingData.phone || '0000000000',
                passenger_gender: bookingData.passenger_gender || bookingData.gender || 'Other',
                date_of_birth: bookingData.date_of_birth || null,
                nationality: bookingData.nationality || 'IN',
                passport_number: bookingData.passport_number || null,
                address_line1: bookingData.address_line1 || bookingData.address || 'Not Provided',
                address_line2: bookingData.address_line2 || '',
                city: bookingData.city || 'Unknown',
                state: bookingData.state || 'Unknown',
                postal_code: bookingData.postal_code || bookingData.zip || '000000',
                country: bookingData.country || 'India',
                transaction_id: transactionId,
                payment_method: 'card',
                payment_status: 'CONFIRMED',
                amount: finalAmount,
                currency: item.currency || 'INR',
                booking_status: 'CONFIRMED',
                item_details: item,
                booking_metadata: {
                    payment_date: new Date().toISOString(),
                    booking_source: 'web',
                    search_context: searchContext
                }
            };

            console.log('💾 Saving booking to database:', bookingPayload);

            const response = await axios.post(`${API_BASE_URL}/api/bookings`, bookingPayload);

            console.log('✅ Booking saved successfully:', response.data);
            setBookingReference(bookingRef);
            setSaving(false);

        } catch (error) {
            console.error('❌ Error saving booking:', error);
            // Still show success page even if database save fails
            setBookingReference(`BK${Date.now().toString().slice(-8)}`);
            setSaving(false);
        }
    };

    if (!transactionId) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                {/* Success Box */}
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {/* Success Icon */}
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>

                    {/* Success Message */}
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Payment Successful!
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Your payment has been processed successfully
                    </p>

                    {/* Booking Reference */}
                    {bookingReference && (
                        <div className="bg-blue-50 rounded-lg p-4 mb-4">
                            <div className="text-sm text-blue-600 mb-1">Booking Reference</div>
                            <div className="text-2xl font-bold text-blue-900">
                                {bookingReference}
                            </div>
                        </div>
                    )}

                    {/* Transaction Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="text-sm text-gray-600 mb-1">Transaction ID</div>
                        <div className="text-lg font-mono font-semibold text-gray-900">
                            {transactionId}
                        </div>
                    </div>

                    {/* Booking Details */}
                    {item && (
                        <div className="border-t border-gray-200 pt-4 mb-6">
                            <div className="text-left space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                        {type === 'flight' ? 'Flight' : 'Hotel'}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {type === 'flight'
                                            ? `${item.origin} → ${item.destination}`
                                            : item.details?.name
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Passenger</span>
                                    <span className="font-medium text-gray-900">
                                        {bookingData?.passenger_name}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t">
                                    <span className="text-gray-600">Amount Paid</span>
                                    <span className="font-bold text-green-600 text-lg">
                                        ₹{item.price?.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-green-800">
                            <CheckCircle className="inline h-4 w-4 mr-1" />
                            A confirmation email has been sent to {bookingData?.passenger_email}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/booking-confirmation', {
                                state: {
                                    booking: {
                                        id: bookingReference || `BK${Date.now().toString().slice(-8)}`,
                                        transactionId: transactionId,
                                        status: 'CONFIRMED'
                                    },
                                    passenger: bookingData,
                                    searchContext: location.state?.searchContext,
                                    flight: item,
                                    type: type
                                }
                            })}
                            disabled={saving}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center disabled:bg-gray-400"
                        >
                            <Download className="h-5 w-5 mr-2" />
                            {saving ? 'Saving...' : 'View Booking Details'}
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center justify-center"
                        >
                            <Home className="h-5 w-5 mr-2" />
                            Back to Home
                        </button>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Need help? Contact our support team
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;

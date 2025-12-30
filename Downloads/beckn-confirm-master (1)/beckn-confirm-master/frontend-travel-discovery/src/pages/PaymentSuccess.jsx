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
            let userId = user?.id;
            if (!userId) {
                try {
                    const storedUser = localStorage.getItem('user_data'); // Check usual storage keys
                    if (storedUser) {
                        userId = JSON.parse(storedUser).id;
                    }
                } catch (e) {
                    console.error('Error parsing stored user:', e);
                }
            }

            // Robust data extraction for different booking types
            let itemName = item.details?.name || item.name;
            let itemCode = item.details?.code || item.code || item.id;
            let origin = item.origin;
            let destination = item.destination;
            let departureTime = item.details?.departureTime;
            let arrivalTime = item.details?.arrivalTime;

            // Type-specific overrides
            if (type === 'flight') {
                itemName = item.details?.airline;
                itemCode = item.details?.flightNumber;
            } else if (type === 'hotel') {
                itemCode = item.details?.hotelId;
                origin = null; // Hotels don't have origin
                destination = item.details?.city || item.city;
            } else if (type === 'bus') {
                itemName = item.details?.operator || item.operator_name;
                origin = item.details?.departureCity || item.origin;
                destination = item.details?.arrivalCity || item.destination;
            } else if (type === 'train') {
                itemName = item.details?.trainName || item.train_name;
                itemCode = item.details?.trainNumber || item.train_number;
                origin = item.details?.fromStation || item.origin;
                destination = item.details?.toStation || item.destination;
            }

            const bookingPayload = {
                booking_reference: bookingRef,
                user_id: userId || null,
                booking_type: type,
                item_id: item.id,
                provider_id: item.providerId,
                item_name: itemName,
                item_code: itemCode,
                origin: origin,
                destination: destination,
                departure_time: departureTime,
                arrival_time: arrivalTime,
                check_in_date: type === 'hotel' ? item.checkIn : null,
                check_out_date: type === 'hotel' ? item.checkOut : null,
                passenger_name: bookingData.passenger_name,
                passenger_email: bookingData.passenger_email,
                passenger_phone: bookingData.passenger_phone,
                passenger_gender: bookingData.passenger_gender,
                date_of_birth: bookingData.date_of_birth,
                nationality: bookingData.nationality,
                passport_number: bookingData.passport_number,
                address_line1: bookingData.address_line1,
                address_line2: bookingData.address_line2,
                city: bookingData.city,
                state: bookingData.state,
                postal_code: bookingData.postal_code,
                country: bookingData.country,
                transaction_id: transactionId,
                payment_method: 'card',
                payment_status: 'PAID',
                amount: item.price,
                currency: item.currency || 'INR',
                booking_status: 'CONFIRMED',
                item_details: item,
                booking_metadata: {
                    payment_date: new Date().toISOString(),
                    booking_source: 'web'
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
                                    flight: item,
                                    passenger: bookingData
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

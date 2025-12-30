import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, Hotel, Calendar, MapPin, IndianRupee, Download, Eye, Loader, AlertCircle, XCircle, RefreshCw, CheckCircle, Clock, Phone, Mail, CreditCard, Bus, Train } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const Bookings = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'flight', 'hotel'
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundDetails, setRefundDetails] = useState(null);
    const [cancellationReason, setCancellationReason] = useState('CUSTOMER_REQUEST');
    const [processing, setProcessing] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_BAP_URL || 'http://localhost:8081';

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        fetchBookings();
    }, [isAuthenticated, navigate]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            setError('');

            console.log('🔍 Fetching bookings for user:', user?.email);

            let realBookings = [];

            if (user?.email) {
                try {
                    // Fetch bookings using user's email
                    const response = await axios.get(`${API_BASE_URL}/api/bookings/email/${user.email}`);
                    realBookings = response.data.bookings || [];
                    console.log(`✅ Found ${realBookings.length} bookings for ${user.email}`);
                } catch (apiError) {
                    console.log('❌ Error fetching bookings:', apiError.message);
                    setError('Failed to load bookings. Please try refreshing the page.');
                }
            } else {
                console.log('❌ No user email available');
                setError('Please log in to view your bookings.');
            }

            // Don't filter out any bookings - show all bookings
            // The localStorage filtering was causing issues
            console.log('📋 Total bookings to display:', realBookings.length);
            
            setBookings(realBookings);
            setLoading(false);

        } catch (err) {
            console.error('❌ Error in fetchBookings:', err);
            setError('Failed to fetch bookings. Please try again.');
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd MMM yyyy, HH:mm');
        } catch {
            return dateString;
        }
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd MMM yyyy');
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'CONFIRMED':
                return 'bg-green-100 text-green-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            case 'COMPLETED':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toUpperCase()) {
            case 'CONFIRMED': return <CheckCircle className="h-4 w-4" />;
            case 'CANCELLED': return <XCircle className="h-4 w-4" />;
            case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const handleCancelBooking = async () => {
        if (!selectedBooking) return;

        try {
            setProcessing(true);
            setError('');

            // Create Beckn cancel request
            const cancelRequest = {
                context: {
                    domain: selectedBooking.booking_type === 'flight' ? 'mobility' : 'hospitality',
                    country: 'IND',
                    city: 'std:080',
                    action: 'cancel',
                    core_version: '1.1.0',
                    bap_id: 'travel-discovery-bap.example.com',
                    bap_uri: API_BASE_URL,
                    transaction_id: `txn-cancel-${Date.now()}`,
                    message_id: `msg-cancel-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    ttl: 'PT30S'
                },
                message: {
                    order_id: selectedBooking.id,
                    cancellation_reason_id: cancellationReason,
                    original_amount: selectedBooking.amount,
                    descriptor: {
                        name: 'Booking Cancellation',
                        short_desc: `Customer requested cancellation: ${getCancellationReasonName(cancellationReason)}`
                    }
                }
            };

            console.log('Sending cancel request:', cancelRequest);

            const response = await axios.post(`${API_BASE_URL}/beckn/cancel`, cancelRequest);

            console.log('Cancel response:', response.data);

            if (response.data && response.data.message) {
                const cancelledOrder = response.data.message.order;
                const refundAmount = cancelledOrder.payment?.params?.amount || (selectedBooking.amount - 500); // Default cancellation charge: ₹500
                const cancellationCharges = selectedBooking.amount - refundAmount;
                const refundId = cancelledOrder.payment?.params?.refund_id || `REF${Date.now()}`;

                // Update booking status in the current list instead of removing it
                setBookings(prev => prev.map(booking => 
                    booking.id === selectedBooking.id 
                        ? { ...booking, booking_status: 'CANCELLED' }
                        : booking
                ));

                // Prepare refund details for modal
                setRefundDetails({
                    bookingType: selectedBooking.booking_type,
                    itemName: selectedBooking.item_name,
                    bookingReference: selectedBooking.booking_reference,
                    cancellationReason: getCancellationReasonName(cancellationReason),
                    originalAmount: selectedBooking.amount,
                    cancellationCharges,
                    refundAmount,
                    refundId,
                    processingTime: '3-5 business days'
                });

                setShowCancelModal(false);
                setSelectedBooking(null);
                setShowRefundModal(true);

                console.log('✅ Booking cancelled and removed from list');
                console.log('💰 Refund processed:', {
                    originalAmount: selectedBooking.amount,
                    cancellationCharges,
                    refundAmount,
                    refundId
                });
            }

        } catch (err) {
            console.error('Cancel booking error:', err);
            setError('Failed to cancel booking. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleCheckStatus = async (booking) => {
        try {
            setProcessing(true);

            const statusRequest = {
                context: {
                    domain: booking.booking_type === 'flight' ? 'mobility' : 'hospitality',
                    country: 'IND',
                    city: 'std:080',
                    action: 'status',
                    core_version: '1.1.0',
                    bap_id: 'travel-discovery-bap.example.com',
                    bap_uri: API_BASE_URL,
                    transaction_id: `txn-status-${Date.now()}`,
                    message_id: `msg-status-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    ttl: 'PT30S'
                },
                message: {
                    order_id: booking.id
                }
            };

            const response = await axios.post(`${API_BASE_URL}/beckn/status`, statusRequest);

            console.log('Status response:', response.data);

            alert(`Booking Status: ${booking.booking_status}\nLast Updated: ${new Date(booking.created_at).toLocaleString()}`);

        } catch (err) {
            console.error('Status check error:', err);
            setError('Failed to check booking status');
        } finally {
            setProcessing(false);
        }
    };

    const getCancellationReasonName = (reasonId) => {
        const reasons = {
            'CUSTOMER_REQUEST': 'Customer requested cancellation',
            'CHANGE_OF_PLANS': 'Change of travel plans',
            'EMERGENCY': 'Emergency situation',
            'DUPLICATE_BOOKING': 'Duplicate booking',
            'PRICE_CHANGE': 'Price change',
            'SERVICE_UNAVAILABLE': 'Service no longer available'
        };
        return reasons[reasonId] || 'Customer requested cancellation';
    };

    const filteredBookings = bookings.filter(booking => {
        if (filter === 'all') return true;
        return booking.booking_type?.toLowerCase() === filter.toLowerCase();
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading your bookings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Bookings</h1>
                    <p className="text-gray-600">View and manage all your travel bookings</p>

                    {/* Debug Info - Always show in development */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                            <strong>Debug Info:</strong> User: {user?.email || 'No email'} |
                            User ID: {user?.id || 'No ID'} |
                            Bookings: {bookings.length} |
                            <button
                                onClick={fetchBookings}
                                className="ml-2 text-blue-600 underline hover:text-blue-800"
                            >
                                Refresh Bookings
                            </button>
                        </p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 flex space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-3 font-medium transition-colors ${filter === 'all'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        All Bookings ({bookings.length})
                    </button>
                    <button
                        onClick={() => setFilter('flight')}
                        className={`px-6 py-3 font-medium transition-colors ${filter === 'flight'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Flights ({bookings.filter(b => b.booking_type === 'flight').length})
                    </button>
                    <button
                        onClick={() => setFilter('hotel')}
                        className={`px-6 py-3 font-medium transition-colors ${filter === 'hotel'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Hotels ({bookings.filter(b => b.booking_type === 'hotel').length})
                    </button>
                    <button
                        onClick={() => setFilter('bus')}
                        className={`px-6 py-3 font-medium transition-colors ${filter === 'bus'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Buses ({bookings.filter(b => b.booking_type === 'bus').length})
                    </button>
                    <button
                        onClick={() => setFilter('train')}
                        className={`px-6 py-3 font-medium transition-colors ${filter === 'train'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Trains ({bookings.filter(b => b.booking_type === 'train').length})
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                        <span className="text-red-800">{error}</span>
                    </div>
                )}

                {/* Bookings List */}
                {filteredBookings.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <div className="text-gray-400 mb-4">
                            {filter === 'flight' ? (
                                <Plane className="h-16 w-16 mx-auto" />
                            ) : filter === 'hotel' ? (
                                <Hotel className="h-16 w-16 mx-auto" />
                            ) : filter === 'bus' ? (
                                <Bus className="h-16 w-16 mx-auto" />
                            ) : filter === 'train' ? (
                                <Train className="h-16 w-16 mx-auto" />
                            ) : (
                                <AlertCircle className="h-16 w-16 mx-auto" />
                            )}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No bookings yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {filter === 'all'
                                ? "You haven't made any bookings yet. Start by searching for flights or hotels!"
                                : `You haven't booked any ${filter}s yet. Search and book to see them here.`
                            }
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                        >
                            Search & Book Now
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    {/* Left Section - Booking Details */}
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-3">
                                            {booking.booking_type?.toLowerCase() === 'flight' ? (
                                                <Plane className="h-6 w-6 text-blue-600" />
                                            ) : booking.booking_type?.toLowerCase() === 'hotel' ? (
                                                <Hotel className="h-6 w-6 text-blue-600" />
                                            ) : booking.booking_type?.toLowerCase() === 'bus' ? (
                                                <Bus className="h-6 w-6 text-blue-600" />
                                            ) : (
                                                <Train className="h-6 w-6 text-blue-600" />
                                            )}
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {booking.booking_type === 'bus' || booking.booking_type === 'train' 
                                                        ? (() => {
                                                            // Try to get the real name from multiple sources
                                                            let realName = null;
                                                            
                                                            // 1. Try item_name if it's valid
                                                            if (booking.item_name && booking.item_name !== 'null' && booking.item_name !== 'undefined') {
                                                                realName = booking.item_name;
                                                            }
                                                            
                                                            // 2. Try item_details.descriptor.name if available
                                                            if (!realName && booking.item_details) {
                                                                try {
                                                                    const details = typeof booking.item_details === 'string' 
                                                                        ? JSON.parse(booking.item_details) 
                                                                        : booking.item_details;
                                                                    if (details.descriptor?.name) {
                                                                        realName = details.descriptor.name;
                                                                    }
                                                                } catch (e) {
                                                                    // Ignore parsing errors
                                                                }
                                                            }
                                                            
                                                            // 3. Fallback based on item_code/item_id pattern
                                                            if (!realName) {
                                                                const itemId = booking.item_code || booking.item_id || '';
                                                                if (itemId.startsWith('bus-')) {
                                                                    // Map common bus IDs to names (you can expand this)
                                                                    const busNames = {
                                                                        'bus-13': 'Kadamba Transport',
                                                                        'bus-15': 'SRS Travels',
                                                                        'SRS-BD-001': 'SRS Travels'
                                                                    };
                                                                    realName = busNames[itemId] || busNames[booking.item_code] || 'Bus Service';
                                                                } else if (itemId.startsWith('train-')) {
                                                                    // Map common train IDs to names
                                                                    const trainNames = {
                                                                        'train-8-2a': 'Rajdhani Express',
                                                                        'train-12-3a': 'Shatabdi Express'
                                                                    };
                                                                    realName = trainNames[itemId] || 'Train Service';
                                                                } else {
                                                                    realName = booking.booking_type === 'bus' ? 'Bus Service' : 'Train Service';
                                                                }
                                                            }
                                                            
                                                            return realName;
                                                        })()
                                                        : (booking.item_name || 'N/A')
                                                    }
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {booking.booking_type === 'bus' || booking.booking_type === 'train' 
                                                        ? (booking.item_code || booking.item_id || 'N/A')
                                                        : (booking.item_code || 'N/A')
                                                    }
                                                </p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${getStatusColor(booking.booking_status)}`}>
                                                {getStatusIcon(booking.booking_status)}
                                                <span>{booking.booking_status}</span>
                                            </div>
                                        </div>

                                        {/* Flight & Bus & Train Details */}
                                        {(booking.booking_type === 'flight' || booking.booking_type === 'bus' || booking.booking_type === 'train') && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500 mb-1">Route</p>
                                                    <p className="font-semibold text-gray-900 flex items-center">
                                                        <MapPin className="h-4 w-4 mr-1" />
                                                        {booking.origin} → {booking.destination}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Departure</p>
                                                    <p className="font-semibold text-gray-900 flex items-center">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        {formatDate(booking.departure_time)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Passenger</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {booking.passenger_name}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hotel Details */}
                                        {booking.booking_type === 'hotel' && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500 mb-1">Check-in</p>
                                                    <p className="font-semibold text-gray-900 flex items-center">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        {formatDateOnly(booking.check_in_date)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Check-out</p>
                                                    <p className="font-semibold text-gray-900 flex items-center">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        {formatDateOnly(booking.check_out_date)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Guest</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {booking.passenger_name}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Booking Reference */}
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                Booking Reference: <span className="font-mono font-semibold text-gray-900">{booking.booking_reference}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Booked on: {formatDate(booking.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right Section - Price & Actions */}
                                    <div className="flex flex-col items-end space-y-3 min-w-[160px]">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                                            <div className="flex items-center space-x-1">
                                                <IndianRupee className="h-5 w-5 text-gray-700" />
                                                <span className="text-2xl font-bold text-gray-900">
                                                    {booking.amount?.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-green-600 font-medium mt-1">
                                                {booking.payment_status}
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col space-y-2 w-full">
                                            <button
                                                onClick={() => navigate('/booking-confirmation', {
                                                    state: {
                                                        booking: {
                                                            id: booking.booking_reference,
                                                            transactionId: booking.transaction_id,
                                                            status: booking.booking_status
                                                        },
                                                        flight: booking.item_details,
                                                        passenger: {
                                                            passenger_name: booking.passenger_name,
                                                            email: booking.passenger_email,
                                                            phone: booking.passenger_phone,
                                                            date_of_birth: booking.date_of_birth,
                                                            nationality: booking.nationality,
                                                            passport_number: booking.passport_number,
                                                            address: booking.address_line1,
                                                            city: booking.city,
                                                            state: booking.state,
                                                            pincode: booking.postal_code,
                                                            country: booking.country
                                                        }
                                                    }
                                                })}
                                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center"
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Details
                                            </button>

                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleCheckStatus(booking)}
                                                    disabled={processing}
                                                    className="flex-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 text-sm font-medium transition-colors"
                                                >
                                                    Check Status
                                                </button>
                                                {booking.booking_status === 'CONFIRMED' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBooking(booking);
                                                            setShowCancelModal(true);
                                                        }}
                                                        className="flex-1 px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cancel Modal */}
            {showCancelModal && selectedBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Cancel Booking
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to cancel this booking? The booking will be removed and refund will be processed.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cancellation Reason
                            </label>
                            <select
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="CUSTOMER_REQUEST">Customer Request</option>
                                <option value="CHANGE_OF_PLANS">Change of Plans</option>
                                <option value="EMERGENCY">Emergency</option>
                                <option value="DUPLICATE_BOOKING">Duplicate Booking</option>
                                <option value="PRICE_CHANGE">Price Change</option>
                            </select>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setSelectedBooking(null);
                                }}
                                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={handleCancelBooking}
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                            >
                                {processing ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Cancel & Refund'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refund Confirmation Modal */}
            {showRefundModal && refundDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
                        <div className="text-center mb-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Booking Cancelled Successfully!
                            </h3>
                            <p className="text-gray-600">
                                Your {refundDetails.bookingType} booking has been cancelled and refund is being processed.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Booking Details */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">{refundDetails.bookingType === 'flight' ? 'Flight' : 'Hotel'}:</span>
                                        <span className="font-medium">{refundDetails.itemName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Reference:</span>
                                        <span className="font-medium">{refundDetails.bookingReference}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Reason:</span>
                                        <span className="font-medium">{refundDetails.cancellationReason}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Refund Details */}
                            <div className="bg-green-50 rounded-lg p-4">
                                <h4 className="font-medium text-green-900 mb-2">💰 Refund Details</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-green-700">Original Amount:</span>
                                        <span className="font-medium">₹{refundDetails.originalAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-700">Cancellation Charges:</span>
                                        <span className="font-medium">-₹{refundDetails.cancellationCharges.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="border-t border-green-200 pt-1 mt-2">
                                        <div className="flex justify-between">
                                            <span className="text-green-800 font-semibold">Refund Amount:</span>
                                            <span className="font-bold text-green-800">₹{refundDetails.refundAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <span className="text-green-700">Refund ID:</span>
                                        <span className="font-medium font-mono text-xs">{refundDetails.refundId}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Processing Info */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">⏰ Processing Information</h4>
                                <div className="text-sm text-blue-800 space-y-1">
                                    <p>• Processing Time: {refundDetails.processingTime}</p>
                                    <p>• Refund will be credited to your original payment method</p>
                                    <p>• You will receive an email confirmation shortly</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => {
                                    setShowRefundModal(false);
                                    setRefundDetails(null);
                                }}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Bookings;

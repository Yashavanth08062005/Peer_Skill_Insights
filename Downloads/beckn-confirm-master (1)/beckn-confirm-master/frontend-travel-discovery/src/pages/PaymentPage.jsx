import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '../context/AuthContext';

const PaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { bookingData, item, type } = location.state || {};
    
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [error, setError] = useState('');
    const [razorpayMethod, setRazorpayMethod] = useState('card'); // For Razorpay sub-methods
    
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        cardHolder: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: ''
    });

    const [razorpayCardDetails, setRazorpayCardDetails] = useState({
        cardNumber: '',
        cardHolder: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: ''
    });

    const [upiDetails, setUpiDetails] = useState({
        upiId: ''
    });

    useEffect(() => {
        if (!bookingData || !item) {
            navigate('/');
        }
    }, [bookingData, item, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Format card number with spaces
        if (name === 'cardNumber') {
            const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            setCardDetails(prev => ({ ...prev, [name]: formatted }));
        } else {
            setCardDetails(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRazorpayInputChange = (e) => {
        const { name, value } = e.target;
        
        // Format card number with spaces for Razorpay
        if (name === 'cardNumber') {
            const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            setRazorpayCardDetails(prev => ({ ...prev, [name]: formatted }));
        } else {
            setRazorpayCardDetails(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleUpiChange = (e) => {
        setUpiDetails({ upiId: e.target.value });
    };

    const simulatePayment = () => {
        return new Promise((resolve) => {
            // Simulate payment processing delay
            setTimeout(() => {
                resolve({ success: true, transactionId: `TXN${Date.now()}` });
            }, 3000);
        });
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setError('');
        setProcessing(true);

        try {
            // Validate card details
            if (paymentMethod === 'card') {
                if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, '').length !== 16) {
                    throw new Error('Please enter a valid 16-digit card number');
                }
                if (!cardDetails.cardHolder) {
                    throw new Error('Please enter card holder name');
                }
                if (!cardDetails.expiryMonth || !cardDetails.expiryYear) {
                    throw new Error('Please enter card expiry date');
                }
                if (!cardDetails.cvv || cardDetails.cvv.length !== 3) {
                    throw new Error('Please enter a valid 3-digit CVV');
                }
            }

            // Simulate payment processing
            const paymentResult = await simulatePayment();

            if (paymentResult.success) {
                // Redirect to payment success page
                navigate('/payment-success', {
                    state: {
                        transactionId: paymentResult.transactionId,
                        bookingData: bookingData,
                        item: item,
                        type: type
                    }
                });
            } else {
                throw new Error('Payment failed. Please try again.');
            }

        } catch (err) {
            setError(err.message || 'Payment failed. Please try again.');
            setProcessing(false);
        }
    };

    const confirmBooking = async (transactionId) => {
        try {
            const API_BASE_URL = import.meta.env.VITE_BAP_URL || 'http://localhost:8081';
            
            // Create Beckn confirm request
            const confirmRequest = {
                context: {
                    domain: (type === 'flight' || type === 'bus' || type === 'train') ? 'mobility' : 'hospitality',
                    country: 'IND',
                    city: 'std:080',
                    action: 'confirm',
                    core_version: '1.1.0',
                    bap_id: 'travel-discovery-bap.example.com',
                    bap_uri: API_BASE_URL,
                    transaction_id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    message_id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString(),
                    ttl: 'PT30S'
                },
                message: {
                    order: {
                        id: `order-${Date.now()}`,
                        state: 'CONFIRMED',
                        provider: {
                            id: item.providerId || 'provider-001'
                        },
                        items: [
                            {
                                id: item.id,
                                quantity: {
                                    count: 1
                                }
                            }
                        ],
                        billing: {
                            name: bookingData.passenger_name,
                            email: bookingData.passenger_email,
                            phone: bookingData.passenger_phone,
                            address: {
                                door: bookingData.address_line1,
                                building: bookingData.address_line2 || '',
                                street: bookingData.address_line1,
                                city: bookingData.city,
                                state: bookingData.state,
                                country: bookingData.country,
                                area_code: bookingData.postal_code
                            }
                        },
                        fulfillment: {
                            type: 'DELIVERY',
                            customer: {
                                person: {
                                    name: bookingData.passenger_name,
                                    age: bookingData.passenger_age,
                                    gender: bookingData.passenger_gender
                                },
                                contact: {
                                    phone: bookingData.passenger_phone,
                                    email: bookingData.passenger_email
                                }
                            }
                        },
                        payment: {
                            type: 'PRE-FULFILLMENT',
                            status: 'PAID',
                            params: {
                                amount: item.price.toString(),
                                currency: item.currency || 'INR',
                                transaction_id: transactionId
                            }
                        },
                        quote: {
                            price: {
                                currency: item.currency || 'INR',
                                value: item.price.toString()
                            }
                        }
                    }
                }
            };

            console.log('📤 Sending Beckn confirm request:', confirmRequest);

            const response = await axios.post(`${API_BASE_URL}/beckn/confirm`, confirmRequest);
            
            console.log('✅ Beckn confirm response:', response.data);

            // Save booking to database API
            try {
                const bookingRef = `BK${Date.now().toString().slice(-8)}`;
                
                const bookingPayload = {
                    booking_reference: bookingRef,
                    user_id: null, // Will be set by backend if user is authenticated
                    booking_type: type,
                    item_id: item.id,
                    provider_id: item.providerId || 'provider-001',
                    item_name: type === 'flight' ? (item.details?.airline || item.airline) : 
                              type === 'bus' ? (item.descriptor?.name || item.details?.name || item.name) :
                              type === 'train' ? (item.descriptor?.name || item.details?.name || item.name) :
                              (item.details?.name || item.name),
                    item_code: type === 'flight' ? (item.details?.flightNumber || item.flightNumber) : 
                              type === 'bus' ? (item.descriptor?.code || item.details?.code || item.id) :
                              type === 'train' ? (item.descriptor?.code || item.details?.code || item.id) :
                              (item.details?.hotelId || item.id),
                    origin: (type === 'flight' || type === 'bus' || type === 'train') ? (item.origin || item.details?.origin) : null,
                    destination: (type === 'flight' || type === 'bus' || type === 'train') ? (item.destination || item.details?.destination) : null,
                    departure_time: (type === 'flight' || type === 'bus' || type === 'train') ? (item.details?.departureTime || item.departureTime || item.time?.timestamp) : null,
                    arrival_time: (type === 'flight' || type === 'bus' || type === 'train') ? (item.details?.arrivalTime || item.arrivalTime) : null,
                    check_in_date: type === 'hotel' ? (item.checkIn || item.details?.checkIn) : null,
                    check_out_date: type === 'hotel' ? (item.checkOut || item.details?.checkOut) : null,
                    passenger_name: bookingData.passenger_name,
                    passenger_email: user?.email || bookingData.passenger_email,
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
                    payment_method: paymentMethod,
                    payment_status: 'PAID',
                    amount: item.price,
                    currency: item.currency || 'INR',
                    booking_status: 'CONFIRMED',
                    beckn_transaction_id: confirmRequest.context.transaction_id,
                    beckn_message_id: confirmRequest.context.message_id,
                    order_id: confirmRequest.message.order.id,
                    item_details: item,
                    booking_metadata: {
                        payment_date: new Date().toISOString(),
                        booking_source: 'web',
                        beckn_response: response.data
                    }
                };

                console.log('🔍 Debug - User info for booking:', {
                    userEmail: user?.email,
                    userName: user?.full_name,
                    formEmail: bookingData.passenger_email,
                    finalEmail: user?.email || bookingData.passenger_email
                });
                
                console.log('💾 Saving booking to database:', bookingPayload);

                const bookingResponse = await axios.post(`${API_BASE_URL}/api/bookings`, bookingPayload);
                
                console.log('✅ Booking saved successfully:', bookingResponse.data);

                // Navigate to confirmation page with saved booking reference
                navigate('/booking-confirmation', {
                    state: {
                        booking: {
                            id: bookingRef,
                            transactionId: transactionId,
                            status: 'CONFIRMED',
                            paymentMethod: paymentMethod
                        },
                        flight: {
                            ...item,
                            details: item.details
                        },
                        passenger: bookingData
                    }
                });

            } catch (bookingError) {
                console.error('❌ Error saving booking to database:', bookingError);
                
                // Still navigate to confirmation page even if database save fails
                navigate('/booking-confirmation', {
                    state: {
                        booking: {
                            id: confirmRequest.message.order.id,
                            transactionId: transactionId,
                            status: 'CONFIRMED',
                            paymentMethod: paymentMethod
                        },
                        flight: {
                            ...item,
                            details: item.details
                        },
                        passenger: bookingData
                    }
                });
            }

        } catch (err) {
            console.error('❌ Beckn confirm error:', err);
            throw new Error('Failed to confirm booking. Please contact support.');
        }
    };

    if (!bookingData || !item) {
        return null;
    }

    const totalAmount = item.price || 0;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
                    <p className="text-gray-600 mt-2">Complete your booking securely</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Payment Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-md p-6">
                            {/* Security Badge */}
                            <div className="flex items-center justify-center mb-6 p-4 bg-green-50 rounded-lg">
                                <Lock className="h-5 w-5 text-green-600 mr-2" />
                                <span className="text-sm text-green-800 font-medium">
                                    Secure Payment - Your data is encrypted
                                </span>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Payment Method
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                                            paymentMethod === 'card'
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <CreditCard className="h-5 w-5 mx-auto mb-1" />
                                        <span className="text-xs font-medium">Card</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('razorpay')}
                                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                                            paymentMethod === 'razorpay'
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-sm mb-1 font-bold text-blue-600">Rzp</div>
                                        <span className="text-xs font-medium">Razorpay</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('paypal')}
                                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                                            paymentMethod === 'paypal'
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-sm mb-1 font-bold text-blue-600">PayPal</div>
                                        <span className="text-xs font-medium">PayPal</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('upi')}
                                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                                            paymentMethod === 'upi'
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-lg mb-1">₹</div>
                                        <span className="text-xs font-medium">UPI</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                                            paymentMethod === 'wallet'
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-lg mb-1">💳</div>
                                        <span className="text-xs font-medium">Wallet</span>
                                    </button>
                                </div>
                            </div>

                            {/* Card Payment Form */}
                            {paymentMethod === 'card' && (
                                <form onSubmit={handlePayment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Card Number
                                        </label>
                                        <input
                                            type="text"
                                            name="cardNumber"
                                            value={cardDetails.cardNumber}
                                            onChange={handleInputChange}
                                            placeholder="1234 5678 9012 3456"
                                            maxLength="19"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Card Holder Name
                                        </label>
                                        <input
                                            type="text"
                                            name="cardHolder"
                                            value={cardDetails.cardHolder}
                                            onChange={handleInputChange}
                                            placeholder="John Doe"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Month
                                            </label>
                                            <select
                                                name="expiryMonth"
                                                value={cardDetails.expiryMonth}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="">MM</option>
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                    <option key={month} value={month.toString().padStart(2, '0')}>
                                                        {month.toString().padStart(2, '0')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Year
                                            </label>
                                            <select
                                                name="expiryYear"
                                                value={cardDetails.expiryYear}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="">YY</option>
                                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                                    <option key={year} value={year.toString().slice(-2)}>
                                                        {year.toString().slice(-2)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                CVV
                                            </label>
                                            <input
                                                type="text"
                                                name="cvv"
                                                value={cardDetails.cvv}
                                                onChange={handleInputChange}
                                                placeholder="123"
                                                maxLength="3"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                            <span className="text-sm text-red-800">{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader className="animate-spin h-5 w-5 mr-2" />
                                                Processing Payment...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="h-5 w-5 mr-2" />
                                                Pay ₹{totalAmount.toLocaleString('en-IN')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Razorpay Payment */}
                            {paymentMethod === 'razorpay' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800 mb-2">
                                            <CheckCircle className="inline h-4 w-4 mr-1" />
                                            Razorpay Payment Gateway (Demo Mode)
                                        </p>
                                        <p className="text-xs text-blue-600">
                                            Choose your preferred payment method and enter details
                                        </p>
                                    </div>

                                    {/* Razorpay Payment Method Selection */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            Select Payment Method
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setRazorpayMethod('card')}
                                                className={`p-3 border-2 rounded-lg text-center transition-all ${
                                                    razorpayMethod === 'card'
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <CreditCard className="h-5 w-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Cards</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRazorpayMethod('upi')}
                                                className={`p-3 border-2 rounded-lg text-center transition-all ${
                                                    razorpayMethod === 'upi'
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="text-lg mb-1">₹</div>
                                                <span className="text-sm font-medium">UPI</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRazorpayMethod('netbanking')}
                                                className={`p-3 border-2 rounded-lg text-center transition-all ${
                                                    razorpayMethod === 'netbanking'
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="text-lg mb-1">🏦</div>
                                                <span className="text-sm font-medium">Net Banking</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRazorpayMethod('wallet')}
                                                className={`p-3 border-2 rounded-lg text-center transition-all ${
                                                    razorpayMethod === 'wallet'
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="text-lg mb-1">💳</div>
                                                <span className="text-sm font-medium">Wallets</span>
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                            <span className="text-sm text-red-800">{error}</span>
                                        </div>
                                    )}

                                    {/* Card Payment Form */}
                                    {razorpayMethod === 'card' && (
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            try {
                                                setProcessing(true);
                                                setError('');

                                                // Validate Razorpay card details
                                                if (!razorpayCardDetails.cardNumber || razorpayCardDetails.cardNumber.replace(/\s/g, '').length !== 16) {
                                                    throw new Error('Please enter a valid 16-digit card number');
                                                }
                                                if (!razorpayCardDetails.cardHolder) {
                                                    throw new Error('Please enter card holder name');
                                                }
                                                if (!razorpayCardDetails.expiryMonth || !razorpayCardDetails.expiryYear) {
                                                    throw new Error('Please enter card expiry date');
                                                }
                                                if (!razorpayCardDetails.cvv || razorpayCardDetails.cvv.length !== 3) {
                                                    throw new Error('Please enter a valid 3-digit CVV');
                                                }

                                                // Simulate Razorpay card payment processing
                                                await new Promise(resolve => setTimeout(resolve, 2500));
                                                
                                                const fakePaymentId = `pay_razorpay_card_${Date.now()}`;
                                                console.log('Demo Razorpay Card payment successful:', fakePaymentId);
                                                
                                                await confirmBooking(fakePaymentId);
                                                
                                            } catch (err) {
                                                setError(err.message || 'Payment failed. Please try again.');
                                                setProcessing(false);
                                            }
                                        }} className="space-y-4">
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-xs text-green-700">
                                                    <strong>Demo Test Cards:</strong> 4111 1111 1111 1111 (Visa) | 5555 5555 5555 4444 (Mastercard)
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Card Number
                                                </label>
                                                <input
                                                    type="text"
                                                    name="cardNumber"
                                                    value={razorpayCardDetails.cardNumber}
                                                    onChange={handleRazorpayInputChange}
                                                    placeholder="1234 5678 9012 3456"
                                                    maxLength="19"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Card Holder Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="cardHolder"
                                                    value={razorpayCardDetails.cardHolder}
                                                    onChange={handleRazorpayInputChange}
                                                    placeholder="John Doe"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Month
                                                    </label>
                                                    <select
                                                        name="expiryMonth"
                                                        value={razorpayCardDetails.expiryMonth}
                                                        onChange={handleRazorpayInputChange}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        required
                                                    >
                                                        <option value="">MM</option>
                                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                            <option key={month} value={month.toString().padStart(2, '0')}>
                                                                {month.toString().padStart(2, '0')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Year
                                                    </label>
                                                    <select
                                                        name="expiryYear"
                                                        value={razorpayCardDetails.expiryYear}
                                                        onChange={handleRazorpayInputChange}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        required
                                                    >
                                                        <option value="">YY</option>
                                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                                            <option key={year} value={year.toString().slice(-2)}>
                                                                {year.toString().slice(-2)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        CVV
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="cvv"
                                                        value={razorpayCardDetails.cvv}
                                                        onChange={handleRazorpayInputChange}
                                                        placeholder="123"
                                                        maxLength="3"
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {processing ? (
                                                    <>
                                                        <Loader className="animate-spin h-5 w-5 mr-2" />
                                                        Processing Card Payment...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="h-5 w-5 mr-2" />
                                                        Pay ₹{totalAmount.toLocaleString('en-IN')}
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    )}

                                    {/* UPI Payment Form */}
                                    {razorpayMethod === 'upi' && (
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            try {
                                                setProcessing(true);
                                                setError('');

                                                if (!upiDetails.upiId) {
                                                    throw new Error('Please enter UPI ID');
                                                }

                                                // Simulate UPI payment processing
                                                await new Promise(resolve => setTimeout(resolve, 2000));
                                                
                                                const fakePaymentId = `pay_razorpay_upi_${Date.now()}`;
                                                console.log('Demo Razorpay UPI payment successful:', fakePaymentId);
                                                
                                                await confirmBooking(fakePaymentId);
                                                
                                            } catch (err) {
                                                setError(err.message || 'UPI payment failed. Please try again.');
                                                setProcessing(false);
                                            }
                                        }} className="space-y-4">
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-xs text-green-700">
                                                    <strong>Demo UPI IDs:</strong> success@razorpay | demo@paytm | test@gpay
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    UPI ID
                                                </label>
                                                <input
                                                    type="text"
                                                    value={upiDetails.upiId}
                                                    onChange={handleUpiChange}
                                                    placeholder="yourname@upi"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    required
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {processing ? (
                                                    <>
                                                        <Loader className="animate-spin h-5 w-5 mr-2" />
                                                        Processing UPI Payment...
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="mr-2 text-lg">₹</div>
                                                        Pay ₹{totalAmount.toLocaleString('en-IN')} via UPI
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    )}

                                    {/* Net Banking */}
                                    {razorpayMethod === 'netbanking' && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-xs text-green-700">
                                                    <strong>Demo Mode:</strong> Select any bank to simulate net banking payment
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Select Your Bank
                                                </label>
                                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                                    <option value="">Choose Bank</option>
                                                    <option value="HDFC">HDFC Bank</option>
                                                    <option value="ICICI">ICICI Bank</option>
                                                    <option value="SBI">State Bank of India</option>
                                                    <option value="AXIS">Axis Bank</option>
                                                    <option value="KOTAK">Kotak Mahindra Bank</option>
                                                    <option value="YES">Yes Bank</option>
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        setProcessing(true);
                                                        setError('');
                                                        
                                                        await new Promise(resolve => setTimeout(resolve, 2500));
                                                        
                                                        const fakePaymentId = `pay_razorpay_nb_${Date.now()}`;
                                                        console.log('Demo Razorpay Net Banking payment successful:', fakePaymentId);
                                                        
                                                        await confirmBooking(fakePaymentId);
                                                        
                                                    } catch (err) {
                                                        setError('Net Banking payment failed. Please try again.');
                                                        setProcessing(false);
                                                    }
                                                }}
                                                disabled={processing}
                                                className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg hover:bg-purple-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {processing ? (
                                                    <>
                                                        <Loader className="animate-spin h-5 w-5 mr-2" />
                                                        Processing Net Banking...
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="mr-2 text-lg">🏦</div>
                                                        Pay ₹{totalAmount.toLocaleString('en-IN')} via Net Banking
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* Wallets */}
                                    {razorpayMethod === 'wallet' && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-xs text-green-700">
                                                    <strong>Demo Mode:</strong> Select any wallet to simulate payment
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Select Wallet
                                                </label>
                                                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                                    <option value="">Choose Wallet</option>
                                                    <option value="paytm">Paytm</option>
                                                    <option value="phonepe">PhonePe</option>
                                                    <option value="amazonpay">Amazon Pay</option>
                                                    <option value="mobikwik">MobiKwik</option>
                                                    <option value="freecharge">FreeCharge</option>
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        setProcessing(true);
                                                        setError('');
                                                        
                                                        await new Promise(resolve => setTimeout(resolve, 1800));
                                                        
                                                        const fakePaymentId = `pay_razorpay_wallet_${Date.now()}`;
                                                        console.log('Demo Razorpay Wallet payment successful:', fakePaymentId);
                                                        
                                                        await confirmBooking(fakePaymentId);
                                                        
                                                    } catch (err) {
                                                        setError('Wallet payment failed. Please try again.');
                                                        setProcessing(false);
                                                    }
                                                }}
                                                disabled={processing}
                                                className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg hover:bg-orange-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {processing ? (
                                                    <>
                                                        <Loader className="animate-spin h-5 w-5 mr-2" />
                                                        Processing Wallet Payment...
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="mr-2 text-lg">💳</div>
                                                        Pay ₹{totalAmount.toLocaleString('en-IN')} via Wallet
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-xs text-yellow-700">
                                            🚧 <strong>Demo Mode:</strong> This simulates Razorpay's payment flow with form validation. No real money will be charged.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* PayPal Payment */}
                            {paymentMethod === 'paypal' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800 mb-2">
                                            <CheckCircle className="inline h-4 w-4 mr-1" />
                                            PayPal Payment (Demo Mode)
                                        </p>
                                        <p className="text-xs text-blue-600">
                                            This is a demo PayPal payment - no real money will be charged
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                            <span className="text-sm text-red-800">{error}</span>
                                        </div>
                                    )}

                                    {/* Demo PayPal Button */}
                                    <div className="space-y-3">
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm text-yellow-800 font-medium mb-2">
                                                🚧 Demo PayPal Integration
                                            </p>
                                            <p className="text-xs text-yellow-700">
                                                This simulates PayPal payment without real transactions. 
                                                Click the button below to simulate a successful PayPal payment.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    setProcessing(true);
                                                    setError('');
                                                    
                                                    // Simulate PayPal payment processing
                                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                                    
                                                    // Generate fake PayPal transaction ID
                                                    const fakeTransactionId = `PAYPAL_DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                                    
                                                    console.log('Demo PayPal payment successful:', fakeTransactionId);
                                                    
                                                    // Call the confirm booking function with fake PayPal transaction ID
                                                    await confirmBooking(fakeTransactionId);
                                                    
                                                } catch (err) {
                                                    console.error('Demo PayPal payment error:', err);
                                                    setError('Demo PayPal payment failed. Please try again.');
                                                    setProcessing(false);
                                                }
                                            }}
                                            disabled={processing}
                                            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {processing ? (
                                                <>
                                                    <Loader className="animate-spin h-5 w-5 mr-2" />
                                                    Processing Demo PayPal Payment...
                                                </>
                                            ) : (
                                                <>
                                                    <div className="mr-2 text-lg font-bold">PayPal</div>
                                                    Pay ${(totalAmount / 83).toFixed(2)} USD (Demo)
                                                </>
                                            )}
                                        </button>

                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">
                                                Demo mode - No real payment will be processed
                                            </p>
                                        </div>
                                    </div>

                                    {processing && (
                                        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <Loader className="animate-spin h-5 w-5 text-blue-600 mr-2" />
                                            <span className="text-sm text-blue-800">Processing demo PayPal payment...</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* UPI Payment */}
                            {paymentMethod === 'upi' && (
                                <form onSubmit={handlePayment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            UPI ID
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="yourname@upi"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    {error && (
                                        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                            <span className="text-sm text-red-800">{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader className="animate-spin h-5 w-5 mr-2" />
                                                Processing Payment...
                                            </>
                                        ) : (
                                            <>
                                                Pay ₹{totalAmount.toLocaleString('en-IN')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Wallet Payment */}
                            {paymentMethod === 'wallet' && (
                                <form onSubmit={handlePayment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Wallet
                                        </label>
                                        <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <option>Paytm</option>
                                            <option>PhonePe</option>
                                            <option>Google Pay</option>
                                            <option>Amazon Pay</option>
                                        </select>
                                    </div>

                                    {error && (
                                        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                                            <span className="text-sm text-red-800">{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader className="animate-spin h-5 w-5 mr-2" />
                                                Processing Payment...
                                            </>
                                        ) : (
                                            <>
                                                Pay ₹{totalAmount.toLocaleString('en-IN')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                            
                            {type === 'flight' && (
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-start">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">
                                                {item.details?.airline || 'Flight'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {item.origin} → {item.destination}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {item.details?.flightNumber}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Base Fare</span>
                                    <span className="text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Taxes & Fees</span>
                                    <span className="text-gray-900">Included</span>
                                </div>
                            </div>

                            <div className="border-t mt-4 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-blue-600">
                                            ₹{totalAmount.toLocaleString('en-IN')}
                                        </span>
                                        {paymentMethod === 'paypal' && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                ≈ ${(totalAmount / 83).toFixed(2)} USD
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <p className="text-xs text-blue-800">
                                    <CheckCircle className="inline h-4 w-4 mr-1" />
                                    Your booking is protected by our secure payment system
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;

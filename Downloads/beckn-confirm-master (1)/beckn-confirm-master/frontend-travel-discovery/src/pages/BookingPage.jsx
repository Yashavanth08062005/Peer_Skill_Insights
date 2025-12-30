import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, Hotel, User, MapPin, CreditCard, Loader, Train, Bus } from 'lucide-react';
import axios from 'axios';

const BookingPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const { item, type } = location.state || {};

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        passenger_name: user?.full_name || '',
        passenger_email: user?.email || '',
        passenger_phone: user?.phone || '',
        passenger_age: '',
        passenger_gender: 'male',
        date_of_birth: '',
        nationality: 'Indian',
        passport_number: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India'
    });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location } });
        }
        if (!item) {
            navigate('/');
        }
    }, [isAuthenticated, item, navigate, location]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.passenger_name || !formData.passenger_email || !formData.passenger_phone) {
            alert('Please fill in all required passenger details');
            return;
        }

        if (!formData.address_line1 || !formData.city || !formData.state || !formData.postal_code) {
            alert('Please fill in all required address details');
            return;
        }

        setLoading(true);
        setError('');

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
                        state: 'CREATED',
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
                            name: formData.passenger_name,
                            email: formData.passenger_email,
                            phone: formData.passenger_phone,
                            address: {
                                door: formData.address_line1,
                                building: formData.address_line2 || '',
                                street: formData.address_line1,
                                city: formData.city,
                                state: formData.state,
                                country: formData.country,
                                area_code: formData.postal_code
                            }
                        },
                        fulfillment: {
                            type: 'DELIVERY',
                            customer: {
                                person: {
                                    name: formData.passenger_name,
                                    gender: formData.passenger_gender
                                },
                                contact: {
                                    phone: formData.passenger_phone,
                                    email: formData.passenger_email
                                }
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

            // Navigate to payment page after successful confirmation
            navigate('/payment', {
                state: {
                    bookingData: formData,
                    item: item,
                    type: type,
                    confirmResponse: response.data
                }
            });

        } catch (err) {
            console.error('❌ Beckn confirm error:', err);
            setError(err.response?.data?.error?.message || err.message || 'Failed to confirm booking. Please try again.');
            setLoading(false);
        }
    };

    if (!item) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No booking information found</p>
                    <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-700 font-medium">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Complete Your Booking</h1>
                    <p className="text-gray-600 mt-2">Please fill in your details to proceed</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <User className="h-6 w-6 mr-2 text-blue-600" />
                                    Passenger Details
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                        <input type="text" name="passenger_name" value={formData.passenger_name} onChange={handleInputChange} placeholder="John Doe" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                        <input type="email" name="passenger_email" value={formData.passenger_email} onChange={handleInputChange} placeholder="john@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                                        <input type="tel" name="passenger_phone" value={formData.passenger_phone} onChange={handleInputChange} placeholder="+91 9876543210" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                                        <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                                        <select name="passenger_gender" value={formData.passenger_gender} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nationality *</label>
                                        <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} placeholder="Indian" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    {type === 'flight' && item.details?.flightNumber?.startsWith('02-') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
                                            <input type="text" name="passport_number" value={formData.passport_number} onChange={handleInputChange} placeholder="A12345678" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <MapPin className="h-6 w-6 mr-2 text-blue-600" />
                                    Address Information
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                                        <input type="text" name="address_line1" value={formData.address_line1} onChange={handleInputChange} placeholder="hno 453 , jp nagar" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="bangalore" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                                        <input type="text" name="state" value={formData.state} onChange={handleInputChange} placeholder="Karnataka" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                                        <input type="text" name="postal_code" value={formData.postal_code} onChange={handleInputChange} placeholder="583201" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                                        <input type="text" name="country" value={formData.country} onChange={handleInputChange} placeholder="India" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin h-5 w-5 mr-2" />
                                        Confirming Booking...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="h-5 w-5 mr-2" />
                                        Confirm Booking - ₹{item.price?.toLocaleString('en-IN')}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Summary</h2>

                            {type === 'flight' ? (
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <Plane className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{item.details?.airline || 'Flight'}</p>
                                            <p className="text-sm text-gray-600">{item.details?.flightNumber}</p>
                                        </div>
                                    </div>
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Route</span>
                                            <span className="text-sm font-medium text-gray-900">{item.origin} → {item.destination}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Duration</span>
                                            <span className="text-sm font-medium text-gray-900">{item.details?.duration || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Baggage</span>
                                            <span className="text-sm font-medium text-gray-900">{item.details?.baggage || '20kg'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : type === 'train' ? (
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <Train className="h-6 w-6 text-green-600 mr-3 mt-1" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{item.details?.trainName || 'Train'}</p>
                                            <p className="text-sm text-gray-600">{item.details?.trainNumber}</p>
                                        </div>
                                    </div>
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Route</span>
                                            <span className="text-sm font-medium text-gray-900">{item.origin} → {item.destination}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Class</span>
                                            <span className="text-sm font-medium text-gray-900">{item.details?.class || 'Standard'}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Duration</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {(() => {
                                                    const dur = item.details?.duration || 'N/A';
                                                    const mins = parseInt(dur);
                                                    if (!isNaN(mins)) {
                                                        const h = Math.floor(mins / 60);
                                                        const m = mins % 60;
                                                        return `${h}h ${m.toString().padStart(2, '0')}m`;
                                                    }
                                                    return dur;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : type === 'bus' ? (
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <Bus className="h-6 w-6 text-orange-600 mr-3 mt-1" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{item.details?.operator || 'Bus Operator'}</p>
                                            <p className="text-sm text-gray-600">{item.details?.busType || 'Bus'}</p>
                                        </div>
                                    </div>
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Route</span>
                                            <span className="text-sm font-medium text-gray-900">{item.origin} → {item.destination}</span>
                                        </div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-600">Duration</span>
                                            <span className="text-sm font-medium text-gray-900">{item.details?.duration || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <Hotel className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{item.details?.name || 'Hotel'}</p>
                                            <p className="text-sm text-gray-600">{item.details?.roomType || 'Room'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t mt-6 pt-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Base Price</span>
                                    <span className="text-gray-900 font-medium">₹{item.price?.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-600">Taxes & Fees</span>
                                    <span className="text-gray-900 font-medium">Included</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t">
                                    <span className="text-lg font-bold text-gray-900">Total</span>
                                    <span className="text-2xl font-bold text-blue-600">₹{item.price?.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingPage;

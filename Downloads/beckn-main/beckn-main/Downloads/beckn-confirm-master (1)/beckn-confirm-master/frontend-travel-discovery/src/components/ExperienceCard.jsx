import React, { useState } from 'react';
import { MapPin, Star, Clock, User, Info, ChevronDown, ChevronUp, IndianRupee, Camera, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ExperienceCard = ({ option }) => {
    const [showDetails, setShowDetails] = useState(false);
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const handleBookNow = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: '/booking', item: option, type: 'experience' } });
            return;
        }
        navigate('/booking', { state: { item: option, type: 'experience' } });
    };

    const details = option.details || {};
    const image = details.images && details.images.length > 0 ? details.images[0] : null;

    return (
        <div className="card hover:border-purple-300 border-2 border-transparent transition-all overflow-hidden">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Image Section */}
                {image && (
                    <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-200">
                        <img
                            src={image}
                            alt={details.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/300x200?text=Experience';
                            }}
                        />
                        {details.type && (
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                {details.type}
                            </div>
                        )}
                    </div>
                )}

                {/* Content Section */}
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 mb-1">{details.name || 'Local Experience'}</h3>
                                {details.rating && (
                                    <div className="flex items-center space-x-1 text-sm mb-2">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span className="font-semibold text-gray-700">{details.rating}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-600">{details.city || 'Local'}</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="flex items-center space-x-1 justify-end text-purple-600">
                                    <IndianRupee className="h-5 w-5" />
                                    <span className="text-2xl font-bold">{option.price}</span>
                                </div>
                                <p className="text-xs text-gray-500">per person</p>
                            </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {details.shortDesc || details.description || 'Enjoy a wonderful local experience.'}
                        </p>

                        {/* Quick Info */}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-700 mb-3">
                            {details.duration && (
                                <div className="flex items-center space-x-1 bg-purple-50 px-2 py-1 rounded text-purple-700">
                                    <Clock className="h-4 w-4" />
                                    <span>{details.duration}</span>
                                </div>
                            )}
                            {details.location && (
                                <div className="flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded text-gray-700">
                                    <MapPin className="h-4 w-4" />
                                    <span>{details.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 text-sm font-medium"
                        >
                            {showDetails ? (
                                <><span>Hide Details</span><ChevronUp className="h-4 w-4" /></>
                            ) : (
                                <><span>View Details</span><ChevronDown className="h-4 w-4" /></>
                            )}
                        </button>
                        <button
                            onClick={handleBookNow}
                            className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 font-semibold transition-colors text-sm shadow-md hover:shadow-lg"
                        >
                            Book Experience
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {showDetails && (
                <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4 animate-fadeIn">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4 text-purple-500" />
                        About this Activity
                    </h4>
                    <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                        {details.longDesc || details.description || "No full description available."}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded border border-gray-200">
                            <h5 className="font-medium text-gray-800 text-sm mb-2">Highlights</h5>
                            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                                <li>Instant Confirmation</li>
                                <li>Mobile Voucher Accepted</li>
                                <li>Free Cancellation (up to 24h before)</li>
                            </ul>
                        </div>
                        <div className="bg-white p-3 rounded border border-gray-200">
                            <h5 className="font-medium text-gray-800 text-sm mb-2">Additional Info</h5>
                            <div className="text-xs text-gray-600 space-y-1">
                                <p><span className="font-medium">Provider:</span> {option.provider}</p>
                                <p><span className="font-medium">Type:</span> {details.type || 'Experience'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExperienceCard;

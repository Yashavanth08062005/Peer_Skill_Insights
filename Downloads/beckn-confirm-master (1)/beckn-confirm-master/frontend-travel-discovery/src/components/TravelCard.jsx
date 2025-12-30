import React, { useState } from 'react';
import { Clock, MapPin, IndianRupee, Plane, Train, Bus, Luggage, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TravelCard = ({ option }) => {
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/booking', item: option, type: option.travelMode } });
      return;
    }
    navigate('/booking', { state: { item: option, type: option.travelMode } });
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'flight':
        return <Plane className="h-6 w-6 text-blue-600" />;
      case 'train':
        return <Train className="h-6 w-6 text-green-600" />;
      case 'bus':
        return <Bus className="h-6 w-6 text-orange-600" />;
      default:
        return <Plane className="h-6 w-6 text-blue-600" />;
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case 'flight':
        return 'bg-blue-100 text-blue-800';
      case 'train':
        return 'bg-green-100 text-green-800';
      case 'bus':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateTime) => {
    try {
      return format(new Date(dateTime), 'HH:mm');
    } catch {
      return dateTime || 'N/A';
    }
  };

  const formatDate = (dateTime) => {
    try {
      return format(new Date(dateTime), 'dd MMM');
    } catch {
      return '';
    }
  };

  const details = option.details || {};
  const currency = (option.currency || (details && details.priceCurrency))?.toString?.() || '';
  const isInternational = (
    String(details.flightNumber || '').startsWith('02-') ||
    String(option.providerId || '').toLowerCase().includes('intl') ||
    currency.toUpperCase() !== 'INR'
  );

  return (
    <div className="card hover:border-blue-300 border-2 border-transparent transition-all">
      {/* Main Flight Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Left Section - Airline & Route */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full">
            {getModeIcon(option.travelMode)}
          </div>

          <div className="flex-1">
            {/* Airline Name & Flight Number */}
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="font-bold text-lg text-gray-900">
                {details.airline || 
                 option.descriptor?.name || 
                 details.operator || 
                 details.trainName || 
                 (option.travelMode === 'bus' ? 'Bus Operator' : option.travelMode === 'train' ? 'Train Name' : 'Airline')}
              </h3>
              <span className="text-sm text-gray-500">
                {details.flightNumber || 
                 details.trainNumber || 
                 details.busNumber || 
                 option.descriptor?.code || 
                 'N/A'}
              </span>
              {isInternational && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  International
                </span>
              )}
              {details.airlineCode && (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getModeColor(option.travelMode)}`}>
                  {details.airlineCode}
                </span>
              )}
            </div>

            {/* Flight Route */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-2xl text-gray-900">{formatTime(details.departureTime || option.timings?.departure)}</p>
                <p className="text-gray-600 font-semibold text-sm">{details.departureAirport || option.origin}</p>
                <p className="text-gray-500 text-xs">{formatDate(details.departureTime || option.timings?.departure)}</p>
                {details.departureTerminal && (
                  <p className="text-gray-400 text-xs">
                    {option.travelMode === 'bus'
                      ? (details.departureLocation || '')
                      : option.travelMode === 'train'
                        ? (details.departureStation || '')
                        : `Terminal ${details.departureTerminal}`}
                  </p>
                )}
              </div>

              <div className="flex-1 flex flex-col items-center px-2">
                <div className="flex items-center w-full">
                  <div className="flex-1 border-t-2 border-gray-300"></div>
                  {option.travelMode === 'train' ? (
                    <Train className="h-4 w-4 text-green-500 mx-2" />
                  ) : option.travelMode === 'bus' ? (
                    <Bus className="h-4 w-4 text-orange-500 mx-2" />
                  ) : (
                    <Plane className="h-4 w-4 text-blue-500 mx-2" />
                  )}
                  <div className="flex-1 border-t-2 border-gray-300"></div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  <p className="font-medium">
                    {(() => {
                      const dur = details.duration || 'N/A';
                      // If duration is "300 mins" or just "300", format it
                      const mins = parseInt(dur);
                      if (!isNaN(mins)) {
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return `${h}h ${m.toString().padStart(2, '0')}m`;
                      }
                      return dur;
                    })()}
                  </p>
                  <p className="text-gray-400">
                    {details.stops === 0 ? 'Non-stop' : `${details.stops} stop${details.stops > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="font-bold text-2xl text-gray-900">{formatTime(details.arrivalTime || option.timings?.arrival)}</p>
                <p className="text-gray-600 font-semibold text-sm">{details.arrivalAirport || option.destination}</p>
                <p className="text-gray-500 text-xs">{formatDate(details.arrivalTime || option.timings?.arrival)}</p>
                {details.arrivalTerminal && (
                  <p className="text-gray-400 text-xs">
                    {option.travelMode === 'bus'
                      ? (details.arrivalLocation || '')
                      : option.travelMode === 'train'
                        ? (details.arrivalStation || '')
                        : `Terminal ${details.arrivalTerminal}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Price */}
        <div className="flex flex-col items-end space-y-3 min-w-[140px]">
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <IndianRupee className="h-6 w-6 text-gray-700" />
              <span className="text-3xl font-bold text-gray-900">
                {option.price?.toLocaleString('en-IN') || '0'}
              </span>
            </div>
            <p className="text-xs text-gray-500">per person</p>
          </div>

          <button
            onClick={handleBookNow}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Book Now
          </button>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          {/* Cabin Class - Hide for non-flight modes if not applicable, or default shows 'Economy' which confuses user */}
          {option.travelMode === 'flight' && (
            <div className="flex items-center space-x-1 text-gray-700">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{details.cabinClass || 'Economy'}</span>
            </div>
          )}

          {/* Baggage */}
          {details.baggage && (
            <div className="flex items-center space-x-1 text-gray-700">
              <Luggage className="h-4 w-4 text-blue-500" />
              <span>{details.baggage}</span>
            </div>
          )}

          {/* Aircraft Type */}
          {details.aircraft && details.aircraft !== 'N/A' && (
            <div className="text-gray-600">
              <span className="text-xs">{option.travelMode === 'bus' ? 'Bus Type: ' : option.travelMode === 'train' ? 'Class: ' : 'Aircraft: '}</span>
              <span className="font-medium">{details.aircraft || details.class}</span>
            </div>
          )}

          {/* Seats Available */}
          {details.numberOfBookableSeats && (
            <div className="text-orange-600">
              <span className="font-medium">{details.numberOfBookableSeats} seats left</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Details Section */}
      {(details.layovers?.length > 0 || details.segments?.length > 0) && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full mt-3 pt-3 border-t border-gray-200 flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            <span>{showDetails ? 'Hide' : 'Show'} {option.travelMode === 'bus' ? 'Bus' : option.travelMode === 'train' ? 'Train' : 'Flight'} Details</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
              {/* Layover Information */}
              {details.layovers && details.layovers.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Layovers</h4>
                  <div className="space-y-2">
                    {details.layovers.map((layover, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                        <p className="font-medium text-gray-900">
                          <MapPin className="h-4 w-4 inline mr-1 text-yellow-600" />
                          {layover.airport} - {details.segments?.[idx]?.arrival?.iataCode && getAirportCity(details.segments[idx].arrival.iataCode)}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          Arrives: {formatTime(layover.arrivalTime)} • Departs: {formatTime(layover.departureTime)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Segment Details */}
              {details.segments && details.segments.length > 1 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Flight Segments</h4>
                  <div className="space-y-3">
                    {details.segments.map((segment, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-600">
                            {segment.flightNumber}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {segment.aircraft !== 'N/A' ? `Aircraft: ${segment.aircraft}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold">{segment.departure.iataCode}</p>
                            <p className="text-gray-600">{formatTime(segment.departure.time)}</p>
                            {segment.departure.terminal && (
                              <p className="text-gray-500">Terminal {segment.departure.terminal}</p>
                            )}
                          </div>
                          <div className="flex-1 px-4 text-center text-gray-500">
                            <div className="border-t border-dashed border-gray-300"></div>
                            <p className="mt-1">{segment.duration}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{segment.arrival.iataCode}</p>
                            <p className="text-gray-600">{formatTime(segment.arrival.time)}</p>
                            {segment.arrival.terminal && (
                              <p className="text-gray-500">Terminal {segment.arrival.terminal}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Reference Data */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1">
                <h4 className="font-semibold text-blue-900 mb-2">Reference Information</h4>
                {details.originCity && (
                  <p className="text-gray-700">
                    <span className="font-medium">Origin:</span> {details.originCity} ({details.departureAirport})
                  </p>
                )}
                {details.destinationCity && (
                  <p className="text-gray-700">
                    <span className="font-medium">Destination:</span> {details.destinationCity} ({details.arrivalAirport})
                  </p>
                )}
                {option.providerId && (
                  <p className="text-gray-700">
                    <span className="font-medium">Data Provider:</span> {option.providerId}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helper function to get city names (duplicated from backend for frontend use)
const getAirportCity = (code) => {
  const airports = {
    'BLR': 'Bangalore',
    'DEL': 'Delhi',
    'BOM': 'Mumbai',
    'MAA': 'Chennai',
    'HYD': 'Hyderabad',
    'CCU': 'Kolkata',
    'GOI': 'Goa',
    'PNQ': 'Pune',
    'AMD': 'Ahmedabad',
    'COK': 'Kochi',
    'JAI': 'Jaipur',
    'LKO': 'Lucknow',
    'IXC': 'Chandigarh',
    'TRV': 'Trivandrum',
    'NAG': 'Nagpur',
    'VNS': 'Varanasi',
    'PAT': 'Patna',
    'BBI': 'Bhubaneswar',
    'GAU': 'Guwahati',
    'IXR': 'Ranchi'
  };
  return airports[code] || code;
};

export default TravelCard;

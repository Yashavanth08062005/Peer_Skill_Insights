import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BAP_URL || 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_EXPIRED') {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('sessionExpiry');

      // Show session expired message
      alert('Your session has expired. Please log in again.');

      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to generate transaction and message IDs
const generateIds = () => ({
  transaction_id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  message_id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
});

// Helper function to map airport codes to GPS coordinates
const getGpsFromAirportCode = (code) => {
  const airportMap = {
    // Indian Airports
    'DEL': '28.5665,77.1031', // Delhi
    'BOM': '19.0896,72.8656', // Mumbai
    'BLR': '12.9716,77.5946', // Bangalore
    'MAA': '12.9941,80.1709', // Chennai
    'CCU': '22.6548,88.4467', // Kolkata
    'HYD': '17.2403,78.4294', // Hyderabad
    'GOI': '15.3808,73.8389', // Goa
    'PNQ': '18.5822,73.9197', // Pune
    'JAI': '26.9124,75.7873', // Jaipur
    'AMD': '23.0726,72.6263', // Ahmedabad

    // International Airports
    'SIN': '1.3644,103.9915', // Singapore Changi
    'DXB': '25.2532,55.3657', // Dubai
    'LHR': '51.4700,-0.4543', // London Heathrow
    'JFK': '40.6413,-73.7781', // New York JFK
    'BKK': '13.6900,100.7501', // Bangkok
    'HKG': '22.3080,113.9185', // Hong Kong
    'NRT': '35.5494,139.7798', // Tokyo Narita
    'SYD': '-33.9399,151.1753', // Sydney
  };
  return airportMap[code?.toUpperCase()] || "12.9716,77.5946"; // Default to Bangalore
};

// Helper function to map city names to GPS coordinates
const getCityGps = (cityCode) => {
  const cityMap = {
    'mumbai': '19.0760,72.8777',
    'delhi': '28.7041,77.1025',
    'bangalore': '12.9716,77.5946',
    'chennai': '13.0827,80.2707',
    'kolkata': '22.5726,88.3639',
    'hyderabad': '17.3850,78.4867',
    'goa': '15.2993,74.1240',
    'pune': '18.5204,73.8567',
    'jaipur': '26.9124,75.7873',
    'ahmedabad': '23.0225,72.5714',
    // Airport Codes for Bus Search
    'bom': '19.0760,72.8777',
    'del': '28.7041,77.1025',
    'blr': '12.9716,77.5946',
    'maa': '13.0827,80.2707',
    'ccu': '22.5726,88.3639',
    'hyd': '17.3850,78.4867',
    'goi': '15.2993,74.1240',
    'pnq': '18.5204,73.8567',
    'jai': '26.9124,75.7873',
    'amd': '23.0225,72.5714'
  };
  return cityMap[cityCode?.toLowerCase()] || "19.0760,72.8777"; // Default to Mumbai
};

// Create Beckn context
const createBecknContext = (action) => {
  const ids = generateIds();
  return {
    domain: "mobility",
    country: "IND",
    city: "std:080",
    action: action,
    core_version: "1.1.0",
    bap_id: "travel-discovery-bap.example.com",
    bap_uri: API_BASE_URL,
    transaction_id: ids.transaction_id,
    message_id: ids.message_id,
    timestamp: new Date().toISOString(),
    ttl: "PT30S"
  };
};

// Main search function for travel options
export const searchTravelOptions = async (searchData) => {
  try {
    console.log('🔍 Searching with data:', searchData);
    console.log('🔍 Transport Mode:', searchData.transportMode);

    // Validate search data
    if (!searchData.transportMode) {
      throw new Error('Transport mode is required for search');
    }

    if (searchData.transportMode === 'all') {
      console.log('🌐 Executing aggregated search for ALL categories');

      // 1. Mobility Search (Flights, Trains, Buses) - effectively assumes 'flight' triggers generic mobility search or default
      const mobilityPromise = api.post('/beckn/search', {
        context: createBecknContext('search'),
        message: { intent: createSearchIntent({ ...searchData, transportMode: 'flight' }) }
      }).catch(err => {
        console.warn('⚠️ Mobility search failed:', err);
        return { data: { message: { catalog: { providers: [] } } } };
      });

      // 2. Hospitality Search (Hotels) - Use destination as cityCode
      const hotelSearchData = { ...searchData, transportMode: 'hotel', cityCode: searchData.destination };
      const hospitalityPromise = api.post('/beckn/search', {
        context: createBecknContext('search'),
        message: { intent: createSearchIntent(hotelSearchData) }
      }).catch(err => {
        console.warn('⚠️ Hospitality search failed:', err);
        return { data: { message: { catalog: { providers: [] } } } };
      });

      // 3. Experience Search - Use destination as cityCode
      const experienceSearchData = { ...searchData, transportMode: 'experience', cityCode: searchData.destination };
      const experiencePromise = api.post('/beckn/search', {
        context: createBecknContext('search'),
        message: { intent: createSearchIntent(experienceSearchData) }
      }).catch(err => {
        console.warn('⚠️ Experience search failed:', err);
        return { data: { message: { catalog: { providers: [] } } } };
      });

      // Wait for all
      const [mobilityRes, hospitalityRes, experienceRes] = await Promise.all([
        mobilityPromise,
        hospitalityPromise,
        experiencePromise
      ]);

      console.log('📥 Aggregated responses received');

      const items = [];

      // Process Mobility
      const mobilityProviders = mobilityRes.data?.message?.catalog?.providers || [];
      mobilityProviders.forEach(provider => {
        if (provider.items) {
          provider.items.forEach(item => {
            // Heuristic to determine mode if category_id is generic or missing
            let effectiveMode = 'flight'; // Default
            if (item.category_id === 'BUS') effectiveMode = 'bus';
            else if (item.category_id === 'TRAIN') effectiveMode = 'train';
            else if (item.category_id === 'FLIGHT') effectiveMode = 'flight';

            items.push(transformBecknItem(item, provider, effectiveMode));
          });
        }
      });

      // Process Hospitality
      const hospitalityProviders = hospitalityRes.data?.message?.catalog?.providers || [];
      hospitalityProviders.forEach(provider => {
        if (provider.items) {
          provider.items.forEach(item => {
            items.push(transformBecknItem(item, provider, 'hotel'));
          });
        }
      });

      // Process Experience
      const experienceProviders = experienceRes.data?.message?.catalog?.providers || [];
      experienceProviders.forEach(provider => {
        if (provider.items) {
          provider.items.forEach(item => {
            items.push(transformBecknItem(item, provider, 'experience'));
          });
        }
      });

      console.log(`✅ Aggregated ${items.length} items from all categories`);
      return items;
    }

    // Standard single-category search
    // Create Beckn search request
    const becknRequest = {
      context: createBecknContext('search'),
      message: {
        intent: createSearchIntent(searchData)
      }
    };

    console.log('📤 Sending Beckn request:', becknRequest);
    console.log('📤 Intent Category:', becknRequest.message.intent.category);

    // Call BAP's Beckn search endpoint
    const response = await api.post('/beckn/search', becknRequest);

    console.log('📥 Received Beckn response:', response.data);

    // Check if response has the expected structure
    if (!response.data) {
      throw new Error('Empty response from server');
    }

    // Extract items from Beckn catalog response
    const catalog = response.data?.message?.catalog;
    if (!catalog || !catalog.providers) {
      console.warn('⚠️ No providers found in catalog', response.data);
      return [];
    }

    console.log('📦 Providers found:', catalog.providers.length);
    console.log('📦 First provider items:', catalog.providers[0]?.items);

    // Transform Beckn items to frontend format
    const items = [];
    catalog.providers.forEach(provider => {
      if (provider.items) {
        provider.items.forEach(item => {
          // Filter items based on transport mode to avoid mixing Flights and Buses
          // Flights BPP returns category_id: "FLIGHT"
          // Buses BPP returns category_id: "BUS"

          let shouldInclude = true;

          if (searchData.transportMode === 'bus') {
            // Include only if category is explicitly BUS
            shouldInclude = item.category_id === 'BUS';
          } else if (searchData.transportMode === 'flight') {
            // Include only if category is FLIGHT (or default/undefined which we assume is flight for legacy)
            shouldInclude = item.category_id === 'FLIGHT' || !item.category_id;
          } else if (searchData.transportMode === 'train') {
            // Include only if category is explicitly TRAIN
            shouldInclude = item.category_id === 'TRAIN';
          } else if (searchData.transportMode === 'experience') {
            shouldInclude = item.category_id === 'EXPERIENCE';
          }

          if (shouldInclude) {
            console.log('✅ Including item:', item.id, item.category_id);
            items.push(transformBecknItem(item, provider, searchData.transportMode));
          } else {
            console.log('❌ Excluding item:', item.id, item.category_id, 'Mode:', searchData.transportMode);
          }
        });
      }
    });

    console.log('✅ Transformed items:', items);
    return items;

  } catch (error) {
    console.error('❌ API Error (searchTravelOptions):', error);

    // Handle specific error types
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to travel service. Please ensure BAP is running on port 8081.');
    }

    // axios throws a generic "Network Error" (no response) for CORS failures,
    // DNS failures, or when the backend is not reachable. Surface a clearer
    // troubleshooting message for those cases.
    if (error.message === 'Network Error' || !error.response) {
      throw new Error('Unable to connect to travel service. Check that BAP is running on http://localhost:8081 and that CORS/networking allows requests from the frontend (http://localhost:3000)');
    }

    if (error.response?.status === 500) {
      const errorMessage = error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Internal server error';
      throw new Error(`Server error: ${errorMessage}`);
    }

    if (error.response?.status === 400) {
      throw new Error(`Invalid request: ${error.response?.data?.error?.message || 'Bad request'}`);
    }

    if (error.message?.includes('timeout')) {
      throw new Error('Request timeout. The service is taking too long to respond.');
    }

    throw new Error(error.response?.data?.error?.message || error.message || 'Failed to search travel options');
  }
};

// Create intent based on search data
const createSearchIntent = (searchData) => {
  const intent = {
    category: {
      id: (searchData.transportMode === 'flight' || searchData.transportMode === 'bus' || searchData.transportMode === 'train') ? 'MOBILITY' :
        (searchData.transportMode === 'experience' ? 'EXPERIENCE' : 'HOSPITALITY')
    }
  };

  if (searchData.transportMode === 'flight' || searchData.transportMode === 'bus' || searchData.transportMode === 'train') {
    const travelDate = searchData.travelDate || new Date().toISOString().split('T')[0];
    intent.fulfillment = {
      start: {
        location: {
          gps: getGpsFromAirportCode(searchData.origin)
        }
      },
      end: {
        location: {
          gps: getGpsFromAirportCode(searchData.destination)
        }
      },
      time: {
        range: {
          start: new Date(travelDate + 'T00:00:00').toISOString(),
          end: new Date(travelDate + 'T23:59:59').toISOString()
        }
      }
    };
  } else if (searchData.transportMode === 'hotel') {
    // Fallback dates if not provided
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const checkInDate = searchData.checkInDate || today.toISOString().split('T')[0];
    const checkOutDate = searchData.checkOutDate || dayAfter.toISOString().split('T')[0];

    intent.fulfillment = {
      start: {
        location: {
          gps: getCityGps(searchData.cityCode)
        }
      },
      time: {
        range: {
          start: new Date(checkInDate + 'T14:00:00').toISOString(), // Check-in time
          end: new Date(checkOutDate + 'T11:00:00').toISOString()  // Check-out time
        }
      }
    };
  } else if (searchData.transportMode === 'bus') {
    const travelDate = searchData.travelDate || new Date().toISOString().split('T')[0];
    intent.fulfillment = {
      start: {
        location: {
          gps: getCityGps(searchData.origin)
        }
      },
      end: {
        location: {
          gps: getCityGps(searchData.destination)
        }
      },
      time: {
        range: {
          start: new Date(travelDate + 'T00:00:00').toISOString(),
          end: new Date(travelDate + 'T23:59:59').toISOString()
        }
      }
    };
  } else if (searchData.transportMode === 'experience') {
    const travelDate = searchData.travelDate || new Date().toISOString().split('T')[0];
    intent.fulfillment = {
      start: {
        location: {
          city: {
            name: searchData.cityCode || searchData.destination || "Bangalore"
          }
        }
      },
      end: {
        location: {
          gps: getCityGps(searchData.cityCode || searchData.destination)
        }
      },
      time: {
        range: {
          start: new Date(travelDate + 'T09:00:00').toISOString(),
          end: new Date(travelDate + 'T18:00:00').toISOString()
        }
      }
    };
  }

  return intent;
};

// Transform Beckn item to frontend format
const transformBecknItem = (item, provider, transportMode) => {
  const baseItem = {
    id: item.id,
    provider: provider.descriptor?.name || 'Provider',
    providerId: provider.id,
    price: parseFloat(item.price?.value || 0),
    currency: item.price?.currency || 'INR',
    travelMode: transportMode,
  };

  if (transportMode === 'flight') {
    // Determine whether this item is international. Heuristics:
    // - provider id contains 'intl'
    // - item id contains 'intl'
    // - price currency is not INR (fallback)
    const providerId = (provider.id || '').toLowerCase();
    const itemId = (item.id || '').toLowerCase();
    const currency = (item.price?.currency || 'INR').toUpperCase();
    const isInternational = providerId.includes('intl') || itemId.includes('intl') || currency !== 'INR';

    const prefix = isInternational ? '02-' : '01-';
    const rawFlightCode = item.descriptor?.code || item.id || '';
    const flightNumberPrefixed = `${prefix}${rawFlightCode}`;

    // Extract origin and destination from fulfillment or tags
    // BPP sends route info as "FROM" and "TO" in ROUTE tags
    const fromValue = getTagValue(item.tags, 'ROUTE', 'FROM') || '';
    const toValue = getTagValue(item.tags, 'ROUTE', 'TO') || '';

    // Extract airport codes from format "City (CODE)"
    const departureAirport = fromValue.match(/\(([^)]+)\)/)?.[1] ||
      item.fulfillment?.start?.location?.descriptor?.code ||
      undefined;
    const arrivalAirport = toValue.match(/\(([^)]+)\)/)?.[1] ||
      item.fulfillment?.end?.location?.descriptor?.code ||
      undefined;

    // Extract city names from format "City (CODE)"
    const originCity = fromValue.split('(')[0]?.trim() ||
      item.descriptor?.short_desc ||
      undefined;
    const destinationCity = toValue.split('(')[0]?.trim() ||
      item.descriptor?.long_desc ||
      undefined;

    return {
      ...baseItem,
      origin: departureAirport,
      destination: arrivalAirport,
      details: {
        airline: item.descriptor?.name || provider.descriptor?.name || 'Airline',
        flightNumber: flightNumberPrefixed,
        airlineCode: provider.descriptor?.code || provider.id,
        aircraft: getTagValue(item.tags, 'AIRCRAFT_TYPE', 'MODEL') || 'N/A',
        duration: getTagValue(item.tags, 'DURATION', 'VALUE') || '2h 30m', // Prefer tag value when present
        departureTime: item.time?.timestamp || new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(), // Add 2.5 hours default
        departureAirport: departureAirport,
        arrivalAirport: arrivalAirport,
        originCity: originCity,
        destinationCity: destinationCity,
        amenities: extractAmenities(item.tags),
        baggage: getTagValue(item.tags, 'AMENITIES', 'BAGGAGE') || '20kg',
        description: item.descriptor?.long_desc || item.descriptor?.short_desc,
        numberOfBookableSeats: getTagValue(item.tags, 'SEATS', 'AVAILABLE') || undefined,
      },
      timings: {
        departure: item.time?.timestamp || new Date().toISOString(),
        arrival: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString()
      }
    };
  } else if (transportMode === 'hotel') {
    const roomType = getTagValue(item.tags, 'ROOM_TYPE', 'TYPE') || 'Standard Room';
    const bedType = getTagValue(item.tags, 'ROOM_TYPE', 'BED') || 'Double Bed';
    const roomSize = getTagValue(item.tags, 'ROOM_TYPE', 'SIZE') || '30 sqm';
    const amenitiesList = extractAmenitiesList(item.tags);
    const policies = extractPoliciesObject(item.tags);

    return {
      ...baseItem,
      details: {
        name: item.descriptor?.name || provider.descriptor?.name || 'Hotel',
        hotelId: item.id,
        roomType: roomType,
        bedType: bedType,
        beds: 1,
        adults: 2,
        rooms: 1,
        nights: 1,
        cityCode: 'Mumbai',
        cityName: 'Mumbai',
        street: provider.descriptor?.short_desc || 'Luxury Hotel',
        address: {
          street: provider.descriptor?.short_desc || 'Hotel Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postalCode: '400001'
        },
        rating: 4.5,
        amenities: amenitiesList,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        cancellationPolicy: policies.cancellation || 'Free till 48 hours before check-in',
        paymentPolicy: policies.payment || 'Pay at hotel',
        phone: '+91-XXXXXXXX00',
        email: 'info@hotel.com',
        roomDescription: item.descriptor?.long_desc || item.descriptor?.short_desc || 'Comfortable and spacious room with modern amenities',
        images: item.descriptor?.images || [],
        description: item.descriptor?.long_desc || item.descriptor?.short_desc,
        chainCode: provider.descriptor?.code || 'CHAIN'
      },
      pricePerNight: parseFloat(item.price?.value || 0),
      // For hotels, calculate based on check-in/check-out from search params
      checkIn: item.time?.timestamp || new Date().toISOString(),
      checkOut: item.time?.timestamp || new Date(Date.now() + 86400000).toISOString()
    };
  } else if (transportMode === 'bus') {
    // Bus transformation share similar logic with flights for route info
    const fromValue = getTagValue(item.tags, 'ROUTE', 'FROM') || '';
    const toValue = getTagValue(item.tags, 'ROUTE', 'TO') || '';

    // Extract location names
    const departureLocation = fromValue.split('(')[0]?.trim() ||
      item.fulfillment?.start?.location?.descriptor?.name ||
      undefined;
    const arrivalLocation = toValue.split('(')[0]?.trim() ||
      item.fulfillment?.end?.location?.descriptor?.name ||
      undefined;

    // Bus specific details
    const busType = getTagValue(item.tags, 'BUS_TYPE', 'TYPE') || 'Standard Bus';

    return {
      ...baseItem,
      origin: departureLocation,
      destination: arrivalLocation,
      details: {
        operator: item.descriptor?.name || provider.descriptor?.name || 'Bus Operator',
        busNumber: item.descriptor?.code || item.id,
        busType: busType,
        duration: getTagValue(item.tags, 'ROUTE', 'DURATION') || 'N/A',
        departureTime: item.time?.timestamp || new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // Add 8 hours default for bus
        departureLocation: departureLocation,
        arrivalLocation: arrivalLocation,
        originCity: departureLocation || 'Origin',
        destinationCity: arrivalLocation || 'Destination',
        amenities: extractAmenities(item.tags),
        description: item.descriptor?.long_desc || item.descriptor?.short_desc,
        numberOfBookableSeats: getTagValue(item.tags, 'SEATS', 'AVAILABLE') || undefined,
        // Map to fields TravelCard expects
        airline: item.descriptor?.name || provider.descriptor?.name || 'Bus Operator', // Fallback for TravelCard
        flightNumber: item.descriptor?.code, // Fallback for TravelCard
        aircraft: busType // Fallback for TravelCard
      },
      timings: {
        departure: item.time?.timestamp || new Date().toISOString(),
        arrival: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      }
    };
  } else if (transportMode === 'train') {
    // Train specific mapping
    const trainClass = getTagValue(item.tags, 'TRAIN_DETAILS', 'CLASS') || 'Standard';
    const trainType = getTagValue(item.tags, 'TRAIN_DETAILS', 'TYPE') || 'Express';
    const trainNumber = getTagValue(item.tags, 'TRAIN_DETAILS', 'NUMBER') || item.descriptor.code;

    return {
      ...baseItem,
      details: {
        trainName: item.descriptor?.name,
        trainNumber: trainNumber,
        trainType: trainType,
        class: trainClass,
        stops: 0, // Default to 0 stops for trains
        // Map fields TravelCard expects for generic display
        airline: item.descriptor?.name,
        flightNumber: trainNumber,
        aircraft: trainClass,
        departureStation: getTagValue(item.tags, 'ROUTE', 'FROM'),
        arrivalStation: getTagValue(item.tags, 'ROUTE', 'TO'),
        duration: getTagValue(item.tags, 'ROUTE', 'DURATION')
      },
      timings: {
        departure: item.time?.timestamp || new Date().toISOString(),
        // Calculate arrival based on duration if not explicit in timestamp (for mock)
        arrival: new Date(new Date(item.time?.timestamp || Date.now()).getTime() +
          // Parse duration "300 mins" from tag or default 4 hours
          (parseInt(getTagValue(item.tags, 'ROUTE', 'DURATION')) || 240) * 60000).toISOString()
      }
    };
  } else if (transportMode === 'experience') {
    return {
      ...baseItem,
      details: {
        name: item.descriptor?.name,
        shortDesc: item.descriptor?.short_desc,
        longDesc: item.descriptor?.long_desc,
        images: item.descriptor?.images?.map(img => img.url) || [],
        duration: item.time?.duration,
        rating: getTagValue(item.tags, 'DETAILS', 'RATING'),
        type: getTagValue(item.tags, 'DETAILS', 'TYPE'),
        location: getTagValue(item.tags, 'LOCATION', 'AREA'),
        city: getTagValue(item.tags, 'LOCATION', 'CITY')
      }
    };
  }

  return baseItem;
};

// Helper function to extract tag values
const getTagValue = (tags, tagCode, listCode) => {
  if (!tags) return null;
  const tag = tags.find(t => t.code === tagCode);
  if (!tag || !tag.list) return null;
  const listItem = tag.list.find(l => l.code === listCode);
  return listItem?.value;
};

// Extract amenities list from tags
const extractAmenitiesList = (tags) => {
  if (!tags) return [];
  const amenitiesTag = tags.find(t => t.code === 'AMENITIES');
  if (!amenitiesTag || !amenitiesTag.list) return [];

  return amenitiesTag.list
    .filter(item => item.code !== 'BAGGAGE') // Exclude baggage from amenities
    .map(item => {
      // Format amenity name: convert code to readable format
      const name = item.code.toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return name + (item.value ? ` (${item.value})` : '');
    });
};

// Extract policies object from tags  
const extractPoliciesObject = (tags) => {
  if (!tags) return {};
  const policiesTag = tags.find(t => t.code === 'POLICIES');
  const policies = {};

  policiesTag?.list?.forEach(item => {
    const key = item.code.toLowerCase();
    policies[key] = item.value;
  });

  return policies;
};

// Extract amenities from tags
const extractAmenities = (tags) => {
  if (!tags) return [];
  const amenitiesTag = tags.find(t => t.code === 'AMENITIES');
  return amenitiesTag?.list?.map(item => ({
    name: item.code.toLowerCase().replace('_', ' '),
    value: item.value
  })) || [];
};

// Extract policies from tags  
const extractPolicies = (tags) => {
  if (!tags) return {};
  const policiesTag = tags.find(t => t.code === 'POLICIES');
  const policies = {};
  policiesTag?.list?.forEach(item => {
    policies[item.code.toLowerCase()] = item.value;
  });
  return policies;
};

// Legacy functions for backward compatibility
export const searchFlights = async (searchData) => {
  return searchTravelOptions({ ...searchData, transportMode: 'flight' });
};

export const searchHotels = async (searchData) => {
  return searchTravelOptions({ ...searchData, transportMode: 'hotel' });
};

export default api;

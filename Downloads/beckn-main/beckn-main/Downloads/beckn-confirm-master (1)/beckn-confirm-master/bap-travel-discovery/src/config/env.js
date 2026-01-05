require('dotenv').config();

const envConfig = {
    PORT: process.env.PORT || 8081,

    // Beckn ONIX Configuration
    // For mock testing: http://127.0.0.1:9090
    // For production: http://127.0.0.1:8081 or real ONIX URL
    ONIX_URL: process.env.ONIX_URL || 'http://127.0.0.1:9090',
    ONIX_API_KEY: process.env.ONIX_API_KEY || '',

    // BAP Configuration
    BAP_ID: process.env.BAP_ID || 'travel-discovery-bap.example.com',
    BAP_URI: process.env.BAP_URI || 'http://127.0.0.1:8081',
    BAP_PUBLIC_KEY: process.env.BAP_PUBLIC_KEY || '',
    BAP_PRIVATE_KEY: process.env.BAP_PRIVATE_KEY || '',

    // BPP Configurations (flights and hotels)
    FLIGHTS_BPP_URL: process.env.FLIGHTS_BPP_URL || 'http://127.0.0.1:7001',
    FLIGHTS_INTL_BPP_URL: process.env.FLIGHTS_INTL_BPP_URL || 'http://127.0.0.1:7005',
    HOTELS_BPP_URL: process.env.HOTELS_BPP_URL || 'http://127.0.0.1:7003',
    BUSES_BPP_URL: process.env.BUSES_BPP_URL || 'http://127.0.0.1:3004',
    TRAINS_BPP_URL: process.env.TRAINS_BPP_URL || 'http://127.0.0.1:3005',
    EXPERIENCES_BPP_URL: process.env.EXPERIENCES_BPP_URL || 'http://127.0.0.1:3006',

    // Legacy Amadeus Configuration (for backward compatibility)
    AMADEUS_CLIENT_ID: process.env.AMADEUS_CLIENT_ID,
    AMADEUS_CLIENT_SECRET: process.env.AMADEUS_CLIENT_SECRET,

    // Other Providers
    REDBUS_API_KEY: process.env.REDBUS_API_KEY,
};

module.exports = envConfig;
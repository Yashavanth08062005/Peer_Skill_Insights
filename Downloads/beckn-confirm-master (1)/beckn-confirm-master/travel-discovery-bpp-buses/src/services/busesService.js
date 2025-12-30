const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/**
 * Buses Service - Provides bus catalog and booking services
 */
class BusesService {

    /**
     * Convert GPS coordinates to City
     */
    gpsToCity(gps) {
        if (!gps) return null;

        const cityMap = {
            '28.5665,77.1031': 'DEL',
            '28.7041,77.1025': 'DEL',
            '19.0896,72.8656': 'BOM',
            '19.0760,72.8777': 'BOM',
            '12.9716,77.5946': 'BLR',
            '17.2403,78.4294': 'HYD',
            '15.3808,73.8389': 'GOI',
            '15.2993,74.1240': 'GOI',
            '18.5822,73.9197': 'PNQ'
        };

        return cityMap[gps] || null;
    }

    /**
     * Search for available buses from database
     */
    async searchBuses(startLocation, endLocation, travelTime) {
        try {
            console.log(`🔍 Searching buses from ${startLocation} to ${endLocation} on ${travelTime}`);

            // Convert GPS to cities
            const departureCity = this.gpsToCity(startLocation);
            const arrivalCity = this.gpsToCity(endLocation);

            console.log(`📍 Converted GPS to cities: ${departureCity} → ${arrivalCity}`);

            // Build query
            let query = `
                SELECT * FROM buses 
                WHERE status = 'ACTIVE'
            `;

            const queryParams = [];

            if (departureCity) {
                queryParams.push(departureCity);
                query += ` AND departure_city = $${queryParams.length}`;
            }

            if (arrivalCity) {
                queryParams.push(arrivalCity);
                query += ` AND arrival_city = $${queryParams.length}`;
            }

            query += ` ORDER BY price`;

            console.log(`📝 Query: ${query}`, queryParams);

            const result = await db.query(query, queryParams);

            if (result.rows.length === 0) {
                console.log('⚠️  No buses found in database');
                return this.getEmptyCatalog();
            }

            console.log(`✅ Found ${result.rows.length} buses in database`);

            // Transform database records to Beckn format
            const buses = result.rows.map(bus => {
                const departureTime = new Date(); // In real app, parse bus.departure_time
                // For demo, we just use current time or passed time if we had real scheduling logic

                return {
                    id: `bus-${bus.id}`,
                    descriptor: {
                        name: bus.operator_name,
                        code: bus.bus_id,
                        short_desc: bus.bus_type,
                        long_desc: `${bus.operator_name} - ${bus.bus_type} from ${bus.departure_city} to ${bus.arrival_city}`
                    },
                    price: {
                        currency: bus.currency || "INR",
                        value: parseFloat(bus.price).toFixed(2)
                    },
                    category_id: "BUS",
                    fulfillment_id: `fulfillment-${bus.id}`,
                    location_id: `loc-${bus.departure_city.toLowerCase()}`,
                    time: {
                        label: "departure",
                        timestamp: bus.departure_time ? new Date(bus.departure_time).toISOString() : new Date().toISOString()
                    },
                    matched: true,
                    tags: [
                        {
                            code: "BUS_TYPE",
                            list: [
                                { code: "TYPE", value: bus.bus_type || "N/A" }
                            ]
                        },
                        {
                            code: "AMENITIES",
                            list: (() => {
                                const amenities = bus.amenities || {};
                                return Object.entries(amenities).map(([k, v]) => ({
                                    code: k.toUpperCase(),
                                    value: v ? "Available" : "Not Available"
                                }));
                            })()
                        },
                        {
                            code: "ROUTE",
                            list: [
                                { code: "FROM", value: `${bus.departure_city} (${bus.departure_location})` },
                                { code: "TO", value: `${bus.arrival_city} (${bus.arrival_location})` },
                                { code: "DURATION", value: `${bus.duration_minutes} mins` }
                            ]
                        }
                    ]
                };
            });

            // Create Beckn catalog structure
            const catalog = {
                bpp: {
                    descriptor: {
                        name: "Buses BPP Provider",
                        short_desc: "Bus booking provider",
                        long_desc: "Inter-city bus booking services"
                    },
                    providers: [
                        {
                            id: "buses-provider-001",
                            descriptor: {
                                name: "Bus Aggregator",
                                short_desc: "Multiple bus operators",
                                long_desc: "Access to KSRTC, VRL, SRS and other bus operators"
                            },
                            categories: [
                                {
                                    id: "BUS",
                                    descriptor: {
                                        name: "Bus Services"
                                    }
                                }
                            ],
                            items: buses
                        }
                    ]
                },
                providers: [
                    {
                        id: "buses-provider-001",
                        descriptor: {
                            name: "Bus Aggregator"
                        },
                        items: buses
                    }
                ]
            };

            return catalog;

        } catch (error) {
            console.error('❌ Error in buses service:', error);
            throw error;
        }
    }

    getEmptyCatalog() {
        return {
            bpp: {
                descriptor: {
                    name: "Buses BPP Provider",
                    short_desc: "Bus booking provider"
                },
                providers: []
            },
            providers: []
        };
    }

    async createBppBooking(bookingData) {
        try {
            console.log('💾 Creating BPP booking:', {
                bppBookingId: bookingData.bppBookingId,
                platformBookingId: bookingData.platformBookingId
            });

            const query = `
                INSERT INTO bpp_bookings (
                    bpp_booking_id, platform_booking_id, bus_id, passenger_name,
                    passenger_email, passenger_phone, booking_status, beckn_transaction_id,
                    beckn_message_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const values = [
                bookingData.bppBookingId,
                bookingData.platformBookingId,
                bookingData.busId,
                bookingData.passengerName,
                bookingData.passengerEmail,
                bookingData.passengerPhone,
                bookingData.bookingStatus,
                bookingData.becknTransactionId,
                bookingData.becknMessageId
            ];

            const result = await db.query(query, values);

            console.log('✅ BPP booking created successfully:', {
                id: result.rows[0].id,
                bppBookingId: result.rows[0].bpp_booking_id
            });

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error creating BPP booking:', error);
            throw new Error(`Failed to create BPP booking: ${error.message}`);
        }
    }

    async getBppBooking(bppBookingId) {
        try {
            const query = `
                SELECT bb.*, b.bus_id, b.operator_name, b.departure_city, b.arrival_city
                FROM bpp_bookings bb
                LEFT JOIN buses b ON bb.bus_id = b.id
                WHERE bb.bpp_booking_id = $1
            `;

            const result = await db.query(query, [bppBookingId]);

            if (result.rows.length === 0) {
                throw new Error(`BPP booking not found: ${bppBookingId}`);
            }

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error getting BPP booking:', error);
            throw error;
        }
    }
}

module.exports = new BusesService();

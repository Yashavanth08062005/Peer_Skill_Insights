const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class TrainsService {

    gpsToCity(gps) {
        if (!gps) return null;
        const cityMap = {
            '28.5665,77.1031': 'DEL', '28.7041,77.1025': 'DEL',
            '19.0896,72.8656': 'BOM', '19.0760,72.8777': 'BOM',
            '12.9716,77.5946': 'BLR',
            '17.2403,78.4294': 'HYD',
            '15.3808,73.8389': 'GOI', '15.2993,74.1240': 'GOI',
            '18.5822,73.9197': 'PNQ',
            '13.0827,80.2707': 'MAA',
            '12.9941,80.1709': 'MAA' // Add MAA airport GPS mapping
        };
        return cityMap[gps] || null;
    }

    async searchTrains(startLocation, endLocation, travelTime) {
        try {
            console.log(`🔍 Searching trains from ${startLocation} to ${endLocation}`);
            const departureCity = this.gpsToCity(startLocation);
            const arrivalCity = this.gpsToCity(endLocation);

            console.log(`🏙️ Mapped Cities: Departure=${departureCity}, Arrival=${arrivalCity}`);

            if (!departureCity || !arrivalCity) {
                console.log('⚠️ Could not map GPS to cities');
                return this.getEmptyCatalog();
            }

            const query = `
                SELECT * FROM trains 
                WHERE departure_city = $1 AND arrival_city = $2 AND status = 'ACTIVE'
            `;
            const result = await db.query(query, [departureCity, arrivalCity]);
            console.log(`✅ DB Query Result: Found ${result.rows.length} trains`);

            if (result.rows.length === 0) return this.getEmptyCatalog();

            const items = [];

            result.rows.forEach(train => {
                // Create an item for each available class
                const classes = [
                    { code: 'cc', name: 'AC Chair Car', price: train.price_cc },
                    { code: 'ec', name: 'Exec. Chair Car', price: train.price_ec },
                    { code: 'sl', name: 'Sleeper', price: train.price_sl },
                    { code: '3a', name: 'AC 3 Tier', price: train.price_3a },
                    { code: '2a', name: 'AC 2 Tier', price: train.price_2a },
                    { code: '1a', name: 'AC First Class', price: train.price_1a }
                ];

                classes.forEach(cls => {
                    if (cls.price) {
                        items.push({
                            id: `train-${train.id}-${cls.code}`,
                            descriptor: {
                                name: train.train_name,
                                code: train.train_number,
                                short_desc: `${train.train_type} - ${cls.name}`,
                                long_desc: `${train.train_name} (${train.train_number})`
                            },
                            price: {
                                currency: "INR",
                                value: parseFloat(cls.price).toFixed(2)
                            },
                            category_id: "TRAIN", // Distinct category
                            fulfillment_id: `fulfillment-${train.id}`,
                            time: {
                                label: "departure",
                                timestamp: train.departure_time
                                    ? new Date(train.departure_time).toISOString()
                                    : new Date().toISOString()
                            },
                            matched: true,
                            tags: [
                                {
                                    code: "TRAIN_DETAILS",
                                    list: [
                                        { code: "CLASS", value: cls.name },
                                        { code: "TYPE", value: train.train_type },
                                        { code: "NUMBER", value: train.train_number }
                                    ]
                                },
                                {
                                    code: "ROUTE",
                                    list: [
                                        { code: "FROM", value: train.departure_station },
                                        { code: "TO", value: train.arrival_station },
                                        { code: "DURATION", value: `${train.duration_minutes} mins` }
                                    ]
                                }
                            ]
                        });
                    }
                });
            });

            return {
                bpp: {
                    descriptor: { name: "Trains BPP" },
                    providers: [{
                        id: "trains-provider-001",
                        descriptor: { name: "Indian Railways" },
                        categories: [{ id: "TRAIN", descriptor: { name: "Train Services" } }],
                        items: items
                    }]
                }
            };

        } catch (error) {
            console.error('❌ Error in trains service:', error);
            throw error;
        }
    }

    getEmptyCatalog() {
        return { bpp: { descriptor: { name: "Trains BPP" }, providers: [] } };
    }

    async createBppBooking(bookingData) {
        try {
            console.log('💾 Creating Train booking:', bookingData);

            // Extract class/train info from item ID (format: train-ID-CLASS)
            // e.g., train-1-cc
            // But here we might receive just the ID. 
            // In a real app, we'd parse it. For now, let's assume we store it directly or lookup.

            // Allow flexibility in bus_id/train_id column or add new column. 
            // The schema has train_id.

            // We need to parse trainId and class code from bookingData.items[0].id if passed
            // For now, simple insert.

            const query = `
                INSERT INTO bpp_bookings (
                    bpp_booking_id, platform_booking_id, train_id, passenger_name,
                    passenger_email, passenger_phone, booking_status, beckn_transaction_id,
                    beckn_message_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            // Hack: passing a valid integer for train_id. 
            // The itemId is string "train-1-cc". We need to extract "1".
            let trainId = 1;
            if (bookingData.itemId) {
                const parts = bookingData.itemId.split('-');
                if (parts.length >= 2) trainId = parseInt(parts[1]);
            }

            const values = [
                bookingData.bppBookingId,
                bookingData.platformBookingId,
                trainId,
                bookingData.passengerName,
                bookingData.passengerEmail,
                bookingData.passengerPhone,
                bookingData.bookingStatus,
                bookingData.becknTransactionId,
                bookingData.becknMessageId
            ];

            const result = await db.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('❌ Error creating booking:', error);
            throw error;
        }
    }

    async getBppBooking(bppBookingId) {
        const result = await db.query('SELECT * FROM bpp_bookings WHERE bpp_booking_id = $1', [bppBookingId]);
        if (result.rows.length === 0) throw new Error('Booking not found');
        return result.rows[0];
    }
}

module.exports = new TrainsService();

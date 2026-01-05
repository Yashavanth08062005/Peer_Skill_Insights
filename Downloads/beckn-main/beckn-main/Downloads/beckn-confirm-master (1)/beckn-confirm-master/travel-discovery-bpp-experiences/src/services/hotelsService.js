const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/**
 * Hotels Service - Provides hotel catalog and booking services
 */
class HotelsService {

    /**
     * Search for available hotels from database
     */
    async searchHotels(location, checkInTime, checkOutTime) {
        try {
            console.log(`🔍 Searching hotels near ${location} from ${checkInTime} to ${checkOutTime}`);

            // Fetch hotels from database
            const query = `
                SELECT * FROM hotels 
                WHERE status = 'ACTIVE' 
                AND available_rooms > 0
                ORDER BY city, price_per_night
            `;
            
            const result = await db.query(query);
            
            if (result.rows.length === 0) {
                console.log('⚠️  No hotels found in database');
                return this.getEmptyCatalog();
            }

            console.log(`✅ Found ${result.rows.length} hotels in database`);

            // Transform database records to Beckn format
            const hotels = result.rows.map(hotel => {
                // Parse amenities JSON
                const amenitiesList = [];
                if (hotel.amenities) {
                    const amenitiesObj = typeof hotel.amenities === 'string' 
                        ? JSON.parse(hotel.amenities) 
                        : hotel.amenities;
                    
                    Object.entries(amenitiesObj).forEach(([key, value]) => {
                        amenitiesList.push({
                            code: key.toUpperCase(),
                            value: value === true ? 'Available' : (value === false ? 'Not Available' : value.toString())
                        });
                    });
                }

                return {
                    id: `hotel-${hotel.id}`,
                    descriptor: {
                        name: hotel.hotel_name,
                        code: hotel.hotel_code,
                        short_desc: hotel.short_desc || `${hotel.star_rating}-star hotel`,
                        long_desc: hotel.long_desc || `${hotel.hotel_name} in ${hotel.city}`,
                        images: []
                    },
                    price: {
                        currency: hotel.currency || "INR",
                        value: parseFloat(hotel.price_per_night).toFixed(2)
                    },
                    category_id: "HOTEL",
                    fulfillment_id: `fulfillment-hotel-${hotel.id}`,
                    location_id: `location-${hotel.city.toLowerCase()}-${hotel.id}`,
                    time: {
                        label: "check_in",
                        timestamp: checkInTime
                    },
                    matched: true,
                    tags: [
                        {
                            code: "AMENITIES",
                            list: amenitiesList
                        },
                        {
                            code: "ROOM_TYPE",
                            list: [
                                { code: "TYPE", value: hotel.room_type || "Standard Room" },
                                { code: "RATING", value: `${hotel.star_rating} stars` }
                            ]
                        },
                        {
                            code: "POLICIES",
                            list: [
                                { code: "CHECK_IN", value: hotel.check_in_time || "2:00 PM" },
                                { code: "CHECK_OUT", value: hotel.check_out_time || "11:00 AM" },
                                { code: "AVAILABLE_ROOMS", value: hotel.available_rooms.toString() }
                            ]
                        },
                        {
                            code: "LOCATION",
                            list: [
                                { code: "CITY", value: hotel.city },
                                { code: "AREA", value: hotel.location || "City Center" },
                                { code: "GPS", value: hotel.gps_coordinates || location }
                            ]
                        }
                    ]
                };
            });


            // Create Beckn catalog structure
            const catalog = {
                bpp: {
                    descriptor: {
                        name: "Hotels BPP Provider",
                        short_desc: "Hotel booking provider",
                        long_desc: "Comprehensive hotel booking services across major Indian cities"
                    },
                    providers: [
                        {
                            id: "hotels-provider-001",
                            descriptor: {
                                name: "Indian Hotels Network",
                                short_desc: "Multi-brand hotel aggregator",
                                long_desc: "Access to premium hotels including Taj, ITC, Marriott and budget-friendly options"
                            },
                            categories: [
                                {
                                    id: "HOTEL",
                                    descriptor: {
                                        name: "Hotel Accommodation"
                                    }
                                }
                            ],
                            fulfillments: [
                                {
                                    id: "fulfillment-hotel-001",
                                    type: "DELIVERY",
                                    start: {
                                        location: {
                                            gps: location,
                                            address: {
                                                locality: "South Mumbai",
                                                city: "Mumbai",
                                                state: "Maharashtra",
                                                country: "India"
                                            }
                                        },
                                        time: {
                                            range: {
                                                start: checkInTime,
                                                end: new Date(new Date(checkInTime).getTime() + 2 * 60 * 60 * 1000).toISOString()
                                            }
                                        }
                                    },
                                    end: {
                                        location: {
                                            gps: location,
                                            address: {
                                                locality: "South Mumbai",
                                                city: "Mumbai",
                                                state: "Maharashtra",
                                                country: "India"
                                            }
                                        },
                                        time: {
                                            range: {
                                                start: checkOutTime,
                                                end: new Date(new Date(checkOutTime).getTime() + 2 * 60 * 60 * 1000).toISOString()
                                            }
                                        }
                                    }
                                }
                            ],
                            items: hotels,
                            locations: result.rows.map(hotel => ({
                                id: `location-${hotel.city.toLowerCase()}-${hotel.id}`,
                                gps: hotel.gps_coordinates || location,
                                address: {
                                    locality: hotel.location || "City Center",
                                    city: hotel.city,
                                    state: "India",
                                    country: "India"
                                }
                            }))
                        }
                    ]
                },
                providers: [
                    {
                        id: "hotels-provider-001",
                        descriptor: {
                            name: "Indian Hotels Network"
                        },
                        items: hotels
                    }
                ]
            };

            return catalog;

        } catch (error) {
            console.error('❌ Error in hotels service:', error);
            throw error;
        }
    }

    /**
     * Get empty catalog when no hotels found
     */
    getEmptyCatalog() {
        return {
            bpp: {
                descriptor: {
                    name: "Hotels BPP Provider",
                    short_desc: "Hotel booking provider",
                    long_desc: "Comprehensive hotel booking services across major Indian cities"
                },
                providers: []
            },
            providers: []
        };
    }

    /**
     * Create BPP booking in database
     */
    async createBppBooking(bookingData) {
        try {
            console.log('💾 Creating Hotels BPP booking:', {
                bppBookingId: bookingData.bppBookingId,
                platformBookingId: bookingData.platformBookingId
            });

            const query = `
                INSERT INTO bpp_bookings (
                    bpp_booking_id, platform_booking_id, hotel_id, guest_name,
                    guest_email, guest_phone, check_in_date, check_out_date,
                    number_of_guests, booking_status, beckn_transaction_id, beckn_message_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;

            const values = [
                bookingData.bppBookingId,
                bookingData.platformBookingId,
                bookingData.hotelId,
                bookingData.guestName,
                bookingData.guestEmail,
                bookingData.guestPhone,
                bookingData.checkInDate ? new Date(bookingData.checkInDate).toISOString().split('T')[0] : null,
                bookingData.checkOutDate ? new Date(bookingData.checkOutDate).toISOString().split('T')[0] : null,
                bookingData.numberOfGuests,
                bookingData.bookingStatus,
                bookingData.becknTransactionId,
                bookingData.becknMessageId
            ];

            const result = await db.query(query, values);
            
            console.log('✅ Hotels BPP booking created successfully:', {
                id: result.rows[0].id,
                bppBookingId: result.rows[0].bpp_booking_id
            });

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error creating Hotels BPP booking:', error);
            throw new Error(`Failed to create BPP booking: ${error.message}`);
        }
    }

    /**
     * Get BPP booking by ID
     */
    async getBppBooking(bppBookingId) {
        try {
            const query = `
                SELECT bb.*, h.hotel_code, h.hotel_name, h.city
                FROM bpp_bookings bb
                LEFT JOIN hotels h ON bb.hotel_id = h.id
                WHERE bb.bpp_booking_id = $1
            `;

            const result = await db.query(query, [bppBookingId]);
            
            if (result.rows.length === 0) {
                throw new Error(`Hotels BPP booking not found: ${bppBookingId}`);
            }

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error getting Hotels BPP booking:', error);
            throw error;
        }
    }
    
    /**
     * Update booking for cancellation
     */
    async updateBookingForCancellation(updateData) {
        try {
            console.log('💾 Updating Hotels booking for cancellation:', {
                bppBookingId: updateData.bppBookingId,
                cancellationReason: updateData.cancellationReason,
                cancellationCharges: updateData.cancellationCharges,
                refundAmount: updateData.refundAmount
            });

            const query = `
                UPDATE bpp_bookings 
                SET 
                    booking_status = 'CANCELLED',
                    cancellation_status = 'CANCELLED',
                    cancellation_reason = $2,
                    cancellation_time = $3,
                    cancellation_charges = $4,
                    refund_amount = $5,
                    refund_status = 'PROCESSING',
                    refund_id = $6,
                    refund_initiated_at = $7,
                    updated_at = $8
                WHERE bpp_booking_id = $1
                RETURNING *
            `;

            const refundId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            
            const values = [
                updateData.bppBookingId,
                updateData.cancellationReason,
                new Date().toISOString(),
                updateData.cancellationCharges,
                updateData.refundAmount,
                refundId,
                new Date().toISOString(),
                new Date().toISOString()
            ];

            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error(`Hotels BPP booking not found for cancellation: ${updateData.bppBookingId}`);
            }

            console.log('✅ Hotels BPP booking updated for cancellation:', {
                bppBookingId: result.rows[0].bpp_booking_id,
                refundId: result.rows[0].refund_id
            });

            return result.rows[0];

        } catch (error) {
            console.error('❌ Error updating Hotels BPP booking for cancellation:', error);
            throw new Error(`Failed to update Hotels BPP booking for cancellation: ${error.message}`);
        }
    }
    
    /**
     * Get booking status
     */
    async getBookingStatus(bppBookingId) {
        try {
            const booking = await this.getBppBooking(bppBookingId);
            
            return {
                id: booking.bpp_booking_id,
                platformBookingId: booking.platform_booking_id,
                status: booking.booking_status,
                cancellationStatus: booking.cancellation_status,
                refundStatus: booking.refund_status,
                refundAmount: parseFloat(booking.refund_amount || 0),
                cancellationReason: booking.cancellation_reason,
                bookingDetails: {
                    guestName: booking.guest_name,
                    guestEmail: booking.guest_email,
                    hotelInfo: {
                        hotelCode: booking.hotel_code,
                        hotelName: booking.hotel_name,
                        city: booking.city
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error getting booking status:', error);
            throw error;
        }
    }
}

module.exports = new HotelsService();
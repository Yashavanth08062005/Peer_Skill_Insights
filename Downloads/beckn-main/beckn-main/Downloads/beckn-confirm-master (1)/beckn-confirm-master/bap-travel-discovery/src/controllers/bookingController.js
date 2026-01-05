const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Booking Controller - Handles booking history operations
 */
class BookingController {
    /**
     * Create a new booking
     */
    async createBooking(req, res) {
        try {
            const {
                booking_reference,
                user_id,
                booking_type,
                item_id,
                provider_id,
                item_name,
                item_code,
                origin,
                destination,
                departure_time,
                arrival_time,
                check_in_date,
                check_out_date,
                passenger_name,
                passenger_email,
                passenger_phone,
                passenger_gender,
                date_of_birth,
                nationality,
                passport_number,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country,
                transaction_id,
                payment_method,
                payment_status,
                amount,
                currency,
                booking_status,
                beckn_transaction_id,
                beckn_message_id,
                order_id,
                item_details,
                booking_metadata
            } = req.body;

            logger.info('Creating new booking', { booking_reference, user_id });

            const query = `
                INSERT INTO bookings (
                    booking_reference, user_id, booking_type, item_id, provider_id,
                    item_name, item_code, origin, destination, departure_time, arrival_time,
                    check_in_date, check_out_date, passenger_name, passenger_email, passenger_phone,
                    passenger_gender, date_of_birth, nationality, passport_number,
                    address_line1, address_line2, city, state, postal_code, country,
                    transaction_id, payment_method, payment_status, amount, currency,
                    booking_status, beckn_transaction_id, beckn_message_id, order_id,
                    item_details, booking_metadata
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                    $29, $30, $31, $32, $33, $34, $35, $36, $37
                )
                RETURNING *
            `;

            // Truncate fields to match DB constraints (varchar(10))
            const truncatedOrigin = origin ? origin.substring(0, 10) : null;
            const truncatedDestination = destination ? destination.substring(0, 10) : null;

            if (origin && origin.length > 10) logger.warn(`Truncating origin from '${origin}' to '${truncatedOrigin}'`);
            if (destination && destination.length > 10) logger.warn(`Truncating destination from '${destination}' to '${truncatedDestination}'`);

            const values = [
                booking_reference, user_id, booking_type, item_id, provider_id,
                item_name, item_code, truncatedOrigin, truncatedDestination, departure_time, arrival_time,
                check_in_date, check_out_date, passenger_name, passenger_email, passenger_phone,
                passenger_gender, date_of_birth, nationality, passport_number,
                address_line1, address_line2, city, state, postal_code, country,
                transaction_id, payment_method, payment_status, amount, currency,
                booking_status, beckn_transaction_id, beckn_message_id, order_id,
                JSON.stringify(item_details), JSON.stringify(booking_metadata)
            ].map(v => v === undefined ? null : v);

            const result = await db.query(query, values);

            logger.info('Booking created successfully', {
                booking_id: result.rows[0].id,
                booking_reference: result.rows[0].booking_reference
            });

            return res.status(201).json({
                success: true,
                message: 'Booking created successfully',
                booking: result.rows[0]
            });

        } catch (error) {
            logger.error('Error creating booking:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create booking',
                message: error.message
            });
        }
    }

    /**
     * Get user's booking history
     */
    async getUserBookings(req, res) {
        try {
            const userId = req.user?.id || req.params.userId;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            logger.info('Fetching bookings for user', { userId });

            const query = `
                SELECT * FROM bookings
                WHERE user_id = $1
                ORDER BY created_at DESC
            `;

            const result = await db.query(query, [userId]);

            return res.status(200).json({
                success: true,
                count: result.rows.length,
                bookings: result.rows
            });

        } catch (error) {
            logger.error('Error fetching user bookings:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch bookings',
                message: error.message
            });
        }
    }

    /**
     * Get booking by reference
     */
    async getBookingByReference(req, res) {
        try {
            const { bookingReference } = req.params;

            logger.info('Fetching booking by reference', { bookingReference });

            const query = `
                SELECT * FROM bookings
                WHERE booking_reference = $1
            `;

            const result = await db.query(query, [bookingReference]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            return res.status(200).json({
                success: true,
                booking: result.rows[0]
            });

        } catch (error) {
            logger.error('Error fetching booking:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch booking',
                message: error.message
            });
        }
    }

    /**
     * Get booking by email
     */
    async getBookingsByEmail(req, res) {
        try {
            const { email } = req.params;

            logger.info('Fetching bookings by email', { email });

            // Case-insensitive email search
            const query = `
                SELECT * FROM bookings
                WHERE LOWER(passenger_email) = LOWER($1)
                ORDER BY created_at DESC
            `;

            const result = await db.query(query, [email]);

            return res.status(200).json({
                success: true,
                count: result.rows.length,
                bookings: result.rows
            });

        } catch (error) {
            logger.error('Error fetching bookings by email:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch bookings',
                message: error.message
            });
        }
    }

    /**
     * Update booking status
     */
    async updateBookingStatus(req, res) {
        try {
            const { bookingReference } = req.params;
            const { booking_status, payment_status } = req.body;

            logger.info('Updating booking status', { bookingReference, booking_status, payment_status });

            const query = `
                UPDATE bookings
                SET booking_status = COALESCE($1, booking_status),
                    payment_status = COALESCE($2, payment_status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE booking_reference = $3
                RETURNING *
            `;

            const result = await db.query(query, [booking_status, payment_status, bookingReference]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Booking updated successfully',
                booking: result.rows[0]
            });

        } catch (error) {
            logger.error('Error updating booking:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update booking',
                message: error.message
            });
        }
    }

    /**
     * Cancel booking
     */
    async cancelBooking(req, res) {
        try {
            const { bookingReference } = req.params;

            logger.info('Cancelling booking', { bookingReference });

            const query = `
                UPDATE bookings
                SET booking_status = 'CANCELLED',
                    updated_at = CURRENT_TIMESTAMP
                WHERE booking_reference = $1
                RETURNING *
            `;

            const result = await db.query(query, [bookingReference]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Booking cancelled successfully',
                booking: result.rows[0]
            });

        } catch (error) {
            logger.error('Error cancelling booking:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to cancel booking',
                message: error.message
            });
        }
    }
}

module.exports = new BookingController();

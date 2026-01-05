const experiencesService = require('../services/experiencesService');
const { v4: uuidv4 } = require('uuid');

/**
 * Experiences BPP Controller - Handles Beckn protocol requests for local experiences
 */
class BecknController {

    async search(req, res) {
        try {
            console.log('🔍 [SEARCH] Received search request');
            const { context, message } = req.body;

            console.log('🔍 [SEARCH] Calling searchExperiences service');
            const intent = message?.intent || {};
            const location = intent?.fulfillment?.start?.location?.address?.city || intent?.fulfillment?.end?.location?.gps || "12.9716,77.5946"; // Prefer city name for filtering
            const date = intent?.fulfillment?.time?.range?.start || new Date().toISOString();

            const catalog = await experiencesService.searchExperiences(location, date);
            console.log('🔍 [SEARCH] Got catalog, sending response');


            const response = {
                context: {
                    ...context,
                    action: "on_search",
                    bpp_id: "experiences-bpp.example.com",
                    bpp_uri: "http://localhost:3006",
                    message_id: uuidv4(),
                    timestamp: new Date().toISOString()
                },
                message: {
                    catalog: catalog
                }
            };

            const experienceCount = catalog?.bpp?.providers?.[0]?.items?.length || 0;
            console.log(`🎡 [SEARCH] Returning ${experienceCount} experience options`);
            return res.status(200).json(response);

        } catch (error) {
            console.error('❌ [SEARCH] Error:', error.message);
            return res.status(500).json({
                context: { ...context, action: "on_search" },
                error: {
                    type: "CORE-ERROR",
                    code: "20000",
                    message: error.message || "Internal server error"
                }
            });
        }
    }

    /**
     * Handle select requests
     */
    async select(req, res) {
        try {
            const { context, message } = req.body;

            console.log('✅ Experiences BPP received select request');

            // Determine price based on selection (mock logic)
            // ideally fetch price of selected items
            const response = {
                context: {
                    ...context,
                    action: "on_select",
                    bpp_id: "experiences-bpp.example.com",
                    bpp_uri: "http://localhost:3006",
                    message_id: uuidv4(),
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        ...message.order,
                        state: "SELECTED",
                        quote: {
                            price: {
                                currency: "INR",
                                value: "3000.00" // Mock total
                            },
                            breakup: [
                                {
                                    title: "Experience Fee",
                                    price: {
                                        currency: "INR",
                                        value: "2500.00"
                                    }
                                },
                                {
                                    title: "Taxes & Service Charges",
                                    price: {
                                        currency: "INR",
                                        value: "500.00"
                                    }
                                }
                            ]
                        }
                    }
                }
            };

            return res.status(200).json(response);

        } catch (error) {
            console.error('Error in experiences select:', error);
            return res.status(500).json({
                context: {
                    ...req.body.context,
                    action: "on_select"
                },
                error: {
                    type: "CORE-ERROR",
                    code: "20000",
                    message: "Internal server error"
                }
            });
        }
    }

    /**
     * Handle init requests
     */
    async init(req, res) {
        try {
            const { context, message } = req.body;

            console.log('🚀 Experiences BPP received init request');

            const response = {
                context: {
                    ...context,
                    action: "on_init",
                    bpp_id: "experiences-bpp.example.com",
                    bpp_uri: "http://localhost:3006",
                    message_id: uuidv4(),
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        ...message.order,
                        state: "INITIALIZED",
                        id: uuidv4(),
                        payment: {
                            type: "PRE-FULFILLMENT",
                            collected_by: "BPP"
                        }
                    }
                }
            };

            return res.status(200).json(response);

        } catch (error) {
            console.error('Error in experiences init:', error);
            return res.status(500).json({
                context: {
                    ...req.body.context,
                    action: "on_init"
                },
                error: {
                    type: "CORE-ERROR",
                    code: "20000",
                    message: "Internal server error"
                }
            });
        }
    }

    /**
     * Handle confirm requests - Save booking to BPP database
     */
    async confirm(req, res) {
        try {
            const { context, message } = req.body;

            console.log('💳 Experiences BPP received confirm request', {
                transaction_id: context?.transaction_id,
                order_id: message?.order?.id
            });

            // Extract booking details
            const order = message.order;
            const items = order?.items || [];
            const billing = order?.billing;

            if (items.length === 0) {
                throw new Error('No items found in order');
            }

            // Generate BPP booking ID
            const bppBookingId = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            // Extract experience ID
            const itemId = items[0].id;

            // Save booking to BPP database
            const bookingResult = await experiencesService.createBppBooking({
                bppBookingId,
                platformBookingId: order.id,
                itemId: itemId,
                guestName: billing?.name || 'Unknown Guest',
                guestEmail: billing?.email || '',
                guestPhone: billing?.phone || '',
                date: order?.fulfillment?.start?.time?.timestamp || new Date().toISOString(),
                numberOfGuests: order?.quantity?.count || 1,
                bookingStatus: 'CONFIRMED',
                becknTransactionId: context.transaction_id,
                becknMessageId: context.message_id
            });

            console.log('✅ Experiences BPP booking saved:', {
                bppBookingId,
                platformBookingId: order.id,
                dbBookingId: bookingResult.id
            });

            const response = {
                context: {
                    ...context,
                    action: "on_confirm",
                    bpp_id: "experiences-bpp.example.com",
                    bpp_uri: "http://localhost:3006",
                    message_id: uuidv4(),
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        ...message.order,
                        state: "CONFIRMED",
                        id: message.order.id || uuidv4(),
                        bpp_booking_id: bppBookingId,
                        fulfillment: {
                            state: {
                                descriptor: {
                                    code: "CONFIRMED"
                                }
                            },
                            tracking: true,
                            id: bppBookingId
                        },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                }
            };

            return res.status(200).json(response);

        } catch (error) {
            console.error('Error in experiences confirm:', error);
            return res.status(500).json({
                context: {
                    ...req.body.context,
                    action: "on_confirm"
                },
                error: {
                    type: "CORE-ERROR",
                    code: "20000",
                    message: error.message || "Internal server error"
                }
            });
        }
    }

    /**
     * Handle status requests
     */
    async status(req, res) {
        try {
            const { context, message } = req.body;

            console.log('📊 Experiences BPP received status request');

            const response = {
                context: {
                    ...context,
                    action: "on_status",
                    bpp_id: "experiences-bpp.example.com",
                    bpp_uri: "http://localhost:3006",
                    message_id: uuidv4(),
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        id: message.order_id,
                        state: "CONFIRMED",
                        fulfillment: {
                            state: {
                                descriptor: {
                                    code: "CONFIRMED"
                                }
                            }
                        }
                    }
                }
            };

            return res.status(200).json(response);

        } catch (error) {
            console.error('Error in experiences status:', error);
            return res.status(500).json({
                context: {
                    ...req.body.context,
                    action: "on_status"
                },
                error: {
                    type: "CORE-ERROR",
                    code: "20000",
                    message: "Internal server error"
                }
            });
        }
    }

    // Additional endpoints for full BPP functionality
    async track(req, res) {
        try {
            return res.status(200).json({
                message: "Track functionality not implemented yet"
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async cancel(req, res) {
        try {
            const { context, message } = req.body;

            console.log("🔄 Experiences BPP received cancel request", {
                transaction_id: context?.transaction_id,
                order_id: message?.order_id
            });

            // Get booking from BPP database
            const booking = await experiencesService.getBppBooking(message.order_id);

            // Calculate refund amount based on cancellation policy
            const originalAmount = booking.amount || 2500; // Mock amount if not saved
            const cancellationPolicy = this.getCancellationPolicy(booking);
            const cancellationCharges = this.calculateCancellationCharges(originalAmount, cancellationPolicy);
            const refundAmount = originalAmount - cancellationCharges;

            // Update booking status in database
            const updatedBooking = await experiencesService.updateBookingForCancellation({
                bppBookingId: message.order_id,
                cancellationReason: message.cancellation_reason_id,
                cancellationCharges: cancellationCharges,
                refundAmount: refundAmount
            });

            // Create Beckn-compliant cancel response
            const response = {
                context: {
                    ...context,
                    action: "on_cancel",
                    bpp_id: "experiences-bpp.example.com",
                    bpp_uri: "http://localhost:3006",
                    message_id: uuidv4(),
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        id: message.order_id,
                        state: "CANCELLED",
                        cancellation: {
                            status: "Cancelled",
                            reason: {
                                id: message.cancellation_reason_id || "CUSTOMER_REQUEST",
                                descriptor: {
                                    name: this.getCancellationReasonName(message.cancellation_reason_id)
                                }
                            },
                            time: {
                                timestamp: new Date().toISOString()
                            }
                        },
                        payment: {
                            type: "POST-FULFILLMENT",
                            status: "PAID",
                            collected_by: "BAP",
                            params: {
                                amount: refundAmount.toString(),
                                currency: "INR",
                                refund_id: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                                original_amount: originalAmount.toString(),
                                cancellation_charges: cancellationCharges.toString()
                            },
                            time: {
                                timestamp: new Date().toISOString()
                            }
                        },
                        quote: {
                            price: {
                                currency: "INR",
                                value: refundAmount.toString()
                            }
                        },
                        fulfillment: {
                            id: message.order_id,
                            state: {
                                descriptor: {
                                    code: "CANCELLED"
                                }
                            }
                        },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                }
            };

            console.log("✅ Experiences BPP cancel response prepared", {
                bppBookingId: message.order_id,
                refundAmount,
                cancellationCharges
            });

            return res.status(200).json(response);

        } catch (error) {
            console.error("❌ Error in experiences cancel:", error);
            return res.status(500).json({
                context: {
                    ...req.body.context,
                    action: "on_cancel"
                },
                error: {
                    type: "CORE-ERROR",
                    code: "20000",
                    message: error.message || "Internal server error"
                }
            });
        }
    }

    async update(req, res) {
        try {
            return res.status(200).json({
                message: "Update functionality not implemented yet"
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get cancellation reason name
     */
    getCancellationReasonName(reasonId) {
        const reasons = {
            'CUSTOMER_REQUEST': 'Customer requested cancellation',
            'CHANGE_OF_PLANS': 'Change of travel plans',
            'EMERGENCY': 'Emergency situation',
            'DUPLICATE_BOOKING': 'Duplicate booking',
            'PRICE_CHANGE': 'Price change',
            'SERVICE_UNAVAILABLE': 'Service no longer available'
        };
        return reasons[reasonId] || 'Customer requested cancellation';
    }

    /**
     * Calculate cancellation charges based on policy
     */
    calculateCancellationCharges(originalAmount, policy) {
        if (!policy || policy.hoursBefore < 0) {
            // No cancellation allowed
            return originalAmount;
        }

        const hoursBefore = policy.hoursBefore;
        const percentage = policy.percentage;

        // For demo purposes, using a simple policy
        return (originalAmount * percentage) / 100;
    }

    /**
     * Get cancellation policy for a booking
     */
    getCancellationPolicy(booking) {
        // Default policy: 15% cancellation charge if cancelled more than 48 hours before
        return {
            hoursBefore: 48,
            percentage: 15
        };
    }
}

module.exports = new BecknController();
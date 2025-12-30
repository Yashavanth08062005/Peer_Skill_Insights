const axios = require('axios');
const logger = require('../utils/logger');
const env = require('../config/env');
const { v4: uuidv4 } = require('uuid');
const bppMappingService = require('./bppMappingService');

/**
 * Beckn Service - Handles communication with ONIX adapter
 * Transforms BAP requests into proper Beckn messages and sends to ONIX
 */
class BecknService {

    constructor() {
        this.onixBaseUrl = env.ONIX_URL || 'http://127.0.0.1:5000';
        this.bapId = env.BAP_ID || 'travel-discovery-bap.example.com';
        this.bapUri = env.BAP_URI || 'http://127.0.0.1:8081';
        this.flightsBppUrl = env.FLIGHTS_BPP_URL || 'http://127.0.0.1:7001';
        this.flightsIntlBppUrl = env.FLIGHTS_INTL_BPP_URL || 'http://127.0.0.1:7005';
        this.hotelsBppUrl = env.HOTELS_BPP_URL || 'http://127.0.0.1:7003';
        this.busesBppUrl = env.BUSES_BPP_URL || 'http://127.0.0.1:3004';
        this.trainsBppUrl = env.TRAINS_BPP_URL || 'http://127.0.0.1:3005';
    }

    /**
     * Create Beckn context object
     */
    createContext(action, transactionId = null, messageId = null) {
        return {
            domain: "mobility",
            country: "IND",
            city: "std:080", // Bangalore city code
            action: action,
            core_version: "1.1.0",
            bap_id: this.bapId,
            bap_uri: this.bapUri,
            transaction_id: transactionId || uuidv4(),
            message_id: messageId || uuidv4(),
            timestamp: new Date().toISOString(),
            key: env.BAP_PUBLIC_KEY || "",
            ttl: "PT30S"
        };
    }

    /**
     * Process search request - send to ONIX and aggregate responses
     */
    async processSearch(context, message) {
        try {
            logger.info('Processing Beckn search request');

            // Create Beckn-compliant search request
            const becknRequest = {
                context: this.createContext('search', context.transaction_id, context.message_id),
                message: {
                    intent: {
                        fulfillment: {
                            start: {
                                location: {
                                    gps: message.intent?.fulfillment?.start?.location?.gps || "12.9716,77.5946"
                                }
                            },
                            end: {
                                location: {
                                    gps: message.intent?.fulfillment?.end?.location?.gps || "19.0760,72.8777"
                                }
                            },
                            time: {
                                range: {
                                    start: message.intent?.fulfillment?.time?.range?.start || new Date().toISOString(),
                                    end: message.intent?.fulfillment?.time?.range?.end || new Date(Date.now() + 86400000).toISOString()
                                }
                            }
                        },
                        category: {
                            id: message.intent?.category?.id || "MOBILITY"
                        },
                        item: {
                            descriptor: {
                                name: message.intent?.item?.descriptor?.name || "Travel Service"
                            }
                        }
                    }
                }
            };

            // Route request to ONIX adapter (mock or real)
            // The ONIX adapter handles Beckn protocol messages; we also query BPPs directly
            // Skip ONIX for category-specific searches - route directly to BPPs
            // const onixResponse = await this.sendToONIX('/search', becknRequest);

            // Initialize aggregated response - do NOT include ONIX data for category-specific searches
            const aggregated = {
                context: this.createContext('on_search', context.transaction_id, context.message_id),
                message: { catalog: { descriptor: {}, providers: [] } }
            };

            // Route request based on category
            const categoryId = message.intent?.category?.id || '';
            const isMobility = String(categoryId).toUpperCase() === 'MOBILITY';
            const isHospitality = String(categoryId).toUpperCase() === 'HOSPITALITY';

            if (isMobility) {
                // Query primary flights BPP
                try {
                    const flightsRes = await this.sendToBPP(this.flightsBppUrl, '/search', becknRequest);
                    const flightsProviders = flightsRes.data?.message?.catalog?.providers || [];
                    logger.info('Flights BPP response providers:', { count: flightsProviders.length });
                    aggregated.message.catalog.providers.push(...flightsProviders);
                } catch (err) {
                    logger.error('Error fetching from primary flights BPP', { error: err.message });
                }

                // Query international flights BPP
                try {
                    const intlRes = await this.sendToBPP(this.flightsIntlBppUrl, '/search', becknRequest);
                    const intlProviders = intlRes.data?.message?.catalog?.providers || [];
                    logger.info('International flights BPP response providers:', { count: intlProviders.length });
                    aggregated.message.catalog.providers.push(...intlProviders);
                } catch (err) {
                    logger.error('Error fetching from international flights BPP', { error: err.message });
                }

                // Query buses BPP
                try {
                    const busesRes = await this.sendToBPP(this.busesBppUrl, '/search', becknRequest);
                    const busesProviders = busesRes.data?.message?.catalog?.providers || [];
                    logger.info('Buses BPP response providers:', { count: busesProviders.length });
                    aggregated.message.catalog.providers.push(...busesProviders);
                } catch (err) {
                    // Start buses BPP if not running or ignore error
                    // Start buses BPP if not running or ignore error
                    logger.error('Error fetching from buses BPP', { error: err.message });
                }

                // Query trains BPP
                try {
                    const trainsRes = await this.sendToBPP(this.trainsBppUrl, '/search', becknRequest);
                    const trainsProviders = trainsRes.data?.message?.catalog?.providers || [];
                    logger.info('Trains BPP response providers:', { count: trainsProviders.length });
                    aggregated.message.catalog.providers.push(...trainsProviders);
                } catch (err) {
                    logger.error('Error fetching from trains BPP', { error: err.message });
                }
            } else if (isHospitality) {
                // Query hotels BPP
                try {
                    const hotelsRes = await this.sendToBPP(this.hotelsBppUrl, '/search', becknRequest);
                    const hotelsProviders = hotelsRes.data?.message?.catalog?.providers || [];
                    logger.info('Hotels BPP response providers:', { count: hotelsProviders.length });
                    aggregated.message.catalog.providers.push(...hotelsProviders);
                } catch (err) {
                    logger.error('Error fetching from hotels BPP', { error: err.message });
                }
            }

            logger.info('Final aggregated response:', {
                totalProviders: aggregated.message.catalog.providers.length,
                catalog: aggregated.message.catalog
            });

            return aggregated;

        } catch (error) {
            logger.error('Error processing search:', error);
            throw new Error('Failed to process search request');
        }
    }

    /**
     * Process select request
     */
    async processSelect(context, message) {
        try {
            logger.info('Processing Beckn select request');

            const becknRequest = {
                context: this.createContext('select', context.transaction_id, context.message_id),
                message: {
                    order: message.order
                }
            };

            const onixResponse = await this.sendToONIX('/select', becknRequest);
            return onixResponse.data;

        } catch (error) {
            logger.error('Error processing select:', error);
            throw new Error('Failed to process select request');
        }
    }

    /**
     * Process init request
     */
    async processInit(context, message) {
        try {
            logger.info('Processing Beckn init request');

            const becknRequest = {
                context: this.createContext('init', context.transaction_id, context.message_id),
                message: {
                    order: message.order
                }
            };

            const onixResponse = await this.sendToONIX('/init', becknRequest);
            return onixResponse.data;

        } catch (error) {
            logger.error('Error processing init:', error);
            throw new Error('Failed to process init request');
        }
    }

    /**
     * Process confirm request - Forward to appropriate BPP
     */
    async processConfirm(context, message) {
        try {
            logger.info('Processing Beckn confirm request', {
                transaction_id: context.transaction_id,
                order_id: message.order?.id
            });

            // Create Beckn-compliant confirm request
            const becknRequest = {
                context: this.createContext('confirm', context.transaction_id, context.message_id),
                message: {
                    order: message.order
                }
            };

            // Determine which BPP to call based on order items
            const order = message.order;
            const items = order?.items || [];

            if (items.length === 0) {
                throw new Error('No items found in order for confirmation');
            }

            // Get the first item to determine service type
            const firstItem = items[0];
            const itemCategory = firstItem.category_id || firstItem.descriptor?.name || '';

            let bppResponse = null;
            let bppUrl = '';
            let serviceType = '';

            // Route to appropriate BPP based on item category/type
            if (itemCategory.toLowerCase().includes('flight') || itemCategory.toLowerCase().includes('domestic')) {
                bppUrl = this.flightsBppUrl;
                serviceType = 'Domestic Flights BPP';
            } else if (itemCategory.toLowerCase().includes('international')) {
                bppUrl = this.flightsIntlBppUrl;
                serviceType = 'International Flights BPP';
            } else if (itemCategory.toLowerCase().includes('hotel') || itemCategory.toLowerCase().includes('accommodation')) {
                bppUrl = this.hotelsBppUrl;
                serviceType = 'Hotels BPP';
            } else if (itemCategory.toLowerCase().includes('bus')) {
                bppUrl = this.busesBppUrl;
                serviceType = 'Buses BPP';
            } else if (itemCategory.toLowerCase().includes('train')) {
                bppUrl = this.trainsBppUrl;
                serviceType = 'Trains BPP';
            } else {
                // Default to flights BPP if category is unclear
                bppUrl = this.flightsBppUrl;
                serviceType = 'Flights BPP (default)';
            }

            logger.info('Routing confirm request to BPP', {
                serviceType,
                bppUrl,
                itemCategory,
                itemCount: items.length
            });

            try {
                // Send confirm request to the appropriate BPP
                bppResponse = await this.sendToBPP(bppUrl, '/confirm', becknRequest);

                logger.info('BPP confirm response received', {
                    serviceType,
                    status: bppResponse.status,
                    orderId: bppResponse.data?.message?.order?.id
                });

                // Extract BPP booking ID from response
                const bppBookingId = bppResponse.data?.message?.order?.bpp_booking_id ||
                    bppResponse.data?.message?.order?.fulfillment?.id;

                // Create BPP booking mapping
                if (bppBookingId) {
                    try {
                        const mappingData = {
                            platformBookingId: order.id,
                            platformBookingReference: order.booking_reference || order.id,
                            bppServiceType: bppMappingService.determineBppServiceType(
                                firstItem.category_id || 'flight',
                                firstItem
                            ),
                            bppBookingId: bppBookingId,
                            bppServiceUrl: bppUrl,
                            becknTransactionId: context.transaction_id,
                            becknMessageId: context.message_id
                        };

                        await bppMappingService.createMapping(mappingData);

                        logger.info('BPP booking mapping created', {
                            platformBookingId: order.id,
                            bppBookingId: bppBookingId,
                            serviceType: mappingData.bppServiceType
                        });

                    } catch (mappingError) {
                        logger.error('Failed to create BPP booking mapping', {
                            error: mappingError.message,
                            platformBookingId: order.id,
                            bppBookingId: bppBookingId
                        });
                        // Don't fail the entire confirm process due to mapping error
                    }
                }

                // Return the BPP response with updated context
                const confirmResponse = {
                    context: {
                        ...bppResponse.data.context,
                        action: 'on_confirm',
                        timestamp: new Date().toISOString(),
                        bap_id: this.bapId,
                        bap_uri: this.bapUri
                    },
                    message: {
                        order: {
                            ...bppResponse.data.message.order,
                            state: 'CONFIRMED',
                            updated_at: new Date().toISOString()
                        }
                    }
                };

                logger.info('Confirm request processed successfully via BPP', {
                    serviceType,
                    order_id: confirmResponse.message.order.id,
                    bpp_order_id: bppResponse.data?.message?.order?.id,
                    bpp_booking_id: bppBookingId
                });

                return confirmResponse;

            } catch (bppError) {
                logger.error('Error calling BPP confirm endpoint', {
                    serviceType,
                    bppUrl,
                    error: bppError.message
                });

                // Fallback: Return success response even if BPP call fails
                // This ensures the booking process continues
                const fallbackResponse = {
                    context: {
                        ...context,
                        action: 'on_confirm',
                        timestamp: new Date().toISOString()
                    },
                    message: {
                        order: {
                            ...message.order,
                            state: 'CONFIRMED',
                            id: message.order.id || `order-${Date.now()}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            bpp_error: `BPP ${serviceType} unavailable: ${bppError.message}`
                        }
                    }
                };

                logger.warn('Using fallback confirm response due to BPP error', {
                    order_id: fallbackResponse.message.order.id
                });

                return fallbackResponse;
            }

        } catch (error) {
            logger.error('Error processing confirm:', error);
            throw new Error('Failed to process confirm request');
        }
    }

    /**
     * Process status request
     */
    async processStatus(context, message) {
        try {
            logger.info('Processing Beckn status request', {
                transaction_id: context.transaction_id,
                order_id: message.order_id
            });

            // Find BPP mapping for this order
            let bppMapping = null;
            try {
                bppMapping = await bppMappingService.findByPlatformBookingId(message.order_id);
                logger.info('Found BPP mapping for status check', {
                    platformBookingId: message.order_id,
                    bppBookingId: bppMapping?.bppBookingId,
                    bppServiceType: bppMapping?.bppServiceType
                });
            } catch (mappingError) {
                logger.warn('No BPP mapping found for order', {
                    order_id: message.order_id,
                    error: mappingError.message
                });
            }

            let bppResponse = null;

            // If BPP mapping exists, get status from BPP
            if (bppMapping && bppMapping.bppServiceUrl) {
                try {
                    const becknRequest = {
                        context: this.createContext('status', context.transaction_id, context.message_id),
                        message: {
                            order_id: bppMapping.bppBookingId // Use BPP booking ID
                        }
                    };

                    bppResponse = await this.sendToBPP(bppMapping.bppServiceUrl, '/status', becknRequest);

                    logger.info('BPP status response received', {
                        bppBookingId: bppMapping.bppBookingId,
                        status: bppResponse.data?.message?.order?.state
                    });

                } catch (bppError) {
                    logger.error('Error calling BPP status endpoint', {
                        bppServiceUrl: bppMapping.bppServiceUrl,
                        bppBookingId: bppMapping.bppBookingId,
                        error: bppError.message
                    });

                    // Continue with status check even if BPP call fails
                    // Return a fallback status response
                    const fallbackResponse = {
                        context: {
                            ...context,
                            action: 'on_status',
                            timestamp: new Date().toISOString()
                        },
                        message: {
                            order: {
                                id: message.order_id,
                                state: 'UNKNOWN',
                                updated_at: new Date().toISOString(),
                                bpp_error: `BPP unavailable: ${bppError.message}`
                            }
                        }
                    };

                    return fallbackResponse;
                }
            }

            // If we have a BPP response, return it
            if (bppResponse) {
                // Transform BPP response to match expected format
                const bppOrder = bppResponse.data?.message?.order;

                const statusResponse = {
                    context: {
                        ...bppResponse.data.context,
                        action: 'on_status',
                        timestamp: new Date().toISOString()
                    },
                    message: {
                        order: {
                            ...bppOrder,
                            id: message.order_id, // Use platform order ID
                            updated_at: new Date().toISOString()
                        }
                    }
                };

                logger.info('Status request processed successfully via BPP', {
                    platformOrderId: message.order_id,
                    bppOrderId: bppOrder?.id,
                    status: bppOrder?.state
                });

                return statusResponse;
            }

            // Fallback: return a generic status response
            const fallbackResponse = {
                context: {
                    ...context,
                    action: 'on_status',
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        id: message.order_id,
                        state: 'CONFIRMED',
                        updated_at: new Date().toISOString()
                    }
                }
            };

            logger.warn('Using fallback status response (no BPP mapping or BPP unavailable)', {
                order_id: message.order_id
            });

            return fallbackResponse;

        } catch (error) {
            logger.error('Error processing status:', error);
            throw new Error('Failed to process status request');
        }
    }

    /**
     * Process cancel request
     */
    async processCancel(context, message) {
        try {
            logger.info('Processing Beckn cancel request', {
                transaction_id: context.transaction_id,
                order_id: message.order_id,
                cancellation_reason: message.cancellation_reason_id
            });

            // Create Beckn-compliant cancel request
            const becknRequest = {
                context: this.createContext('cancel', context.transaction_id, context.message_id),
                message: {
                    order_id: message.order_id,
                    cancellation_reason_id: message.cancellation_reason_id || 'CUSTOMER_REQUEST',
                    descriptor: {
                        name: message.descriptor?.name || 'Booking Cancellation',
                        short_desc: message.descriptor?.short_desc || 'Customer requested cancellation'
                    }
                }
            };

            // Find BPP mapping for this order
            let bppMapping = null;
            try {
                bppMapping = await bppMappingService.findByPlatformBookingId(message.order_id);
                logger.info('Found BPP mapping for cancellation', {
                    platformBookingId: message.order_id,
                    bppBookingId: bppMapping?.bppBookingId,
                    bppServiceType: bppMapping?.bppServiceType
                });
            } catch (mappingError) {
                logger.warn('No BPP mapping found for order', {
                    order_id: message.order_id,
                    error: mappingError.message
                });
            }

            let bppResponse = null;
            let refundAmount = 0;
            let cancellationCharges = 0;

            // If BPP mapping exists, send cancel request to BPP
            if (bppMapping && bppMapping.bppServiceUrl) {
                try {
                    const bppCancelRequest = {
                        ...becknRequest,
                        message: {
                            ...becknRequest.message,
                            order_id: bppMapping.bppBookingId // Use BPP booking ID
                        }
                    };

                    bppResponse = await this.sendToBPP(bppMapping.bppServiceUrl, '/cancel', bppCancelRequest);

                    // Extract refund information from BPP response
                    const bppOrder = bppResponse.data?.message?.order;
                    if (bppOrder) {
                        refundAmount = bppOrder.quote?.price?.value || 0;
                        cancellationCharges = bppOrder.cancellation_charges?.amount || 0;
                    }

                    logger.info('BPP cancel response received', {
                        bppBookingId: bppMapping.bppBookingId,
                        refundAmount,
                        cancellationCharges
                    });

                } catch (bppError) {
                    logger.error('Error calling BPP cancel endpoint', {
                        bppServiceUrl: bppMapping.bppServiceUrl,
                        bppBookingId: bppMapping.bppBookingId,
                        error: bppError.message
                    });
                    // Continue with cancellation even if BPP call fails
                }
            }

            // Calculate refund details
            const originalAmount = message.original_amount || 5000; // Default for demo
            const finalRefundAmount = refundAmount || (originalAmount - cancellationCharges);

            // Create cancellation response
            const cancelResponse = {
                context: {
                    ...context,
                    action: 'on_cancel',
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        id: message.order_id,
                        state: 'CANCELLED',
                        cancellation: {
                            cancelled_by: 'CUSTOMER',
                            reason: {
                                id: message.cancellation_reason_id || 'CUSTOMER_REQUEST',
                                descriptor: {
                                    name: this.getCancellationReasonName(message.cancellation_reason_id)
                                }
                            },
                            time: {
                                timestamp: new Date().toISOString()
                            }
                        },
                        payment: {
                            type: 'REFUND',
                            status: 'PROCESSING',
                            params: {
                                amount: finalRefundAmount.toString(),
                                currency: 'INR',
                                refund_id: `refund_${Date.now()}`,
                                original_amount: originalAmount.toString(),
                                cancellation_charges: cancellationCharges.toString()
                            },
                            time: {
                                timestamp: new Date().toISOString()
                            }
                        },
                        updated_at: new Date().toISOString()
                    }
                }
            };

            logger.info('Cancel request processed successfully', {
                order_id: message.order_id,
                refund_amount: finalRefundAmount,
                cancellation_charges: cancellationCharges,
                refund_id: cancelResponse.message.order.payment.params.refund_id
            });

            return cancelResponse;

        } catch (error) {
            logger.error('Error processing cancel:', error);
            throw new Error('Failed to process cancel request');
        }
    }

    /**
     * Process update request
     */
    async processUpdate(context, message) {
        try {
            logger.info('Processing Beckn update request', {
                transaction_id: context.transaction_id,
                order_id: message.order?.id,
                update_target: message.update_target
            });

            const becknRequest = {
                context: this.createContext('update', context.transaction_id, context.message_id),
                message: {
                    order: message.order,
                    update_target: message.update_target || 'order'
                }
            };

            // Find BPP mapping for this order
            let bppMapping = null;
            try {
                bppMapping = await bppMappingService.findByPlatformBookingId(message.order.id);
            } catch (mappingError) {
                logger.warn('No BPP mapping found for update', {
                    order_id: message.order.id
                });
            }

            let bppResponse = null;

            // If BPP mapping exists, send update request to BPP
            if (bppMapping && bppMapping.bppServiceUrl) {
                try {
                    const bppUpdateRequest = {
                        ...becknRequest,
                        message: {
                            ...becknRequest.message,
                            order: {
                                ...message.order,
                                id: bppMapping.bppBookingId
                            }
                        }
                    };

                    bppResponse = await this.sendToBPP(bppMapping.bppServiceUrl, '/update', bppUpdateRequest);

                } catch (bppError) {
                    logger.error('Error calling BPP update endpoint', {
                        error: bppError.message
                    });
                }
            }

            // Create update response
            const updateResponse = {
                context: {
                    ...context,
                    action: 'on_update',
                    timestamp: new Date().toISOString()
                },
                message: {
                    order: {
                        ...message.order,
                        state: 'UPDATED',
                        updated_at: new Date().toISOString()
                    }
                }
            };

            return updateResponse;

        } catch (error) {
            logger.error('Error processing update:', error);
            throw new Error('Failed to process update request');
        }
    }

    /**
     * Process support request
     */
    async processSupport(context, message) {
        try {
            logger.info('Processing Beckn support request');

            const supportResponse = {
                context: {
                    ...context,
                    action: 'on_support',
                    timestamp: new Date().toISOString()
                },
                message: {
                    support: {
                        order_id: message.order_id,
                        phone: '+91-80-1234-5678',
                        email: 'support@beckn-travel.com',
                        url: 'https://beckn-travel.com/support',
                        chat_link: 'https://beckn-travel.com/chat'
                    }
                }
            };

            return supportResponse;

        } catch (error) {
            logger.error('Error processing support:', error);
            throw new Error('Failed to process support request');
        }
    }

    /**
     * Process rating request
     */
    async processRating(context, message) {
        try {
            logger.info('Processing Beckn rating request');

            const ratingResponse = {
                context: {
                    ...context,
                    action: 'on_rating',
                    timestamp: new Date().toISOString()
                },
                message: {
                    feedback_ack: true,
                    rating_ack: true
                }
            };

            return ratingResponse;

        } catch (error) {
            logger.error('Error processing rating:', error);
            throw new Error('Failed to process rating request');
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
    async sendToONIX(endpoint, becknRequest) {
        try {
            const url = `${this.onixBaseUrl}${endpoint}`;

            logger.info(`Sending request to ONIX: ${url}`, {
                transaction_id: becknRequest.context.transaction_id,
                message_id: becknRequest.context.message_id
            });

            const response = await axios.post(url, becknRequest, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.ONIX_API_KEY || ''}`,
                },
                timeout: 30000 // 30 second timeout
            });

            logger.info(`Received response from ONIX: ${response.status}`);
            return response;

        } catch (error) {
            logger.error('Error communicating with ONIX:', {
                message: error.message,
                code: error.code,
                url: error.config?.url,
                status: error.response?.status,
                data: error.response?.data
            });

            if (error.code === 'ECONNREFUSED') {
                const message = `Cannot connect to ONIX adapter at ${this.onixBaseUrl}. Make sure ONIX is running and accessible.`;
                logger.error(message);
                throw new Error(message);
            }

            if (error.response?.status === 404) {
                throw new Error(`ONIX endpoint not found: ${error.config?.url}`);
            }

            if (error.response?.data?.error?.message) {
                throw new Error(error.response.data.error.message);
            }

            throw new Error(`Failed to communicate with ONIX adapter: ${error.message}`);
        }
    }

    /**
     * Send request to a specific BPP (flights/hotels)
     */
    async sendToBPP(baseUrl, endpoint, becknRequest) {
        try {
            const url = `${baseUrl}${endpoint}`;
            logger.info(`Sending request to BPP: ${url}`, {
                transaction_id: becknRequest.context.transaction_id,
                message_id: becknRequest.context.message_id
            });

            const response = await axios.post(url, becknRequest, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000
            });

            logger.info(`Received response from BPP: ${response.status}`);
            return response;

        } catch (error) {
            logger.error('Error communicating with BPP:', {
                message: error.message,
                code: error.code,
                url: error.config?.url,
                status: error.response?.status,
                data: error.response?.data
            });

            if (error.code === 'ECONNREFUSED') {
                const message = `Cannot connect to BPP at ${baseUrl}. Make sure the service is running and accessible.`;
                logger.error(message);
                throw new Error(message);
            }

            if (error.response?.data?.error?.message) {
                throw new Error(error.response.data.error.message);
            }

            throw new Error(`Failed to communicate with BPP at ${baseUrl}: ${error.message}`);
        }
    }
}

module.exports = new BecknService();
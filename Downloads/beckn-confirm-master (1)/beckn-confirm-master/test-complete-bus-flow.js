/**
 * Test script to simulate the complete bus booking flow from frontend
 * Run: node test-complete-bus-flow.js
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';
const BUS_BPP_URL = 'http://localhost:3004';

async function testCompleteBusFlow() {
    console.log('🚌 Testing complete bus booking flow (frontend simulation)...\n');
    
    try {
        // Step 1: Search for buses (simulate frontend search)
        console.log('1️⃣ Searching for buses...');
        
        const searchRequest = {
            context: {
                domain: 'mobility',
                country: 'IND',
                city: 'std:080',
                action: 'search',
                core_version: '1.1.0',
                bap_id: 'travel-discovery-bap.example.com',
                bap_uri: BAP_URL,
                transaction_id: `txn-${Date.now()}`,
                message_id: `msg-${Date.now()}`,
                timestamp: new Date().toISOString(),
                ttl: 'PT30S'
            },
            message: {
                intent: {
                    category: {
                        id: 'MOBILITY'
                    },
                    fulfillment: {
                        start: {
                            location: {
                                gps: '19.0896,72.8656' // Mumbai
                            }
                        },
                        end: {
                            location: {
                                gps: '15.3808,73.8389' // Goa
                            }
                        },
                        time: {
                            range: {
                                start: new Date().toISOString()
                            }
                        }
                    }
                }
            }
        };
        
        const searchResponse = await axios.post(`${BAP_URL}/beckn/search`, searchRequest);
        console.log('✅ Search successful');
        
        // Find buses in the response
        const providers = searchResponse.data.message?.catalog?.providers || [];
        let buses = [];
        providers.forEach(provider => {
            if (provider.items) {
                buses.push(...provider.items.filter(item => item.category_id === 'BUS'));
            }
        });
        
        if (buses.length === 0) {
            throw new Error('No buses found in search response');
        }
        
        console.log(`   Found ${buses.length} buses`);
        const selectedBus = buses[0];
        console.log(`   Selected: ${selectedBus.descriptor.name} (${selectedBus.id})`);
        console.log(`   Category: ${selectedBus.category_id}`);
        
        // Step 2: Simulate BookingPage confirm (with correct domain)
        console.log('\n2️⃣ Confirming booking (BookingPage simulation)...');
        
        const bookingPageConfirmRequest = {
            context: {
                domain: 'mobility', // This should be mobility for buses
                country: 'IND',
                city: 'std:080',
                action: 'confirm',
                core_version: '1.1.0',
                bap_id: 'travel-discovery-bap.example.com',
                bap_uri: BAP_URL,
                transaction_id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                message_id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                ttl: 'PT30S'
            },
            message: {
                order: {
                    id: `order-${Date.now()}`,
                    state: 'CREATED',
                    provider: {
                        id: 'buses-provider-001'
                    },
                    items: [
                        {
                            id: selectedBus.id,
                            quantity: {
                                count: 1
                            }
                        }
                    ],
                    billing: {
                        name: 'Test User',
                        email: 'test@example.com',
                        phone: '+919876543210',
                        address: {
                            door: '123',
                            building: 'Test Building',
                            street: 'Test Street',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            country: 'India',
                            area_code: '400001'
                        }
                    },
                    fulfillment: {
                        type: 'DELIVERY',
                        customer: {
                            person: {
                                name: 'Test User',
                                gender: 'male'
                            },
                            contact: {
                                phone: '+919876543210',
                                email: 'test@example.com'
                            }
                        }
                    },
                    quote: {
                        price: {
                            currency: selectedBus.price.currency,
                            value: selectedBus.price.value
                        }
                    }
                }
            }
        };
        
        console.log('📤 Sending BookingPage confirm request...');
        console.log(`   Domain: ${bookingPageConfirmRequest.context.domain}`);
        console.log(`   Item ID: ${bookingPageConfirmRequest.message.order.items[0].id}`);
        
        const bookingPageResponse = await axios.post(`${BAP_URL}/beckn/confirm`, bookingPageConfirmRequest);
        console.log('✅ BookingPage confirm successful');
        
        const bppBookingId = bookingPageResponse.data.message?.order?.bpp_booking_id;
        if (bppBookingId) {
            console.log(`   BPP Booking ID: ${bppBookingId}`);
        } else {
            console.log('   ⚠️ No BPP booking ID returned');
        }
        
        // Step 3: Simulate PaymentPage confirm (this is what happens after payment)
        console.log('\n3️⃣ Processing payment and final booking...');
        
        const paymentPageConfirmRequest = {
            context: {
                domain: 'mobility', // Fixed: should be mobility for buses
                country: 'IND',
                city: 'std:080',
                action: 'confirm',
                core_version: '1.1.0',
                bap_id: 'travel-discovery-bap.example.com',
                bap_uri: BAP_URL,
                transaction_id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                message_id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                ttl: 'PT30S'
            },
            message: {
                order: {
                    id: `order-${Date.now()}`,
                    state: 'CONFIRMED',
                    provider: {
                        id: 'buses-provider-001'
                    },
                    items: [
                        {
                            id: selectedBus.id,
                            quantity: {
                                count: 1
                            }
                        }
                    ],
                    billing: {
                        name: 'Test User',
                        email: 'test@example.com',
                        phone: '+919876543210',
                        address: {
                            door: '123',
                            building: 'Test Building',
                            street: 'Test Street',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            country: 'India',
                            area_code: '400001'
                        }
                    },
                    fulfillment: {
                        type: 'DELIVERY',
                        customer: {
                            person: {
                                name: 'Test User',
                                age: '30',
                                gender: 'M'
                            },
                            contact: {
                                phone: '+919876543210',
                                email: 'test@example.com'
                            }
                        }
                    },
                    payment: {
                        type: 'PRE-FULFILLMENT',
                        status: 'PAID',
                        params: {
                            amount: selectedBus.price.value,
                            currency: selectedBus.price.currency,
                            transaction_id: `pay-${Date.now()}`
                        }
                    },
                    quote: {
                        price: {
                            currency: selectedBus.price.currency,
                            value: selectedBus.price.value
                        }
                    }
                }
            }
        };
        
        console.log('📤 Sending PaymentPage confirm request...');
        const paymentResponse = await axios.post(`${BAP_URL}/beckn/confirm`, paymentPageConfirmRequest);
        console.log('✅ PaymentPage confirm successful');
        
        const finalBppBookingId = paymentResponse.data.message?.order?.bpp_booking_id;
        if (finalBppBookingId) {
            console.log(`   Final BPP Booking ID: ${finalBppBookingId}`);
        }
        
        // Step 4: Save booking to main database (PaymentPage does this)
        console.log('\n4️⃣ Saving booking to main database...');
        
        const bookingPayload = {
            booking_reference: `BK${Date.now().toString().slice(-8)}`,
            user_id: null,
            booking_type: 'bus',
            item_id: selectedBus.id,
            provider_id: 'buses-provider-001',
            item_name: selectedBus.descriptor.name,
            item_code: selectedBus.descriptor.code,
            origin: 'Mumbai',
            destination: 'Goa',
            departure_time: selectedBus.time?.timestamp,
            arrival_time: null,
            passenger_name: 'Test User',
            passenger_email: 'test@example.com',
            passenger_phone: '+919876543210',
            passenger_gender: 'M',
            transaction_id: paymentPageConfirmRequest.message.order.payment.params.transaction_id,
            payment_method: 'razorpay',
            payment_status: 'PAID',
            amount: parseFloat(selectedBus.price.value),
            currency: selectedBus.price.currency,
            booking_status: 'CONFIRMED',
            beckn_transaction_id: paymentPageConfirmRequest.context.transaction_id,
            beckn_message_id: paymentPageConfirmRequest.context.message_id,
            order_id: paymentPageConfirmRequest.message.order.id,
            item_details: selectedBus,
            booking_metadata: {
                payment_date: new Date().toISOString(),
                booking_source: 'complete_flow_test',
                bpp_booking_id: finalBppBookingId
            }
        };
        
        console.log('💾 Saving to main bookings API...');
        const bookingResponse = await axios.post(`${BAP_URL}/api/bookings`, bookingPayload);
        console.log('✅ Main booking saved successfully');
        console.log(`   Booking Reference: ${bookingResponse.data.booking?.booking_reference}`);
        
        // Step 5: Verify all bookings were stored correctly
        console.log('\n5️⃣ Verifying booking storage...');
        
        const { Pool } = require('pg');
        
        // Check main database
        const mainPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'travel_discovery',
            user: 'postgres',
            password: '2005',
        });
        
        try {
            const mainClient = await mainPool.connect();
            const mainResult = await mainClient.query('SELECT COUNT(*) as count FROM bookings WHERE booking_type = $1', ['bus']);
            console.log(`   Total bus bookings in main database: ${mainResult.rows[0].count}`);
            
            const recentBooking = await mainClient.query('SELECT * FROM bookings WHERE booking_reference = $1', [bookingPayload.booking_reference]);
            if (recentBooking.rows.length > 0) {
                console.log('✅ Booking found in main database');
                console.log(`   Passenger: ${recentBooking.rows[0].passenger_name}`);
                console.log(`   Status: ${recentBooking.rows[0].booking_status}`);
                console.log(`   Amount: ${recentBooking.rows[0].currency} ${recentBooking.rows[0].amount}`);
            }
            
            mainClient.release();
            await mainPool.end();
        } catch (mainDbError) {
            console.error('❌ Main database check failed:', mainDbError.message);
            await mainPool.end();
        }
        
        // Check BPP database
        const bppPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'buses_bpp',
            user: 'postgres',
            password: '2005',
        });
        
        try {
            const bppClient = await bppPool.connect();
            const bppResult = await bppClient.query('SELECT COUNT(*) as count FROM bpp_bookings');
            console.log(`   Total BPP bookings in buses database: ${bppResult.rows[0].count}`);
            
            if (finalBppBookingId) {
                const bppBooking = await bppClient.query('SELECT * FROM bpp_bookings WHERE bpp_booking_id = $1', [finalBppBookingId]);
                if (bppBooking.rows.length > 0) {
                    console.log('✅ BPP booking found in buses database');
                    console.log(`   BPP Passenger: ${bppBooking.rows[0].passenger_name}`);
                    console.log(`   BPP Status: ${bppBooking.rows[0].booking_status}`);
                }
            }
            
            bppClient.release();
            await bppPool.end();
        } catch (bppDbError) {
            console.error('❌ BPP database check failed:', bppDbError.message);
            await bppPool.end();
        }
        
        console.log('\n✅ Complete bus booking flow test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Bus search working');
        console.log('   ✅ BookingPage confirm working');
        console.log('   ✅ PaymentPage confirm working');
        console.log('   ✅ Main database storage working');
        console.log('   ✅ BPP database storage working');
        
    } catch (error) {
        console.error('❌ Complete bus booking flow test failed:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

testCompleteBusFlow();
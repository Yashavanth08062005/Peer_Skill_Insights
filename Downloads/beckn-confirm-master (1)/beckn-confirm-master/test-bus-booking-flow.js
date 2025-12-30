/**
 * Test script to simulate a complete bus booking flow
 * Run: node test-bus-booking-flow.js
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';
const BUS_BPP_URL = 'http://localhost:3004';

async function testBusBookingFlow() {
    console.log('🚌 Testing complete bus booking flow...\n');
    
    try {
        // Step 1: Test bus search
        console.log('1️⃣ Testing bus search...');
        
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
        
        const searchResponse = await axios.post(`${BUS_BPP_URL}/search`, searchRequest);
        console.log('✅ Bus search successful');
        
        const buses = searchResponse.data.message?.catalog?.providers?.[0]?.items || [];
        if (buses.length === 0) {
            throw new Error('No buses found in search response');
        }
        
        console.log(`   Found ${buses.length} buses`);
        const selectedBus = buses[0];
        console.log(`   Selected bus: ${selectedBus.descriptor.name} (${selectedBus.id})`);
        
        // Step 2: Test bus confirm (simulate booking)
        console.log('\n2️⃣ Testing bus booking confirmation...');
        
        const confirmRequest = {
            context: {
                ...searchRequest.context,
                action: 'confirm',
                message_id: `msg-${Date.now()}`,
                timestamp: new Date().toISOString()
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
                        name: 'Test Passenger',
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
                                name: 'Test Passenger',
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
        
        const confirmResponse = await axios.post(`${BUS_BPP_URL}/confirm`, confirmRequest);
        console.log('✅ Bus booking confirmation successful');
        
        const bppBookingId = confirmResponse.data.message?.order?.bpp_booking_id;
        if (bppBookingId) {
            console.log(`   BPP Booking ID: ${bppBookingId}`);
        } else {
            console.log('   ⚠️ No BPP booking ID returned');
        }
        
        // Step 3: Test main booking API
        console.log('\n3️⃣ Testing main booking API...');
        
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
            passenger_name: 'Test Passenger',
            passenger_email: 'test@example.com',
            passenger_phone: '+919876543210',
            passenger_gender: 'M',
            transaction_id: `pay-${Date.now()}`,
            payment_method: 'razorpay',
            payment_status: 'PAID',
            amount: parseFloat(selectedBus.price.value),
            currency: selectedBus.price.currency,
            booking_status: 'CONFIRMED',
            beckn_transaction_id: confirmRequest.context.transaction_id,
            beckn_message_id: confirmRequest.context.message_id,
            order_id: confirmRequest.message.order.id,
            item_details: selectedBus,
            booking_metadata: {
                payment_date: new Date().toISOString(),
                booking_source: 'test',
                bpp_booking_id: bppBookingId
            }
        };
        
        try {
            const bookingResponse = await axios.post(`${BAP_URL}/api/bookings`, bookingPayload);
            console.log('✅ Main booking API successful');
            console.log(`   Booking Reference: ${bookingResponse.data.booking?.booking_reference}`);
        } catch (bookingError) {
            console.error('❌ Main booking API failed:', bookingError.response?.data || bookingError.message);
        }
        
        // Step 4: Verify BPP booking was created
        console.log('\n4️⃣ Verifying BPP booking storage...');
        
        const { Pool } = require('pg');
        const pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'buses_bpp',
            user: 'postgres',
            password: '2005',
        });
        
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT COUNT(*) as count FROM bpp_bookings');
            console.log(`   BPP bookings in database: ${result.rows[0].count}`);
            
            if (bppBookingId) {
                const bookingResult = await client.query('SELECT * FROM bpp_bookings WHERE bpp_booking_id = $1', [bppBookingId]);
                if (bookingResult.rows.length > 0) {
                    console.log('✅ BPP booking found in database');
                    console.log(`   Passenger: ${bookingResult.rows[0].passenger_name}`);
                    console.log(`   Status: ${bookingResult.rows[0].booking_status}`);
                } else {
                    console.log('❌ BPP booking not found in database');
                }
            }
            
            client.release();
            await pool.end();
        } catch (dbError) {
            console.error('❌ Database verification failed:', dbError.message);
            await pool.end();
        }
        
        console.log('\n✅ Bus booking flow test completed!');
        
    } catch (error) {
        console.error('❌ Bus booking flow test failed:', error.message);
        if (error.response) {
            console.error('   Response data:', error.response.data);
        }
    }
}

testBusBookingFlow();
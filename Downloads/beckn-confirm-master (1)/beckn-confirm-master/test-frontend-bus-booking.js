/**
 * Test script to simulate frontend bus booking flow
 * Run: node test-frontend-bus-booking.js
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';

async function testFrontendBusBooking() {
    console.log('🚌 Testing frontend bus booking flow...\n');
    
    try {
        // Step 1: Simulate frontend search (this would come from the search page)
        console.log('1️⃣ Simulating bus search from frontend...');
        
        // This simulates what the frontend would get from a search
        const mockBusItem = {
            id: 'bus-7',
            descriptor: {
                name: 'Kadamba Transport',
                code: 'KT001',
                short_desc: 'AC Sleeper'
            },
            price: {
                currency: 'INR',
                value: '1200.00'
            },
            category_id: 'BUS',
            providerId: 'buses-provider-001',
            origin: 'Mumbai',
            destination: 'Goa',
            time: {
                timestamp: new Date().toISOString()
            },
            details: {
                name: 'Kadamba Transport',
                code: 'KT001',
                origin: 'Mumbai',
                destination: 'Goa',
                departureTime: new Date().toISOString()
            }
        };
        
        console.log('✅ Mock bus item created');
        console.log(`   Bus: ${mockBusItem.descriptor.name} (${mockBusItem.id})`);
        console.log(`   Price: ${mockBusItem.price.currency} ${mockBusItem.price.value}`);
        
        // Step 2: Simulate frontend confirm request (this is what PaymentPage.jsx sends)
        console.log('\n2️⃣ Simulating frontend confirm request...');
        
        const confirmRequest = {
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
                    state: 'CONFIRMED',
                    provider: {
                        id: mockBusItem.providerId || 'provider-001'
                    },
                    items: [
                        {
                            id: mockBusItem.id,
                            quantity: {
                                count: 1
                            }
                        }
                    ],
                    billing: {
                        name: 'Test Frontend User',
                        email: 'frontend@example.com',
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
                                name: 'Test Frontend User',
                                age: '30',
                                gender: 'M'
                            },
                            contact: {
                                phone: '+919876543210',
                                email: 'frontend@example.com'
                            }
                        }
                    },
                    payment: {
                        type: 'PRE-FULFILLMENT',
                        status: 'PAID',
                        params: {
                            amount: mockBusItem.price.value,
                            currency: mockBusItem.price.currency,
                            transaction_id: `pay-${Date.now()}`
                        }
                    },
                    quote: {
                        price: {
                            currency: mockBusItem.price.currency,
                            value: mockBusItem.price.value
                        }
                    }
                }
            }
        };
        
        console.log('📤 Sending confirm request to BAP...');
        console.log(`   Transaction ID: ${confirmRequest.context.transaction_id}`);
        console.log(`   Order ID: ${confirmRequest.message.order.id}`);
        console.log(`   Item ID: ${confirmRequest.message.order.items[0].id}`);
        
        const confirmResponse = await axios.post(`${BAP_URL}/beckn/confirm`, confirmRequest);
        console.log('✅ BAP confirm response received');
        
        const bppBookingId = confirmResponse.data.message?.order?.bpp_booking_id;
        if (bppBookingId) {
            console.log(`   BPP Booking ID: ${bppBookingId}`);
        } else {
            console.log('   ⚠️ No BPP booking ID in response');
        }
        
        // Step 3: Simulate frontend booking API call (this is what PaymentPage.jsx does after confirm)
        console.log('\n3️⃣ Simulating frontend booking API call...');
        
        const bookingPayload = {
            booking_reference: `BK${Date.now().toString().slice(-8)}`,
            user_id: null,
            booking_type: 'bus',
            item_id: mockBusItem.id,
            provider_id: mockBusItem.providerId || 'provider-001',
            item_name: mockBusItem.descriptor.name,
            item_code: mockBusItem.descriptor.code,
            origin: mockBusItem.origin,
            destination: mockBusItem.destination,
            departure_time: mockBusItem.time?.timestamp,
            arrival_time: null,
            passenger_name: 'Test Frontend User',
            passenger_email: 'frontend@example.com',
            passenger_phone: '+919876543210',
            passenger_gender: 'M',
            transaction_id: confirmRequest.message.order.payment.params.transaction_id,
            payment_method: 'razorpay',
            payment_status: 'PAID',
            amount: parseFloat(mockBusItem.price.value),
            currency: mockBusItem.price.currency,
            booking_status: 'CONFIRMED',
            beckn_transaction_id: confirmRequest.context.transaction_id,
            beckn_message_id: confirmRequest.context.message_id,
            order_id: confirmRequest.message.order.id,
            item_details: mockBusItem,
            booking_metadata: {
                payment_date: new Date().toISOString(),
                booking_source: 'frontend_test',
                bpp_booking_id: bppBookingId
            }
        };
        
        console.log('💾 Sending booking to main API...');
        console.log(`   Booking Reference: ${bookingPayload.booking_reference}`);
        console.log(`   Booking Type: ${bookingPayload.booking_type}`);
        
        const bookingResponse = await axios.post(`${BAP_URL}/api/bookings`, bookingPayload);
        console.log('✅ Main booking API successful');
        console.log(`   Saved Booking Reference: ${bookingResponse.data.booking?.booking_reference}`);
        
        // Step 4: Verify the booking was stored
        console.log('\n4️⃣ Verifying booking storage...');
        
        const { Pool } = require('pg');
        
        // Check main bookings table
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
            console.log(`   Bus bookings in main database: ${mainResult.rows[0].count}`);
            
            const recentBooking = await mainClient.query('SELECT * FROM bookings WHERE booking_reference = $1', [bookingPayload.booking_reference]);
            if (recentBooking.rows.length > 0) {
                console.log('✅ Booking found in main database');
                console.log(`   Passenger: ${recentBooking.rows[0].passenger_name}`);
                console.log(`   Status: ${recentBooking.rows[0].booking_status}`);
                console.log(`   Amount: ${recentBooking.rows[0].currency} ${recentBooking.rows[0].amount}`);
            } else {
                console.log('❌ Booking not found in main database');
            }
            
            mainClient.release();
            await mainPool.end();
        } catch (mainDbError) {
            console.error('❌ Main database verification failed:', mainDbError.message);
            await mainPool.end();
        }
        
        // Check BPP bookings table
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
            console.log(`   BPP bookings in buses database: ${bppResult.rows[0].count}`);
            
            if (bppBookingId) {
                const bppBooking = await bppClient.query('SELECT * FROM bpp_bookings WHERE bpp_booking_id = $1', [bppBookingId]);
                if (bppBooking.rows.length > 0) {
                    console.log('✅ BPP booking found in buses database');
                    console.log(`   BPP Passenger: ${bppBooking.rows[0].passenger_name}`);
                    console.log(`   BPP Status: ${bppBooking.rows[0].booking_status}`);
                } else {
                    console.log('❌ BPP booking not found in buses database');
                }
            }
            
            bppClient.release();
            await bppPool.end();
        } catch (bppDbError) {
            console.error('❌ BPP database verification failed:', bppDbError.message);
            await bppPool.end();
        }
        
        console.log('\n✅ Frontend bus booking flow test completed!');
        
    } catch (error) {
        console.error('❌ Frontend bus booking flow test failed:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

testFrontendBusBooking();
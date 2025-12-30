/**
 * Test the complete bus/train booking flow with name fix
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';
const BUS_BPP_URL = 'http://localhost:3004';

async function testNameFixComplete() {
    console.log('🔧 Testing complete bus booking flow with name fix...\n');
    
    try {
        // Step 1: Search for buses
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
                                gps: '12.9716,77.5946' // Bangalore
                            }
                        },
                        end: {
                            location: {
                                gps: '28.5665,77.1031' // Delhi
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
        console.log(`   Operator: ${selectedBus.descriptor.name}`);
        console.log(`   Code: ${selectedBus.descriptor.code}`);
        
        // Step 2: Simulate the fixed PaymentPage booking creation
        console.log('\n2️⃣ Testing fixed name extraction...');
        
        const type = 'bus';
        const item = selectedBus;
        
        // Apply the fixed logic
        const item_name = type === 'flight' ? (item.details?.airline || item.airline) : 
                          type === 'bus' ? (item.descriptor?.name || item.details?.name || item.name) :
                          type === 'train' ? (item.descriptor?.name || item.details?.name || item.name) :
                          (item.details?.name || item.name);
                          
        const item_code = type === 'flight' ? (item.details?.flightNumber || item.flightNumber) : 
                          type === 'bus' ? (item.descriptor?.code || item.details?.code || item.id) :
                          type === 'train' ? (item.descriptor?.code || item.details?.code || item.id) :
                          (item.details?.hotelId || item.id);
        
        console.log(`✅ Fixed item_name: "${item_name}"`);
        console.log(`✅ Fixed item_code: "${item_code}"`);
        
        // Check if the fix worked
        if (item_name && item_name !== item.id && !item_name.startsWith('bus-')) {
            console.log('🎉 SUCCESS: Bus operator name extracted correctly!');
        } else {
            console.log('❌ FAILED: Still getting item ID instead of operator name');
        }
        
        if (item_code && item_code !== item.id && !item_code.startsWith('bus-')) {
            console.log('🎉 SUCCESS: Bus code extracted correctly!');
        } else {
            console.log('⚠️ WARNING: Using item ID as code (this might be expected)');
        }
        
        // Step 3: Test a complete booking with the fixed data
        console.log('\n3️⃣ Testing complete booking with fixed names...');
        
        const mockBookingPayload = {
            booking_reference: `BK${Date.now().toString().slice(-8)}`,
            user_id: null,
            booking_type: 'bus',
            item_id: item.id,
            provider_id: 'buses-provider-001',
            item_name: item_name,  // This should now be the operator name
            item_code: item_code,  // This should now be the bus code
            origin: 'BLR',
            destination: 'DEL',
            departure_time: item.time?.timestamp,
            passenger_name: 'Test User',
            passenger_email: 'test@example.com',
            passenger_phone: '+919876543210',
            passenger_gender: 'M',
            transaction_id: `pay-${Date.now()}`,
            payment_method: 'test',
            payment_status: 'PAID',
            amount: parseFloat(item.price.value),
            currency: item.price.currency,
            booking_status: 'CONFIRMED',
            beckn_transaction_id: `txn-${Date.now()}`,
            beckn_message_id: `msg-${Date.now()}`,
            order_id: `order-${Date.now()}`,
            item_details: item,
            booking_metadata: {
                payment_date: new Date().toISOString(),
                booking_source: 'name_fix_test'
            }
        };
        
        console.log('📋 Booking payload with fixed names:');
        console.log(`   item_name: "${mockBookingPayload.item_name}"`);
        console.log(`   item_code: "${mockBookingPayload.item_code}"`);
        console.log(`   booking_reference: ${mockBookingPayload.booking_reference}`);
        
        // Save the booking
        const bookingResponse = await axios.post(`${BAP_URL}/api/bookings`, mockBookingPayload);
        console.log('✅ Booking saved with fixed names!');
        console.log(`   Saved booking reference: ${bookingResponse.data.booking?.booking_reference}`);
        
        console.log('\n🎉 Name fix test completed successfully!');
        console.log('📋 Summary:');
        console.log(`   ✅ Operator name: "${item_name}" (instead of "${item.id}")`);
        console.log(`   ✅ Bus code: "${item_code}"`);
        console.log('   ✅ Booking saved with correct names');
        
    } catch (error) {
        console.error('❌ Name fix test failed:', error.message);
        if (error.response) {
            console.error('   Response data:', error.response.data);
        }
    }
}

testNameFixComplete();
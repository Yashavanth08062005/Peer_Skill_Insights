/**
 * Test the bookings API to see if it returns the correct data
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';

async function testBookingsApi() {
    console.log('🔍 Testing bookings API...\n');
    
    try {
        // Test the bookings API endpoint
        const response = await axios.get(`${BAP_URL}/api/bookings/email/yashavanthkate@gmal.com`);
        
        console.log('✅ Bookings API response received');
        console.log(`   Total bookings: ${response.data.count}`);
        
        if (response.data.bookings && response.data.bookings.length > 0) {
            console.log('\n📋 Recent bookings from API:');
            
            // Show the most recent 5 bookings
            const recentBookings = response.data.bookings.slice(0, 5);
            
            recentBookings.forEach((booking, index) => {
                console.log(`\n${index + 1}. ${booking.booking_reference}`);
                console.log(`   Type: ${booking.booking_type}`);
                console.log(`   Route: ${booking.origin || 'N/A'} → ${booking.destination || 'N/A'}`);
                console.log(`   Amount: ${booking.currency} ${booking.amount}`);
                console.log(`   Status: ${booking.booking_status}`);
                console.log(`   Created: ${booking.created_at}`);
                console.log(`   Item Name: ${booking.item_name || 'N/A'}`);
            });
            
            // Check specifically for bus bookings
            const busBookings = response.data.bookings.filter(b => b.booking_type === 'bus');
            console.log(`\n🚌 Bus bookings found: ${busBookings.length}`);
            
            if (busBookings.length > 0) {
                console.log('\n🚌 Bus bookings details:');
                busBookings.slice(0, 3).forEach((booking, index) => {
                    console.log(`\n${index + 1}. ${booking.booking_reference}`);
                    console.log(`   Route: ${booking.origin || 'N/A'} → ${booking.destination || 'N/A'}`);
                    console.log(`   Amount: ${booking.currency} ${booking.amount}`);
                    console.log(`   Created: ${booking.created_at}`);
                });
            }
            
        } else {
            console.log('❌ No bookings returned from API');
        }
        
    } catch (error) {
        console.error('❌ Error testing bookings API:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

testBookingsApi();
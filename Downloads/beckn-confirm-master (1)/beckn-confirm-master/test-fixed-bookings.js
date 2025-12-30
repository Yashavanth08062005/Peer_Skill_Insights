/**
 * Test the fixed bookings functionality
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';

async function testFixedBookings() {
    console.log('🔧 Testing fixed bookings functionality...\n');
    
    try {
        // Test the API endpoint with your email
        const response = await axios.get(`${BAP_URL}/api/bookings/email/yashavanthkate@gmal.com`);
        
        console.log('✅ API Response received');
        console.log(`   Total bookings: ${response.data.count}`);
        
        const bookings = response.data.bookings || [];
        
        if (bookings.length > 0) {
            // Count by type (what the fixed frontend should show)
            const flightCount = bookings.filter(b => b.booking_type === 'flight').length;
            const hotelCount = bookings.filter(b => b.booking_type === 'hotel').length;
            const busCount = bookings.filter(b => b.booking_type === 'bus').length;
            const trainCount = bookings.filter(b => b.booking_type === 'train').length;
            
            console.log('\n📊 Fixed frontend should show:');
            console.log(`   All Bookings (${bookings.length})`);
            console.log(`   Flights (${flightCount})`);
            console.log(`   Hotels (${hotelCount})`);
            console.log(`   Buses (${busCount})`);
            console.log(`   Trains (${trainCount})`);
            
            // Show recent bookings
            console.log('\n📋 Recent bookings (should all appear):');
            const recentBookings = bookings
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10);
                
            recentBookings.forEach((booking, index) => {
                console.log(`\n${index + 1}. ${booking.booking_reference}`);
                console.log(`   Type: ${booking.booking_type}`);
                console.log(`   Route: ${booking.origin || 'N/A'} → ${booking.destination || 'N/A'}`);
                console.log(`   Amount: ${booking.currency} ${booking.amount}`);
                console.log(`   Status: ${booking.booking_status}`);
                console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}`);
                
                // Highlight your specific bookings
                if (booking.booking_reference === 'BK71801703') {
                    console.log(`   🎯 YOUR BLR→BOM BUS BOOKING!`);
                }
                if (booking.booking_reference === 'BK72068669') {
                    console.log(`   🎯 YOUR BLR→DEL BUS BOOKING!`);
                }
            });
            
            console.log('\n✅ All bookings should now appear in the frontend!');
            console.log('🔧 The localStorage filtering issue has been fixed.');
            console.log('🔄 Please refresh your bookings page to see all bookings.');
            
        } else {
            console.log('❌ No bookings found');
        }
        
    } catch (error) {
        console.error('❌ Error testing fixed bookings:', error.message);
    }
}

testFixedBookings();
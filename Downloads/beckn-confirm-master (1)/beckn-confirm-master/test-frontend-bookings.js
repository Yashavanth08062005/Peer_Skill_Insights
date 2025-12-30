/**
 * Test what the frontend should see when fetching bookings
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';

async function testFrontendBookings() {
    console.log('🔍 Testing frontend bookings view...\n');
    
    try {
        // Test the exact endpoint the frontend uses
        const response = await axios.get(`${BAP_URL}/api/bookings/email/yashavanthkate@gmal.com`);
        
        console.log('✅ Bookings API response received');
        console.log(`   Total bookings: ${response.data.count}`);
        
        const bookings = response.data.bookings || [];
        
        // Filter bookings by type (like the frontend does)
        const allBookings = bookings.length;
        const flightBookings = bookings.filter(b => b.booking_type === 'flight').length;
        const hotelBookings = bookings.filter(b => b.booking_type === 'hotel').length;
        const busBookings = bookings.filter(b => b.booking_type === 'bus').length;
        const trainBookings = bookings.filter(b => b.booking_type === 'train').length;
        
        console.log('\n📊 Booking counts (what frontend should show):');
        console.log(`   All Bookings (${allBookings})`);
        console.log(`   Flights (${flightBookings})`);
        console.log(`   Hotels (${hotelBookings})`);
        console.log(`   Buses (${busBookings})`);
        console.log(`   Trains (${trainBookings})`);
        
        // Show the most recent bus bookings
        const recentBusBookings = bookings
            .filter(b => b.booking_type === 'bus')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
            
        console.log('\n🚌 Recent bus bookings (what should appear in Buses tab):');
        
        if (recentBusBookings.length === 0) {
            console.log('   ❌ No bus bookings found');
        } else {
            recentBusBookings.forEach((booking, index) => {
                console.log(`\n   ${index + 1}. ${booking.booking_reference}`);
                console.log(`      Route: ${booking.origin || 'N/A'} → ${booking.destination || 'N/A'}`);
                console.log(`      Amount: ${booking.currency} ${booking.amount}`);
                console.log(`      Status: ${booking.booking_status}`);
                console.log(`      Item Name: ${booking.item_name || 'N/A'}`);
                console.log(`      Created: ${new Date(booking.created_at).toLocaleString()}`);
                
                // Check if this is the BLR->BOM booking
                if (booking.origin === 'BLR' && booking.destination === 'BOM') {
                    console.log(`      🎯 THIS IS YOUR BLR->BOM BOOKING!`);
                }
            });
        }
        
        // Check for the specific booking reference
        const blrBomBooking = bookings.find(b => 
            b.booking_reference === 'BK71801703' || 
            (b.origin === 'BLR' && b.destination === 'BOM' && b.booking_type === 'bus')
        );
        
        if (blrBomBooking) {
            console.log('\n🎯 Found your BLR->BOM booking:');
            console.log(`   Reference: ${blrBomBooking.booking_reference}`);
            console.log(`   Type: ${blrBomBooking.booking_type}`);
            console.log(`   Route: ${blrBomBooking.origin} → ${blrBomBooking.destination}`);
            console.log(`   Amount: ${blrBomBooking.currency} ${blrBomBooking.amount}`);
            console.log(`   Status: ${blrBomBooking.booking_status}`);
            console.log(`   This booking SHOULD appear in your frontend!`);
        } else {
            console.log('\n❌ Could not find BLR->BOM booking in API response');
        }
        
    } catch (error) {
        console.error('❌ Error testing frontend bookings:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

testFrontendBookings();
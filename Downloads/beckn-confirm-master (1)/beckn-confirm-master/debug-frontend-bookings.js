/**
 * Debug script to understand why frontend is not showing all bookings
 */

const axios = require('axios');

const BAP_URL = 'http://localhost:8081';

async function debugFrontendBookings() {
    console.log('🔍 Debugging frontend bookings issue...\n');
    
    try {
        // Test the API endpoint the frontend uses
        const response = await axios.get(`${BAP_URL}/api/bookings/email/yashavanthkate@gmal.com`);
        
        console.log('✅ API Response received');
        console.log(`   Total bookings in API: ${response.data.count}`);
        
        const bookings = response.data.bookings || [];
        
        if (bookings.length > 0) {
            console.log('\n📋 All bookings from API:');
            bookings.slice(0, 10).forEach((booking, index) => {
                console.log(`\n${index + 1}. ID: ${booking.id} | Ref: ${booking.booking_reference}`);
                console.log(`   Type: ${booking.booking_type}`);
                console.log(`   Route: ${booking.origin || 'N/A'} → ${booking.destination || 'N/A'}`);
                console.log(`   Amount: ${booking.currency} ${booking.amount}`);
                console.log(`   Status: ${booking.booking_status}`);
                console.log(`   Created: ${booking.created_at}`);
            });
            
            // Check for specific booking types
            const flightBookings = bookings.filter(b => b.booking_type === 'flight');
            const hotelBookings = bookings.filter(b => b.booking_type === 'hotel');
            const busBookings = bookings.filter(b => b.booking_type === 'bus');
            const trainBookings = bookings.filter(b => b.booking_type === 'train');
            
            console.log('\n📊 Booking type breakdown:');
            console.log(`   Flights: ${flightBookings.length}`);
            console.log(`   Hotels: ${hotelBookings.length}`);
            console.log(`   Buses: ${busBookings.length}`);
            console.log(`   Trains: ${trainBookings.length}`);
            
            // Check if there are any null/undefined values that might cause filtering issues
            console.log('\n🔍 Checking for data quality issues:');
            
            const bookingsWithNullId = bookings.filter(b => !b.id);
            const bookingsWithNullType = bookings.filter(b => !b.booking_type);
            const bookingsWithNullStatus = bookings.filter(b => !b.booking_status);
            
            console.log(`   Bookings with null ID: ${bookingsWithNullId.length}`);
            console.log(`   Bookings with null type: ${bookingsWithNullType.length}`);
            console.log(`   Bookings with null status: ${bookingsWithNullStatus.length}`);
            
            if (bookingsWithNullId.length > 0) {
                console.log('   ⚠️ Found bookings with null IDs - this could cause filtering issues');
            }
            
            // Show the most recent bookings that should appear
            console.log('\n🎯 Most recent bookings (should appear in frontend):');
            const recentBookings = bookings
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);
                
            recentBookings.forEach((booking, index) => {
                console.log(`\n${index + 1}. ${booking.booking_reference} (ID: ${booking.id})`);
                console.log(`   Type: ${booking.booking_type}`);
                console.log(`   Status: ${booking.booking_status}`);
                console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}`);
            });
            
        } else {
            console.log('❌ No bookings returned from API');
        }
        
        // Also test the pratham@gmail.com endpoint (fallback)
        console.log('\n🔄 Testing fallback email (pratham@gmail.com)...');
        try {
            const fallbackResponse = await axios.get(`${BAP_URL}/api/bookings/email/pratham@gmail.com`);
            console.log(`   Fallback bookings: ${fallbackResponse.data.count}`);
            
            if (fallbackResponse.data.count > 0) {
                console.log('   ⚠️ Frontend might be using fallback data instead of your email');
            }
        } catch (fallbackError) {
            console.log('   No fallback bookings found');
        }
        
    } catch (error) {
        console.error('❌ Error debugging bookings:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

debugFrontendBookings();
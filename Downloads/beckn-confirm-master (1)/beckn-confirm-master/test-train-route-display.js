/**
 * Test train route display after fixing the origin/destination
 */

const { Pool } = require('pg');

async function testTrainRouteDisplay() {
    console.log('🚂 Testing train route display...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get the train booking
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (result.rows.length > 0) {
            const booking = result.rows[0];
            console.log('📋 Train booking details:');
            console.log(`   Booking Reference: ${booking.booking_reference}`);
            console.log(`   Train Name: ${booking.item_name}`);
            console.log(`   Train ID: ${booking.item_code}`);
            console.log(`   Origin: ${booking.origin}`);
            console.log(`   Destination: ${booking.destination}`);
            console.log(`   Route Display: ${booking.origin} → ${booking.destination}`);
            console.log(`   Status: ${booking.booking_status}`);
            console.log(`   Amount: ${booking.currency} ${booking.amount}`);
            
            // Test the route display format
            if (booking.origin && booking.destination) {
                console.log('\n✅ Route information is now available!');
                console.log(`   Frontend will show: ${booking.origin} → ${booking.destination}`);
            } else {
                console.log('\n❌ Route information is still missing');
            }
            
        } else {
            console.log('❌ No train bookings found');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error testing train route display:', error.message);
        await pool.end();
    }
}

testTrainRouteDisplay();
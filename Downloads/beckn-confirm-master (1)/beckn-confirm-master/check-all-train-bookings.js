/**
 * Check all train bookings to see which ones need fixing
 */

const { Pool } = require('pg');

async function checkAllTrainBookings() {
    console.log('🔍 Checking all train bookings...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get all train bookings
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            ORDER BY created_at DESC
        `);
        
        console.log(`📋 Found ${result.rows.length} train bookings:\n`);
        
        result.rows.forEach((booking, index) => {
            console.log(`${index + 1}. Booking Reference: ${booking.booking_reference}`);
            console.log(`   Item ID: ${booking.item_id}`);
            console.log(`   Item Name: ${booking.item_name}`);
            console.log(`   Origin: ${booking.origin}`);
            console.log(`   Destination: ${booking.destination}`);
            console.log(`   Route Display: ${booking.origin || 'null'} → ${booking.destination || 'null'}`);
            console.log(`   Created: ${booking.created_at}`);
            console.log(`   Status: ${booking.booking_status}`);
            
            // Check if this booking needs fixing
            if (!booking.origin || !booking.destination || booking.item_name === null || booking.item_name === 'null') {
                console.log(`   ⚠️  NEEDS FIXING: Missing ${!booking.origin ? 'origin ' : ''}${!booking.destination ? 'destination ' : ''}${(!booking.item_name || booking.item_name === 'null') ? 'name' : ''}`);
            } else {
                console.log(`   ✅ OK`);
            }
            console.log('');
        });
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking train bookings:', error.message);
        await pool.end();
    }
}

checkAllTrainBookings();
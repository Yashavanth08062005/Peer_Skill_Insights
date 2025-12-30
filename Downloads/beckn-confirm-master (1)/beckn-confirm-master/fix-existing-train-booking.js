/**
 * Fix existing train booking with correct origin and destination
 */

const { Pool } = require('pg');

async function fixTrainBooking() {
    console.log('🔧 Fixing existing train booking with correct route information...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get the train booking that has null origin/destination
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            AND (origin IS NULL OR destination IS NULL)
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (result.rows.length > 0) {
            const booking = result.rows[0];
            console.log('📋 Found train booking to fix:');
            console.log(`   Booking Reference: ${booking.booking_reference}`);
            console.log(`   Item ID: ${booking.item_id}`);
            console.log(`   Current Origin: ${booking.origin}`);
            console.log(`   Current Destination: ${booking.destination}`);
            
            // Based on the train ID (train-8-2a), this should be Rajdhani Express
            // From our train data: SBC → NZM (using city codes to fit database limit)
            let origin = 'BLR';  // Bangalore
            let destination = 'DEL';  // Delhi (NZM is in Delhi)
            
            // Map train routes based on item_id
            if (booking.item_id === 'train-8-2a') {
                origin = 'BLR';
                destination = 'DEL';
            }
            
            // Update the booking
            const updateResult = await client.query(`
                UPDATE bookings 
                SET origin = $1, destination = $2
                WHERE id = $3
                RETURNING *
            `, [origin, destination, booking.id]);
            
            console.log('\n✅ Updated booking:');
            console.log(`   New Origin: ${updateResult.rows[0].origin}`);
            console.log(`   New Destination: ${updateResult.rows[0].destination}`);
            console.log(`   Route display: ${updateResult.rows[0].origin} → ${updateResult.rows[0].destination}`);
            
        } else {
            console.log('❌ No train bookings found that need fixing');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error fixing train booking:', error.message);
        await pool.end();
    }
}

fixTrainBooking();
/**
 * Fix train name for existing booking
 */

const { Pool } = require('pg');

async function fixTrainName() {
    console.log('🔧 Fixing train name for existing booking...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get the train booking with null name
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            AND (item_name IS NULL OR item_name = 'null')
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (result.rows.length > 0) {
            const booking = result.rows[0];
            console.log('📋 Found train booking to fix:');
            console.log(`   Booking Reference: ${booking.booking_reference}`);
            console.log(`   Item ID: ${booking.item_id}`);
            console.log(`   Current Name: ${booking.item_name}`);
            
            // Map train IDs to names
            let trainName = 'Train Service';
            if (booking.item_id === 'train-8-2a') {
                trainName = 'Rajdhani Express';
            }
            
            // Update the booking
            const updateResult = await client.query(`
                UPDATE bookings 
                SET item_name = $1
                WHERE id = $2
                RETURNING *
            `, [trainName, booking.id]);
            
            console.log('\n✅ Updated booking:');
            console.log(`   New Name: ${updateResult.rows[0].item_name}`);
            console.log(`   Display: ${updateResult.rows[0].item_name} (${updateResult.rows[0].item_code})`);
            
        } else {
            console.log('❌ No train bookings found that need name fixing');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error fixing train name:', error.message);
        await pool.end();
    }
}

fixTrainName();
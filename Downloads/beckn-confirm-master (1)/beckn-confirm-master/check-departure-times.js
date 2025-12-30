/**
 * Check departure times in bookings to see which ones are showing N/A
 */

const { Pool } = require('pg');

async function checkDepartureTimes() {
    console.log('🕐 Checking departure times in bookings...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get recent bookings with departure time info
        const result = await client.query(`
            SELECT booking_reference, booking_type, item_name, departure_time, arrival_time, created_at
            FROM bookings 
            WHERE passenger_name = 'Yashavanth K' 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log(`📋 Recent bookings departure times:\n`);
        
        result.rows.forEach((booking, index) => {
            console.log(`${index + 1}. ${booking.booking_reference} (${booking.booking_type})`);
            console.log(`   Item: ${booking.item_name || 'N/A'}`);
            console.log(`   Departure: ${booking.departure_time || 'NULL'}`);
            console.log(`   Arrival: ${booking.arrival_time || 'NULL'}`);
            console.log(`   Created: ${booking.created_at}`);
            
            if (!booking.departure_time) {
                console.log(`   ⚠️  MISSING DEPARTURE TIME`);
            } else {
                console.log(`   ✅ Has departure time`);
            }
            console.log('');
        });
        
        // Count bookings with missing departure times
        const missingResult = await client.query(`
            SELECT booking_type, COUNT(*) as count
            FROM bookings 
            WHERE passenger_name = 'Yashavanth K' 
            AND departure_time IS NULL
            GROUP BY booking_type
        `);
        
        console.log('📊 Bookings with missing departure times:');
        if (missingResult.rows.length > 0) {
            missingResult.rows.forEach(row => {
                console.log(`   ${row.booking_type}: ${row.count} bookings`);
            });
        } else {
            console.log('   None found');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking departure times:', error.message);
        await pool.end();
    }
}

checkDepartureTimes();
/**
 * Check bookings in main database
 */

const { Pool } = require('pg');

async function checkMainBookings() {
    console.log('📋 Checking main database bookings...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check total bookings by type
        const typeResult = await client.query(`
            SELECT booking_type, COUNT(*) as count 
            FROM bookings 
            GROUP BY booking_type 
            ORDER BY booking_type
        `);
        
        console.log('📊 Bookings by type:');
        typeResult.rows.forEach(row => {
            console.log(`   ${row.booking_type}: ${row.count}`);
        });
        
        // Check recent bus bookings
        const busResult = await client.query(`
            SELECT booking_reference, passenger_name, booking_status, amount, currency, created_at
            FROM bookings 
            WHERE booking_type = 'bus' 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log('\n🚌 Recent bus bookings:');
        if (busResult.rows.length === 0) {
            console.log('   No bus bookings found');
        } else {
            busResult.rows.forEach(booking => {
                console.log(`   ${booking.booking_reference}: ${booking.passenger_name} - ${booking.currency} ${booking.amount} (${booking.booking_status}) - ${booking.created_at}`);
            });
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking main bookings:', error.message);
        await pool.end();
    }
}

checkMainBookings();
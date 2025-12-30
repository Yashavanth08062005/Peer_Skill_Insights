/**
 * Fix bus and hotel bookings with missing departure/check-in times
 */

const { Pool } = require('pg');

async function fixOtherDepartureTimes() {
    console.log('🕐 Fixing bus and hotel departure/check-in times...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get bus bookings with missing departure times
        const busResult = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'bus' 
            AND passenger_name = 'Yashavanth K' 
            AND departure_time IS NULL
            ORDER BY created_at DESC
        `);
        
        console.log(`📋 Found ${busResult.rows.length} bus bookings with missing departure times`);
        
        // Fix bus bookings with reasonable departure times
        for (const booking of busResult.rows) {
            // Set departure time to tomorrow at 6:00 AM
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(6, 0, 0, 0);
            
            const arrivalTime = new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000); // +8 hours for arrival
            
            await client.query(`
                UPDATE bookings 
                SET departure_time = $1, arrival_time = $2
                WHERE id = $3
            `, [tomorrow.toISOString(), arrivalTime.toISOString(), booking.id]);
            
            console.log(`   ✅ Fixed bus ${booking.booking_reference}: Dep ${tomorrow.toLocaleString()}`);
        }
        
        // Get hotel bookings with missing check-in dates
        const hotelResult = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'hotel' 
            AND passenger_name = 'Yashavanth K' 
            AND check_in_date IS NULL
            ORDER BY created_at DESC
        `);
        
        console.log(`📋 Found ${hotelResult.rows.length} hotel bookings with missing check-in dates`);
        
        // Fix hotel bookings with reasonable check-in/check-out dates
        for (const booking of hotelResult.rows) {
            // Set check-in to tomorrow and check-out to day after
            const checkIn = new Date();
            checkIn.setDate(checkIn.getDate() + 1);
            checkIn.setHours(14, 0, 0, 0); // 2:00 PM check-in
            
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + 2); // 2 nights stay
            checkOut.setHours(11, 0, 0, 0); // 11:00 AM check-out
            
            await client.query(`
                UPDATE bookings 
                SET check_in_date = $1, check_out_date = $2
                WHERE id = $3
            `, [checkIn.toISOString(), checkOut.toISOString(), booking.id]);
            
            console.log(`   ✅ Fixed hotel ${booking.booking_reference}: Check-in ${checkIn.toLocaleDateString()}`);
        }
        
        console.log(`\n✅ Fixed ${busResult.rows.length} bus and ${hotelResult.rows.length} hotel bookings!`);
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error fixing departure times:', error.message);
        await pool.end();
    }
}

fixOtherDepartureTimes();
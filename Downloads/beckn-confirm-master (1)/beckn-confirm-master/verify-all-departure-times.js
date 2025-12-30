/**
 * Verify all departure times are now properly set
 */

const { Pool } = require('pg');

async function verifyAllDepartureTimes() {
    console.log('✅ Verifying all departure times are fixed...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check recent bookings by type
        const types = ['train', 'bus', 'flight', 'hotel'];
        
        for (const type of types) {
            console.log(`📋 ${type.toUpperCase()} bookings:`);
            
            let query;
            if (type === 'hotel') {
                query = `
                    SELECT booking_reference, item_name, check_in_date, check_out_date 
                    FROM bookings 
                    WHERE booking_type = $1 AND passenger_name = 'Yashavanth K' 
                    ORDER BY created_at DESC 
                    LIMIT 3
                `;
            } else {
                query = `
                    SELECT booking_reference, item_name, departure_time, arrival_time 
                    FROM bookings 
                    WHERE booking_type = $1 AND passenger_name = 'Yashavanth K' 
                    ORDER BY created_at DESC 
                    LIMIT 3
                `;
            }
            
            const result = await client.query(query, [type]);
            
            if (result.rows.length > 0) {
                result.rows.forEach((booking, index) => {
                    if (type === 'hotel') {
                        const checkIn = booking.check_in_date ? new Date(booking.check_in_date).toLocaleDateString() : 'N/A';
                        const checkOut = booking.check_out_date ? new Date(booking.check_out_date).toLocaleDateString() : 'N/A';
                        console.log(`   ${index + 1}. ${booking.booking_reference}: ${booking.item_name || 'N/A'}`);
                        console.log(`      Check-in: ${checkIn}, Check-out: ${checkOut}`);
                    } else {
                        const depTime = booking.departure_time ? new Date(booking.departure_time).toLocaleString() : 'N/A';
                        const arrTime = booking.arrival_time ? new Date(booking.arrival_time).toLocaleString() : 'N/A';
                        console.log(`   ${index + 1}. ${booking.booking_reference}: ${booking.item_name || 'N/A'}`);
                        console.log(`      Departure: ${depTime}`);
                    }
                });
            } else {
                console.log(`   No ${type} bookings found`);
            }
            console.log('');
        }
        
        // Count any remaining issues
        const issuesResult = await client.query(`
            SELECT booking_type, COUNT(*) as count
            FROM bookings 
            WHERE passenger_name = 'Yashavanth K' 
            AND (
                (booking_type IN ('train', 'bus', 'flight') AND departure_time IS NULL) OR
                (booking_type = 'hotel' AND check_in_date IS NULL)
            )
            GROUP BY booking_type
        `);
        
        if (issuesResult.rows.length > 0) {
            console.log('⚠️  Remaining issues:');
            issuesResult.rows.forEach(row => {
                console.log(`   ${row.booking_type}: ${row.count} bookings still missing times`);
            });
        } else {
            console.log('🎉 All departure/check-in times are now properly set!');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error verifying departure times:', error.message);
        await pool.end();
    }
}

verifyAllDepartureTimes();
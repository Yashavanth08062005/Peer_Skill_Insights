/**
 * Fix train bookings with missing departure and arrival times
 */

const { Pool } = require('pg');

async function fixTrainDepartureTimes() {
    console.log('🕐 Fixing train departure and arrival times...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get train bookings with missing departure times
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            AND departure_time IS NULL
            ORDER BY created_at DESC
        `);
        
        console.log(`📋 Found ${result.rows.length} train bookings with missing departure times:\n`);
        
        // Train time mappings based on item_id
        const trainTimes = {
            'train-8-2a': { // Rajdhani Express (BLR to DEL)
                departure: '2026-01-02T04:57:56.000Z',
                arrival: '2026-01-03T14:57:56.000Z'
            },
            'train-3-2a': { // Shatabdi Express (BLR to MAA)
                departure: '2025-12-31T14:57:56.000Z',
                arrival: '2025-12-31T19:57:56.000Z'
            },
            'train-3-3a': { // Shatabdi Express (BLR to MAA)
                departure: '2025-12-31T14:57:56.000Z',
                arrival: '2025-12-31T19:57:56.000Z'
            },
            'train-2-cc': { // Vande Bharat Express (BLR to HYD)
                departure: '2025-12-31T18:57:56.000Z',
                arrival: '2025-12-31T20:57:56.000Z'
            },
            'train-4': { // Vande Bharat Express (BOM to GOI)
                departure: '2026-01-01T10:00:00.000Z',
                arrival: '2026-01-01T15:00:00.000Z'
            },
            'train-6': { // Duronto Express (BLR to DEL)
                departure: '2026-01-01T22:00:00.000Z',
                arrival: '2026-01-02T16:00:00.000Z'
            }
        };
        
        let fixedCount = 0;
        
        for (const booking of result.rows) {
            console.log(`Fixing: ${booking.booking_reference} (${booking.item_id})`);
            
            const times = trainTimes[booking.item_id];
            if (times) {
                // Update the booking with correct times
                const updateResult = await client.query(`
                    UPDATE bookings 
                    SET departure_time = $1, arrival_time = $2
                    WHERE id = $3
                    RETURNING *
                `, [times.departure, times.arrival, booking.id]);
                
                console.log(`   ✅ Updated: Dep ${times.departure}, Arr ${times.arrival}`);
                fixedCount++;
            } else {
                // Fallback for unknown train IDs
                const fallbackDep = new Date().toISOString();
                const fallbackArr = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(); // +5 hours
                
                await client.query(`
                    UPDATE bookings 
                    SET departure_time = $1, arrival_time = $2
                    WHERE id = $3
                `, [fallbackDep, fallbackArr, booking.id]);
                
                console.log(`   ⚠️  Fallback: Dep ${fallbackDep}, Arr ${fallbackArr}`);
                fixedCount++;
            }
        }
        
        console.log(`\n✅ Fixed ${fixedCount} train bookings with departure times!`);
        
        // Verify the fixes
        console.log('\n📋 Verification - Recent train bookings now:');
        const verifyResult = await client.query(`
            SELECT booking_reference, item_name, departure_time, arrival_time 
            FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        verifyResult.rows.forEach((booking, index) => {
            const depTime = booking.departure_time ? new Date(booking.departure_time).toLocaleString() : 'NULL';
            const arrTime = booking.arrival_time ? new Date(booking.arrival_time).toLocaleString() : 'NULL';
            console.log(`   ${index + 1}. ${booking.booking_reference}: ${booking.item_name}`);
            console.log(`      Dep: ${depTime}, Arr: ${arrTime}`);
        });
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error fixing train departure times:', error.message);
        await pool.end();
    }
}

fixTrainDepartureTimes();
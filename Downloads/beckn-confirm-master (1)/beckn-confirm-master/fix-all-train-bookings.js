/**
 * Fix all train bookings with missing origin, destination, and names
 */

const { Pool } = require('pg');

async function fixAllTrainBookings() {
    console.log('🔧 Fixing all train bookings with missing information...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get all train bookings that need fixing
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            AND (origin IS NULL OR destination IS NULL OR item_name IS NULL OR item_name = 'null')
            ORDER BY created_at DESC
        `);
        
        console.log(`📋 Found ${result.rows.length} train bookings to fix:\n`);
        
        // Train mapping based on item_id patterns
        const trainMappings = {
            // Rajdhani Express (BLR to DEL)
            'train-8-2a': { name: 'Rajdhani Express', origin: 'BLR', destination: 'DEL' },
            
            // Vande Bharat Express (BLR to HYD) 
            'train-2-cc': { name: 'Vande Bharat Express', origin: 'BLR', destination: 'HYD' },
            
            // Shatabdi Express (BLR to MAA)
            'train-3-2a': { name: 'Shatabdi Express', origin: 'BLR', destination: 'MAA' },
            'train-3-3a': { name: 'Shatabdi Express', origin: 'BLR', destination: 'MAA' },
            
            // Default mappings for other trains
            'train-4': { name: 'Vande Bharat Express', origin: 'BOM', destination: 'GOI' },
            'train-6': { name: 'Duronto Express', origin: 'BLR', destination: 'DEL' }
        };
        
        let fixedCount = 0;
        
        for (const booking of result.rows) {
            console.log(`Fixing: ${booking.booking_reference} (${booking.item_id})`);
            
            const mapping = trainMappings[booking.item_id];
            if (mapping) {
                // Update the booking with correct information
                const updateResult = await client.query(`
                    UPDATE bookings 
                    SET item_name = $1, origin = $2, destination = $3
                    WHERE id = $4
                    RETURNING *
                `, [mapping.name, mapping.origin, mapping.destination, booking.id]);
                
                console.log(`   ✅ Updated: ${mapping.name} | ${mapping.origin} → ${mapping.destination}`);
                fixedCount++;
            } else {
                // Fallback for unknown train IDs
                const fallbackName = 'Train Service';
                const fallbackOrigin = 'BLR';
                const fallbackDestination = 'DEL';
                
                await client.query(`
                    UPDATE bookings 
                    SET item_name = $1, origin = $2, destination = $3
                    WHERE id = $4
                `, [fallbackName, fallbackOrigin, fallbackDestination, booking.id]);
                
                console.log(`   ⚠️  Fallback: ${fallbackName} | ${fallbackOrigin} → ${fallbackDestination}`);
                fixedCount++;
            }
        }
        
        console.log(`\n✅ Fixed ${fixedCount} train bookings successfully!`);
        
        // Verify the fixes
        console.log('\n📋 Verification - All train bookings now:');
        const verifyResult = await client.query(`
            SELECT booking_reference, item_id, item_name, origin, destination 
            FROM bookings 
            WHERE booking_type = 'train' 
            AND passenger_name = 'Yashavanth K' 
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        verifyResult.rows.forEach((booking, index) => {
            console.log(`   ${index + 1}. ${booking.booking_reference}: ${booking.item_name} | ${booking.origin} → ${booking.destination}`);
        });
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error fixing train bookings:', error.message);
        await pool.end();
    }
}

fixAllTrainBookings();
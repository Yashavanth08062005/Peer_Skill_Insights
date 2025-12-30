/**
 * Fix origin and destination column length in bookings table
 */

const { Pool } = require('pg');

async function fixColumnLength() {
    console.log('🔧 Fixing origin and destination column length...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check current column definitions
        console.log('📋 Current column definitions:');
        const currentDef = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' 
            AND column_name IN ('origin', 'destination')
        `);
        
        currentDef.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type}(${row.character_maximum_length})`);
        });
        
        // Alter the columns to increase length
        console.log('\n🔄 Updating column lengths...');
        
        await client.query('ALTER TABLE bookings ALTER COLUMN origin TYPE VARCHAR(100)');
        console.log('✅ Updated origin column to VARCHAR(100)');
        
        await client.query('ALTER TABLE bookings ALTER COLUMN destination TYPE VARCHAR(100)');
        console.log('✅ Updated destination column to VARCHAR(100)');
        
        // Verify the changes
        console.log('\n📋 New column definitions:');
        const newDef = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' 
            AND column_name IN ('origin', 'destination')
        `);
        
        newDef.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type}(${row.character_maximum_length})`);
        });
        
        // Show current bookings with null origin/destination
        console.log('\n📋 Bookings with null origin/destination:');
        const nullBookings = await client.query(`
            SELECT booking_reference, booking_type, item_id, origin, destination, passenger_name
            FROM bookings 
            WHERE booking_type IN ('train', 'bus') 
            AND (origin IS NULL OR destination IS NULL)
            ORDER BY created_at DESC
        `);
        
        if (nullBookings.rows.length > 0) {
            nullBookings.rows.forEach(booking => {
                console.log(`   ${booking.booking_reference} (${booking.booking_type}): ${booking.origin} → ${booking.destination}`);
            });
        } else {
            console.log('   No bookings found with null origin/destination');
        }
        
        client.release();
        await pool.end();
        
        console.log('\n✅ Column length fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing column length:', error.message);
        await pool.end();
    }
}

fixColumnLength();
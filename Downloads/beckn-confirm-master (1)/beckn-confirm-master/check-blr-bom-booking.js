/**
 * Check for BLR->BOM bus booking
 */

const { Pool } = require('pg');

async function checkBlrBomBooking() {
    console.log('🔍 Checking for BLR->BOM bus booking...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check for BLR->BOM bookings
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE passenger_name = 'Yashavanth K' 
            AND booking_type = 'bus'
            AND (origin ILIKE '%BLR%' OR origin ILIKE '%Bangalore%')
            AND (destination ILIKE '%BOM%' OR destination ILIKE '%Mumbai%')
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log(`Found ${result.rows.length} BLR->BOM bus bookings:`);
        
        if (result.rows.length > 0) {
            result.rows.forEach((booking, index) => {
                console.log(`\n📋 Booking ${index + 1}:`);
                console.log(`   Reference: ${booking.booking_reference}`);
                console.log(`   Route: ${booking.origin} → ${booking.destination}`);
                console.log(`   Amount: ${booking.currency} ${booking.amount}`);
                console.log(`   Status: ${booking.booking_status}`);
                console.log(`   Created: ${booking.created_at}`);
                console.log(`   Item ID: ${booking.item_id}`);
            });
        }
        
        // Also check for any recent bus bookings with amount 1800
        const amountResult = await client.query(`
            SELECT * FROM bookings 
            WHERE passenger_name = 'Yashavanth K' 
            AND booking_type = 'bus'
            AND amount = 1800
            ORDER BY created_at DESC 
            LIMIT 3
        `);
        
        console.log(`\n💰 Found ${amountResult.rows.length} bus bookings with amount ₹1800:`);
        
        if (amountResult.rows.length > 0) {
            amountResult.rows.forEach((booking, index) => {
                console.log(`\n📋 Booking ${index + 1}:`);
                console.log(`   Reference: ${booking.booking_reference}`);
                console.log(`   Route: ${booking.origin} → ${booking.destination}`);
                console.log(`   Amount: ${booking.currency} ${booking.amount}`);
                console.log(`   Status: ${booking.booking_status}`);
                console.log(`   Created: ${booking.created_at}`);
                console.log(`   Item Name: ${booking.item_name}`);
                console.log(`   Item Code: ${booking.item_code}`);
            });
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking BLR->BOM booking:', error.message);
        await pool.end();
    }
}

checkBlrBomBooking();
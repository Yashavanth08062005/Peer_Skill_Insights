/**
 * Verify that the name fix worked by checking the most recent booking
 */

const { Pool } = require('pg');

async function verifyNameFix() {
    console.log('🔍 Verifying name fix in database...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get the most recent bus booking
        const result = await client.query(`
            SELECT booking_reference, item_name, item_code, booking_type, amount, created_at
            FROM bookings 
            WHERE booking_type = 'bus' 
            ORDER BY created_at DESC 
            LIMIT 3
        `);
        
        console.log('📋 Recent bus bookings:');
        
        if (result.rows.length > 0) {
            result.rows.forEach((booking, index) => {
                console.log(`\n${index + 1}. ${booking.booking_reference}`);
                console.log(`   item_name: "${booking.item_name}"`);
                console.log(`   item_code: "${booking.item_code}"`);
                console.log(`   amount: ₹${booking.amount}`);
                console.log(`   created: ${booking.created_at}`);
                
                // Check if the name looks correct
                if (booking.item_name && !booking.item_name.startsWith('bus-') && booking.item_name !== 'null') {
                    console.log('   ✅ Name looks correct!');
                } else {
                    console.log('   ❌ Name still looks like item ID');
                }
                
                // Check if the code looks correct
                if (booking.item_code && !booking.item_code.startsWith('bus-')) {
                    console.log('   ✅ Code looks correct!');
                } else {
                    console.log('   ⚠️ Code might be item ID');
                }
            });
            
            const latestBooking = result.rows[0];
            console.log('\n🎯 Latest booking analysis:');
            console.log(`   Reference: ${latestBooking.booking_reference}`);
            console.log(`   Name: "${latestBooking.item_name}"`);
            console.log(`   Code: "${latestBooking.item_code}"`);
            
            if (latestBooking.item_name === 'SRS Travels') {
                console.log('   🎉 SUCCESS: Name fix is working! Showing "SRS Travels" instead of "bus-15"');
            } else if (latestBooking.item_name && !latestBooking.item_name.startsWith('bus-')) {
                console.log('   ✅ GOOD: Name is not an item ID');
            } else {
                console.log('   ❌ ISSUE: Name still looks like item ID');
            }
            
        } else {
            console.log('❌ No bus bookings found');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error verifying name fix:', error.message);
        await pool.end();
    }
}

verifyNameFix();
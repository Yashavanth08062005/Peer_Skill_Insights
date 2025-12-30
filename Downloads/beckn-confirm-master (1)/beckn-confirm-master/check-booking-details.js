/**
 * Check what data is available in booking item_details
 */

const { Pool } = require('pg');

async function checkBookingDetails() {
    console.log('🔍 Checking booking item_details for real names...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get recent bus and train bookings with their item_details
        const result = await client.query(`
            SELECT booking_reference, booking_type, item_name, item_code, item_details
            FROM bookings 
            WHERE booking_type IN ('bus', 'train')
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log('📋 Recent bus/train bookings with details:');
        
        if (result.rows.length > 0) {
            result.rows.forEach((booking, index) => {
                console.log(`\n${index + 1}. ${booking.booking_reference} (${booking.booking_type})`);
                console.log(`   item_name: "${booking.item_name}"`);
                console.log(`   item_code: "${booking.item_code}"`);
                
                if (booking.item_details) {
                    try {
                        const details = typeof booking.item_details === 'string' 
                            ? JSON.parse(booking.item_details) 
                            : booking.item_details;
                            
                        console.log('   item_details structure:');
                        console.log(`     - id: ${details.id}`);
                        console.log(`     - descriptor.name: ${details.descriptor?.name}`);
                        console.log(`     - descriptor.code: ${details.descriptor?.code}`);
                        console.log(`     - descriptor.short_desc: ${details.descriptor?.short_desc}`);
                        
                        // Check if we can extract the real name
                        const realName = details.descriptor?.name;
                        const realCode = details.descriptor?.code;
                        
                        if (realName && realName !== booking.item_name) {
                            console.log(`   🎯 FOUND REAL NAME: "${realName}" (instead of "${booking.item_name}")`);
                        }
                        if (realCode && realCode !== booking.item_code) {
                            console.log(`   🎯 FOUND REAL CODE: "${realCode}" (instead of "${booking.item_code}")`);
                        }
                        
                    } catch (e) {
                        console.log('   ❌ Could not parse item_details');
                    }
                } else {
                    console.log('   ❌ No item_details available');
                }
            });
        } else {
            console.log('❌ No bus/train bookings found');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking booking details:', error.message);
        await pool.end();
    }
}

checkBookingDetails();
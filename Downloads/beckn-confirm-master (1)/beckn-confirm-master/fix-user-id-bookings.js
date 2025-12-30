/**
 * Fix all bookings to have the correct user_id
 */

const { Pool } = require('pg');

async function fixUserIdBookings() {
    console.log('👤 Fixing user_id in all bookings...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get the user ID for Yashavanth K
        const userResult = await client.query(`
            SELECT id FROM users WHERE email = 'yashavanthkate@gmal.com'
        `);
        
        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const userId = userResult.rows[0].id;
        console.log(`📋 Found user ID: ${userId}`);
        
        // Update all bookings for this user
        const updateResult = await client.query(`
            UPDATE bookings 
            SET user_id = $1 
            WHERE passenger_email = 'yashavanthkate@gmal.com' 
            AND user_id IS NULL
        `, [userId]);
        
        console.log(`✅ Updated ${updateResult.rowCount} bookings with user_id: ${userId}`);
        
        // Verify the fix
        console.log('\n📋 Verification - Recent bookings now:');
        const verifyResult = await client.query(`
            SELECT booking_reference, user_id, booking_type, passenger_email
            FROM bookings 
            WHERE passenger_email = 'yashavanthkate@gmal.com'
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        verifyResult.rows.forEach((booking, index) => {
            console.log(`   ${index + 1}. ${booking.booking_reference} (${booking.booking_type})`);
            console.log(`      User ID: ${booking.user_id}`);
            console.log(`      Email: ${booking.passenger_email}`);
        });
        
        // Check if there are any remaining NULL user_ids
        const nullResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE passenger_email = 'yashavanthkate@gmal.com' 
            AND user_id IS NULL
        `);
        
        const nullCount = nullResult.rows[0].count;
        if (nullCount > 0) {
            console.log(`\n⚠️  Still ${nullCount} bookings with NULL user_id`);
        } else {
            console.log('\n🎉 All bookings now have correct user_id!');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error fixing user_id:', error.message);
        await pool.end();
    }
}

fixUserIdBookings();
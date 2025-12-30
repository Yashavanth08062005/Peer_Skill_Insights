/**
 * Verify that user_id is now properly set in bookings
 */

const { Pool } = require('pg');

async function verifyUserIdFix() {
    console.log('✅ Verifying user_id fix in bookings...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check user_id distribution
        console.log('📊 User ID distribution in bookings:');
        const distributionResult = await client.query(`
            SELECT user_id, COUNT(*) as count
            FROM bookings 
            WHERE passenger_email = 'yashavanthkate@gmal.com'
            GROUP BY user_id
            ORDER BY user_id
        `);
        
        distributionResult.rows.forEach(row => {
            console.log(`   User ID ${row.user_id || 'NULL'}: ${row.count} bookings`);
        });
        
        // Check recent bookings
        console.log('\n📋 Recent bookings with user_id:');
        const recentResult = await client.query(`
            SELECT booking_reference, user_id, booking_type, passenger_email, created_at
            FROM bookings 
            WHERE passenger_email = 'yashavanthkate@gmal.com'
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        recentResult.rows.forEach((booking, index) => {
            const userIdStatus = booking.user_id ? '✅' : '❌';
            console.log(`   ${index + 1}. ${booking.booking_reference} (${booking.booking_type})`);
            console.log(`      User ID: ${booking.user_id || 'NULL'} ${userIdStatus}`);
            console.log(`      Created: ${new Date(booking.created_at).toLocaleString()}`);
        });
        
        // Summary
        const totalResult = await client.query(`
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(user_id) as bookings_with_user_id,
                COUNT(*) - COUNT(user_id) as bookings_without_user_id
            FROM bookings 
            WHERE passenger_email = 'yashavanthkate@gmal.com'
        `);
        
        const stats = totalResult.rows[0];
        console.log('\n📊 Summary:');
        console.log(`   Total bookings: ${stats.total_bookings}`);
        console.log(`   With user_id: ${stats.bookings_with_user_id}`);
        console.log(`   Without user_id: ${stats.bookings_without_user_id}`);
        
        if (stats.bookings_without_user_id === '0') {
            console.log('\n🎉 All bookings now have user_id set correctly!');
        } else {
            console.log(`\n⚠️  ${stats.bookings_without_user_id} bookings still missing user_id`);
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error verifying user_id fix:', error.message);
        await pool.end();
    }
}

verifyUserIdFix();
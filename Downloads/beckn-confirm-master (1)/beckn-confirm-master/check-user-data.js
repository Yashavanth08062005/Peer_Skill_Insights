/**
 * Check what user data is available and what user_id should be used
 */

const { Pool } = require('pg');

async function checkUserData() {
    console.log('👤 Checking user data and user_id in bookings...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check if there's a users table and what user data exists
        console.log('📋 Checking users table...');
        try {
            const usersResult = await client.query(`
                SELECT id, email, full_name, created_at 
                FROM users 
                WHERE email = 'yashavanthkate@gmal.com'
                LIMIT 1
            `);
            
            if (usersResult.rows.length > 0) {
                const user = usersResult.rows[0];
                console.log('✅ Found user in database:');
                console.log(`   ID: ${user.id}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Name: ${user.full_name}`);
                console.log(`   Created: ${user.created_at}`);
                
                // Check recent bookings for this user
                console.log('\n📋 Recent bookings for this user:');
                const bookingsResult = await client.query(`
                    SELECT booking_reference, user_id, passenger_email, booking_type, created_at
                    FROM bookings 
                    WHERE passenger_email = $1
                    ORDER BY created_at DESC 
                    LIMIT 5
                `, [user.email]);
                
                bookingsResult.rows.forEach((booking, index) => {
                    console.log(`   ${index + 1}. ${booking.booking_reference} (${booking.booking_type})`);
                    console.log(`      User ID: ${booking.user_id || 'NULL'}`);
                    console.log(`      Email: ${booking.passenger_email}`);
                    console.log(`      Created: ${booking.created_at}`);
                });
                
                // Suggest the correct user_id to use
                console.log(`\n💡 Correct user_id to use: ${user.id}`);
                
            } else {
                console.log('❌ No user found with email yashavanthkate@gmal.com');
                
                // Check what users exist
                const allUsersResult = await client.query('SELECT id, email, full_name FROM users LIMIT 5');
                console.log('\n📋 Available users:');
                allUsersResult.rows.forEach(user => {
                    console.log(`   ID: ${user.id}, Email: ${user.email}, Name: ${user.full_name}`);
                });
            }
            
        } catch (error) {
            console.log('❌ Error accessing users table:', error.message);
            console.log('💡 Users table might not exist or have different structure');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking user data:', error.message);
        await pool.end();
    }
}

checkUserData();
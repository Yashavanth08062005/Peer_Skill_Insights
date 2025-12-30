/**
 * Check the actual database state to see cancelled bookings
 */

const { Pool } = require('pg');

async function checkDatabaseState() {
    console.log('🔍 Checking actual database state...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check database connection info
        console.log('📊 Database Connection Info:');
        const dbInfo = await client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()');
        console.log(`   Database: ${dbInfo.rows[0].current_database}`);
        console.log(`   User: ${dbInfo.rows[0].current_user}`);
        console.log(`   Host: ${dbInfo.rows[0].inet_server_addr || 'localhost'}`);
        console.log(`   Port: ${dbInfo.rows[0].inet_server_port || '5432'}`);
        
        // Check all booking statuses
        console.log('\n📊 All booking statuses:');
        const statusResult = await client.query(`
            SELECT booking_status, COUNT(*) as count
            FROM bookings 
            GROUP BY booking_status
            ORDER BY booking_status
        `);
        
        statusResult.rows.forEach(row => {
            console.log(`   ${row.booking_status}: ${row.count} bookings`);
        });
        
        // Check specifically cancelled bookings
        console.log('\n📋 Cancelled bookings details:');
        const cancelledResult = await client.query(`
            SELECT booking_reference, booking_type, item_name, booking_status, updated_at
            FROM bookings 
            WHERE booking_status = 'CANCELLED'
            ORDER BY updated_at DESC
        `);
        
        if (cancelledResult.rows.length > 0) {
            cancelledResult.rows.forEach((booking, index) => {
                console.log(`   ${index + 1}. ${booking.booking_reference} (${booking.booking_type})`);
                console.log(`      Name: ${booking.item_name || 'N/A'}`);
                console.log(`      Status: ${booking.booking_status}`);
                console.log(`      Updated: ${new Date(booking.updated_at).toLocaleString()}`);
            });
        } else {
            console.log('   No cancelled bookings found');
        }
        
        // Check recent bookings for Yashavanth
        console.log('\n📋 Recent bookings for Yashavanth K:');
        const recentResult = await client.query(`
            SELECT booking_reference, booking_type, booking_status, updated_at
            FROM bookings 
            WHERE passenger_name = 'Yashavanth K'
            ORDER BY updated_at DESC
            LIMIT 10
        `);
        
        recentResult.rows.forEach((booking, index) => {
            const statusIcon = booking.booking_status === 'CANCELLED' ? '❌' : '✅';
            console.log(`   ${index + 1}. ${booking.booking_reference} (${booking.booking_type}) ${statusIcon}`);
            console.log(`      Status: ${booking.booking_status}`);
            console.log(`      Updated: ${new Date(booking.updated_at).toLocaleString()}`);
        });
        
        // Force a refresh query
        console.log('\n🔄 Forcing database refresh...');
        await client.query('COMMIT'); // Commit any pending transactions
        await client.query('SELECT pg_stat_clear_snapshot()'); // Clear stats snapshot
        
        // Re-check after refresh
        const refreshResult = await client.query(`
            SELECT COUNT(*) as cancelled_count
            FROM bookings 
            WHERE booking_status = 'CANCELLED'
        `);
        
        console.log(`✅ After refresh: ${refreshResult.rows[0].cancelled_count} cancelled bookings found`);
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking database state:', error.message);
        await pool.end();
    }
}

checkDatabaseState();
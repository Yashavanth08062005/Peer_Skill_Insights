/**
 * Debug why cancel is not updating database
 */

const { Pool } = require('pg');
const axios = require('axios');

async function debugCancelIssue() {
    console.log('🔍 Debugging cancel issue...\n');
    
    const API_BASE_URL = 'http://localhost:8081';
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Check current booking statuses
        console.log('📊 Current booking statuses in database:');
        const statusResult = await client.query(`
            SELECT booking_status, COUNT(*) as count
            FROM bookings 
            WHERE passenger_email = 'yashavanthkate@gmal.com'
            GROUP BY booking_status
        `);
        
        statusResult.rows.forEach(row => {
            console.log(`   ${row.booking_status}: ${row.count} bookings`);
        });
        
        // Get a specific booking to test
        const bookingResult = await client.query(`
            SELECT id, booking_reference, booking_status, updated_at
            FROM bookings 
            WHERE passenger_email = 'yashavanthkate@gmal.com'
            AND booking_status = 'CONFIRMED'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (bookingResult.rows.length === 0) {
            console.log('\n❌ No confirmed bookings found');
            client.release();
            await pool.end();
            return;
        }
        
        const booking = bookingResult.rows[0];
        console.log(`\n📋 Testing with booking: ${booking.booking_reference}`);
        console.log(`   Database ID: ${booking.id}`);
        console.log(`   Current Status: ${booking.booking_status}`);
        console.log(`   Last Updated: ${booking.updated_at}`);
        
        // Test the cancel API with detailed logging
        console.log('\n🔄 Testing cancel API...');
        try {
            const response = await axios.patch(
                `${API_BASE_URL}/api/bookings/${booking.booking_reference}/cancel`
            );
            
            console.log('✅ API Response:', JSON.stringify(response.data, null, 2));
            
            // Check database immediately after API call
            console.log('\n📋 Checking database after API call...');
            const afterResult = await client.query(`
                SELECT id, booking_reference, booking_status, updated_at
                FROM bookings 
                WHERE booking_reference = $1
            `, [booking.booking_reference]);
            
            if (afterResult.rows.length > 0) {
                const updatedBooking = afterResult.rows[0];
                console.log(`   Status: ${updatedBooking.booking_status}`);
                console.log(`   Updated: ${updatedBooking.updated_at}`);
                
                if (updatedBooking.booking_status === 'CANCELLED') {
                    console.log('✅ Database updated successfully!');
                } else {
                    console.log('❌ Database NOT updated!');
                    console.log(`   Expected: CANCELLED, Got: ${updatedBooking.booking_status}`);
                }
            } else {
                console.log('❌ Booking not found after API call');
            }
            
        } catch (apiError) {
            console.log('❌ API Error:', apiError.response?.data || apiError.message);
        }
        
        // Test direct database update
        console.log('\n🔧 Testing direct database update...');
        const directResult = await client.query(`
            UPDATE bookings
            SET booking_status = 'CANCELLED',
                updated_at = CURRENT_TIMESTAMP
            WHERE booking_reference = $1
            RETURNING id, booking_reference, booking_status, updated_at
        `, [booking.booking_reference]);
        
        if (directResult.rows.length > 0) {
            const directUpdated = directResult.rows[0];
            console.log('✅ Direct database update successful:');
            console.log(`   Status: ${directUpdated.booking_status}`);
            console.log(`   Updated: ${directUpdated.updated_at}`);
        } else {
            console.log('❌ Direct database update failed');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error debugging cancel issue:', error.message);
        await pool.end();
    }
}

debugCancelIssue();
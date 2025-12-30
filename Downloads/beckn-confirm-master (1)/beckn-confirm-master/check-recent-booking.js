/**
 * Check the most recent booking details
 */

const { Pool } = require('pg');

async function checkRecentBooking() {
    console.log('🔍 Checking most recent booking details...\n');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        
        // Get the most recent booking
        const result = await client.query(`
            SELECT * FROM bookings 
            WHERE passenger_name = 'Yashavanth K' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (result.rows.length > 0) {
            const booking = result.rows[0];
            console.log('📋 Most recent booking details:');
            console.log(`   Booking Reference: ${booking.booking_reference}`);
            console.log(`   Booking Type: ${booking.booking_type}`);
            console.log(`   Passenger: ${booking.passenger_name}`);
            console.log(`   Email: ${booking.passenger_email}`);
            console.log(`   Origin: ${booking.origin}`);
            console.log(`   Destination: ${booking.destination}`);
            console.log(`   Amount: ${booking.currency} ${booking.amount}`);
            console.log(`   Status: ${booking.booking_status}`);
            console.log(`   Payment Status: ${booking.payment_status}`);
            console.log(`   Created: ${booking.created_at}`);
            console.log(`   Item ID: ${booking.item_id}`);
            console.log(`   Provider ID: ${booking.provider_id}`);
            
            if (booking.item_details) {
                console.log('\n📦 Item Details:');
                try {
                    const itemDetails = typeof booking.item_details === 'string' 
                        ? JSON.parse(booking.item_details) 
                        : booking.item_details;
                    console.log(`   Item Name: ${itemDetails.descriptor?.name || itemDetails.name || 'N/A'}`);
                    console.log(`   Item Code: ${itemDetails.descriptor?.code || itemDetails.code || 'N/A'}`);
                    console.log(`   Category: ${itemDetails.category_id || 'N/A'}`);
                } catch (e) {
                    console.log('   Could not parse item details');
                }
            }
            
            if (booking.booking_metadata) {
                console.log('\n🔧 Booking Metadata:');
                try {
                    const metadata = typeof booking.booking_metadata === 'string' 
                        ? JSON.parse(booking.booking_metadata) 
                        : booking.booking_metadata;
                    console.log(`   Booking Source: ${metadata.booking_source || 'N/A'}`);
                    console.log(`   BPP Booking ID: ${metadata.bpp_booking_id || 'N/A'}`);
                } catch (e) {
                    console.log('   Could not parse metadata');
                }
            }
        } else {
            console.log('❌ No bookings found for Yashavanth K');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking recent booking:', error.message);
        await pool.end();
    }
}

checkRecentBooking();
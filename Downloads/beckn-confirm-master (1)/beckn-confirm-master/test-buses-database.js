/**
 * Test script to verify buses BPP database is working correctly
 * Run: node test-buses-database.js
 */

const { Pool } = require('pg');

// Database configuration for buses BPP
const config = {
    host: 'localhost',
    port: 5432,
    database: 'buses_bpp',
    user: 'postgres',
    password: '2005',
};

async function testBusesDatabase() {
    console.log('🚌 Testing Buses BPP database...\n');
    
    const pool = new Pool(config);
    
    try {
        // Test connection
        const client = await pool.connect();
        console.log(`✅ Connected to ${config.database}`);
        
        // Check if buses table exists
        try {
            const busesResult = await client.query('SELECT COUNT(*) as count FROM buses');
            console.log(`   Total buses: ${busesResult.rows[0].count}`);
            
            // Show buses by city
            const cityResult = await client.query('SELECT departure_city, arrival_city, COUNT(*) as count FROM buses GROUP BY departure_city, arrival_city ORDER BY departure_city, arrival_city');
            console.log('   Routes available:');
            cityResult.rows.forEach(row => {
                console.log(`     - ${row.departure_city} → ${row.arrival_city}: ${row.count} buses`);
            });
        } catch (error) {
            console.error(`   ❌ Error accessing buses table: ${error.message}`);
        }
        
        // Check if bpp_bookings table exists
        try {
            const bookingsResult = await client.query('SELECT COUNT(*) as count FROM bpp_bookings');
            console.log(`   BPP bookings: ${bookingsResult.rows[0].count}`);
            
            // Show recent bookings
            const recentBookings = await client.query('SELECT bpp_booking_id, passenger_name, booking_status, created_at FROM bpp_bookings ORDER BY created_at DESC LIMIT 5');
            if (recentBookings.rows.length > 0) {
                console.log('   Recent bookings:');
                recentBookings.rows.forEach(booking => {
                    console.log(`     - ${booking.bpp_booking_id}: ${booking.passenger_name} (${booking.booking_status}) - ${booking.created_at}`);
                });
            }
        } catch (error) {
            console.error(`   ❌ Error accessing bpp_bookings table: ${error.message}`);
            console.log('   💡 The bpp_bookings table might not exist. Creating it...');
            
            // Create bpp_bookings table
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS bpp_bookings (
                        id SERIAL PRIMARY KEY,
                        bpp_booking_id VARCHAR(255) UNIQUE NOT NULL,
                        platform_booking_id VARCHAR(255),
                        bus_id INTEGER,
                        passenger_name VARCHAR(255) NOT NULL,
                        passenger_email VARCHAR(255),
                        passenger_phone VARCHAR(20),
                        booking_status VARCHAR(50) DEFAULT 'PENDING',
                        beckn_transaction_id VARCHAR(255),
                        beckn_message_id VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('   ✅ Created bpp_bookings table successfully');
            } catch (createError) {
                console.error(`   ❌ Error creating bpp_bookings table: ${createError.message}`);
            }
        }
        
        client.release();
        await pool.end();
        
        console.log(`\n✅ Buses BPP database test completed!`);
        
    } catch (error) {
        console.error(`❌ Error testing Buses BPP:`);
        console.error(`   Database: ${config.database}`);
        console.error(`   Error: ${error.message}`);
        
        if (error.code === '3D000') {
            console.error(`   💡 Database '${config.database}' does not exist. Creating it...`);
            
            // Try to create the database
            const adminPool = new Pool({
                host: config.host,
                port: config.port,
                database: 'postgres', // Connect to default postgres database
                user: config.user,
                password: config.password,
            });
            
            try {
                const adminClient = await adminPool.connect();
                await adminClient.query(`CREATE DATABASE ${config.database}`);
                console.log(`   ✅ Created database '${config.database}'`);
                adminClient.release();
                await adminPool.end();
                
                // Now run the setup
                console.log('   🔄 Running buses setup...');
                await runBusesSetup();
                
            } catch (createError) {
                console.error(`   ❌ Error creating database: ${createError.message}`);
                await adminPool.end();
            }
            
        } else if (error.code === '28P01') {
            console.error(`   💡 Authentication failed. Check username/password.`);
        }
        
        await pool.end();
        return false;
    }
    
    return true;
}

async function runBusesSetup() {
    const pool = new Pool(config);
    
    try {
        const client = await pool.connect();
        
        // Create buses table
        await client.query(`
            CREATE TABLE IF NOT EXISTS buses (
                id SERIAL PRIMARY KEY,
                bus_id VARCHAR(50) UNIQUE NOT NULL,
                operator_name VARCHAR(255) NOT NULL,
                bus_type VARCHAR(100),
                departure_city VARCHAR(10) NOT NULL,
                arrival_city VARCHAR(10) NOT NULL,
                departure_location VARCHAR(255),
                arrival_location VARCHAR(255),
                departure_time TIME,
                arrival_time TIME,
                duration_minutes INTEGER,
                price DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'INR',
                available_seats INTEGER DEFAULT 40,
                total_seats INTEGER DEFAULT 40,
                amenities JSONB,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create bpp_bookings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS bpp_bookings (
                id SERIAL PRIMARY KEY,
                bpp_booking_id VARCHAR(255) UNIQUE NOT NULL,
                platform_booking_id VARCHAR(255),
                bus_id INTEGER,
                passenger_name VARCHAR(255) NOT NULL,
                passenger_email VARCHAR(255),
                passenger_phone VARCHAR(20),
                booking_status VARCHAR(50) DEFAULT 'PENDING',
                beckn_transaction_id VARCHAR(255),
                beckn_message_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert sample buses
        await client.query(`
            INSERT INTO buses (bus_id, operator_name, bus_type, departure_city, arrival_city, departure_location, arrival_location, departure_time, arrival_time, duration_minutes, price, amenities) VALUES
            ('KT001', 'Kadamba Transport', 'AC Sleeper', 'BOM', 'GOI', 'Mumbai Central', 'Panaji Bus Stand', '22:00', '08:00', 600, 1200.00, '{"wifi": true, "charging": true, "blanket": true}'),
            ('KT002', 'Kadamba Transport', 'Non-AC Seater', 'BOM', 'GOI', 'Mumbai Central', 'Panaji Bus Stand', '06:00', '16:00', 600, 800.00, '{"wifi": false, "charging": true, "blanket": false}'),
            ('VRL001', 'VRL Travels', 'AC Sleeper', 'BLR', 'BOM', 'Bangalore Majestic', 'Mumbai Central', '20:00', '08:00', 720, 1500.00, '{"wifi": true, "charging": true, "blanket": true, "meals": true}'),
            ('SRS001', 'SRS Travels', 'AC Seater', 'HYD', 'BLR', 'Hyderabad MGBS', 'Bangalore Majestic', '23:00', '07:00', 480, 900.00, '{"wifi": true, "charging": true, "blanket": false}')
            ON CONFLICT (bus_id) DO NOTHING
        `);
        
        console.log('   ✅ Buses database setup completed');
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error(`   ❌ Error setting up buses database: ${error.message}`);
        await pool.end();
    }
}

testBusesDatabase();
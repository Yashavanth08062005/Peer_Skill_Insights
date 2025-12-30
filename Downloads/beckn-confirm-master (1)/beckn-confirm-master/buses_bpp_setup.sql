-- Buses BPP Database Setup

-- Create buses table
CREATE TABLE IF NOT EXISTS buses (
    id SERIAL PRIMARY KEY,
    bus_id VARCHAR(50) UNIQUE NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    bus_type VARCHAR(100),
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_location VARCHAR(200),
    arrival_location VARCHAR(200),
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    duration_minutes INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    seats_available INTEGER DEFAULT 40,
    amenities JSONB,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BPP-specific booking confirmations table
CREATE TABLE IF NOT EXISTS bpp_bookings (
    id SERIAL PRIMARY KEY,
    bpp_booking_id VARCHAR(50) UNIQUE NOT NULL,
    platform_booking_id VARCHAR(50),
    bus_id INTEGER REFERENCES buses(id),
    passenger_name VARCHAR(200) NOT NULL,
    passenger_email VARCHAR(100),
    passenger_phone VARCHAR(20),
    seat_number VARCHAR(10),
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED',
    beckn_transaction_id VARCHAR(100),
    beckn_message_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample bus data if table is empty
INSERT INTO buses (bus_id, operator_name, bus_type, departure_city, arrival_city, 
    departure_location, arrival_location, departure_time, arrival_time, duration_minutes, 
    price, currency, seats_available, amenities, status)
SELECT 'KSRTC-BM-001', 'KSRTC', 'Volvo Club Class', 'BLR', 'BOM', 
     'Kempegowda Bus Station', 'Mumbai Central',
     NOW() + INTERVAL '1 day 18 hours', NOW() + INTERVAL '2 days 10 hours', 960, 
     1800.00, 'INR', 35, 
     '{"wifi": true, "charging_point": true, "water_bottle": true, "blanket": true}'::jsonb, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE bus_id = 'KSRTC-BM-001');

INSERT INTO buses (bus_id, operator_name, bus_type, departure_city, arrival_city, 
    departure_location, arrival_location, departure_time, arrival_time, duration_minutes, 
    price, currency, seats_available, amenities, status)
SELECT 'VRL-BM-002', 'VRL Travels', 'AC Sleeper', 'BLR', 'BOM',
     'Anand Rao Circle', 'Sion Circle',
     NOW() + INTERVAL '1 day 20 hours', NOW() + INTERVAL '2 days 14 hours', 1080,
     2200.00, 'INR', 28,
     '{"charging_point": true, "reading_light": true, "pillow": true}'::jsonb, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE bus_id = 'VRL-BM-002');

INSERT INTO buses (bus_id, operator_name, bus_type, departure_city, arrival_city, 
    departure_location, arrival_location, departure_time, arrival_time, duration_minutes, 
    price, currency, seats_available, amenities, status)
SELECT 'SRS-BD-001', 'SRS Travels', 'Scania Multi-Axle', 'BLR', 'DEL',
     'Madiwala', 'Kashmere Gate',
     NOW() + INTERVAL '2 days 10 hours', NOW() + INTERVAL '4 days 2 hours', 2400,
     3500.00, 'INR', 40,
     '{"wifi": true, "tv": true, "charging_point": true}'::jsonb, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE bus_id = 'SRS-BD-001');

INSERT INTO buses (bus_id, operator_name, bus_type, departure_city, arrival_city, 
    departure_location, arrival_location, departure_time, arrival_time, duration_minutes, 
    price, currency, seats_available, amenities, status)
SELECT 'KAD-MG-001', 'Kadamba Transport', 'Volvo AC', 'BOM', 'GOI',
     'Borivali', 'Panjim',
     NOW() + INTERVAL '1 day 22 hours', NOW() + INTERVAL '2 days 10 hours', 720,
     1200.00, 'INR', 45,
     '{"ac": true, "pushback_seats": true}'::jsonb, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE bus_id = 'KAD-MG-001');

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(departure_city, arrival_city);
CREATE INDEX IF NOT EXISTS idx_buses_date ON buses(departure_time);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_bpp_bookings_bpp_id ON bpp_bookings(bpp_booking_id);
CREATE INDEX IF NOT EXISTS idx_bpp_bookings_platform_id ON bpp_bookings(platform_booking_id);

-- Trains BPP Database Setup

-- Create trains table
CREATE TABLE IF NOT EXISTS trains (
    id SERIAL PRIMARY KEY,
    train_number VARCHAR(20) UNIQUE NOT NULL,
    train_name VARCHAR(100) NOT NULL,
    train_type VARCHAR(50),
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_station VARCHAR(200),
    arrival_station VARCHAR(200),
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    duration_minutes INTEGER,
    price_cc DECIMAL(10, 2),
    price_ec DECIMAL(10, 2),
    price_sl DECIMAL(10, 2),
    price_3a DECIMAL(10, 2),
    price_2a DECIMAL(10, 2),
    price_1a DECIMAL(10, 2),
    seats_available INTEGER DEFAULT 100,
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
    train_id INTEGER REFERENCES trains(id),
    passenger_name VARCHAR(200) NOT NULL,
    passenger_email VARCHAR(100),
    passenger_phone VARCHAR(20),
    seat_number VARCHAR(20),
    coach_number VARCHAR(10),
    class_type VARCHAR(10),
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED',
    beckn_transaction_id VARCHAR(100),
    beckn_message_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample train data
INSERT INTO trains (train_number, train_name, train_type, departure_city, arrival_city, 
    departure_station, arrival_station, departure_time, arrival_time, duration_minutes, 
    price_cc, price_ec, price_sl, price_3a, price_2a, price_1a, seats_available, amenities, status)
VALUES
    -- Bangalore to Chennai (Shatabdi)
    ('12028', 'Shatabdi Express', 'Shatabdi', 'BLR', 'MAA', 
     'KSR Bengaluru City Junction (SBC)', 'MGR Chennai Central (MAS)',
     NOW() + INTERVAL '1 day 6 hours', NOW() + INTERVAL '1 day 11 hours', 300, 
     800.00, 1600.00, NULL, NULL, NULL, NULL, 120, 
     '{"pantry": true, "wifi": false, "ac": true}'::jsonb, 'ACTIVE'),

    -- Bangalore to Hyderabad (Vande Bharat)
    ('20607', 'Vande Bharat Express', 'Vande Bharat', 'BLR', 'HYD',
     'KSR Bengaluru City Junction (SBC)', 'Kacheguda (KCG)',
     NOW() + INTERVAL '1 day 10 hours', NOW() + INTERVAL '1 day 12 hours', 120,
     500.00, 1000.00, NULL, NULL, NULL, NULL, 450,
     '{"pantry": true, "wifi": true, "ac": true, "cctv": true}'::jsonb, 'ACTIVE'),

    -- Bangalore to Delhi (Rajdhani)
    ('22691', 'Rajdhani Express', 'Rajdhani', 'BLR', 'DEL',
     'KSR Bengaluru City Junction (SBC)', 'Hazrat Nizamuddin (NZM)',
     NOW() + INTERVAL '2 days 20 hours', NOW() + INTERVAL '4 days 6 hours', 2040,
     NULL, NULL, NULL, 3500.00, 5200.00, 8500.00, 60,
     '{"pantry": true, "wifi": false, "ac": true, "bedding": true}'::jsonb, 'ACTIVE'),

    -- Mumbai to Goa (Vande Bharat)
    ('22229', 'Vande Bharat Express', 'Vande Bharat', 'BOM', 'GOI',
     'CSMT Mumbai', 'Madgaon Junction',
     NOW() + INTERVAL '1 day 5 hours', NOW() + INTERVAL '1 day 13 hours', 480,
     1400.00, 2800.00, NULL, NULL, NULL, NULL, 300,
     '{"pantry": true, "wifi": true, "ac": true}'::jsonb, 'ACTIVE'),
     
    -- Delhi to Mumbai (Rajdhani)
    ('12952', 'Mumbai Rajdhani', 'Rajdhani', 'DEL', 'BOM',
     'New Delhi (NDLS)', 'Mumbai Central (MMCT)',
     NOW() + INTERVAL '1 day 16 hours', NOW() + INTERVAL '2 days 8 hours', 960,
     NULL, NULL, NULL, 2800.00, 4100.00, 6800.00, 80,
     '{"pantry": true, "wifi": true, "ac": true, "bedding": true}'::jsonb, 'ACTIVE')
ON CONFLICT (train_number) DO NOTHING;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_trains_route ON trains(departure_city, arrival_city);
CREATE INDEX IF NOT EXISTS idx_trains_date ON trains(departure_time);
CREATE INDEX IF NOT EXISTS idx_trains_number ON trains(train_number);

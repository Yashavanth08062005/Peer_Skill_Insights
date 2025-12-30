-- Setup Separate Databases for Each BPP
-- Run this in PostgreSQL (pgAdmin) to create separate databases

-- ============================================
-- CREATE SEPARATE DATABASES
-- ============================================

-- 1. Flights BPP Database
CREATE DATABASE flights_bpp;

-- 2. International Flights BPP Database  
CREATE DATABASE international_flights_bpp;

-- 3. Hotels BPP Database
CREATE DATABASE hotels_bpp;

-- 4. Keep existing travel_discovery for BAP
-- (travel_discovery database already exists for BAP service)

-- ============================================
-- FLIGHTS BPP DATABASE SETUP
-- ============================================
\c flights_bpp;

-- Create flights table for domestic flights BPP
CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_code VARCHAR(20) UNIQUE NOT NULL,
    airline_name VARCHAR(100) NOT NULL,
    aircraft_model VARCHAR(50),
    departure_airport VARCHAR(10) NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    departure_city VARCHAR(100),
    arrival_city VARCHAR(100),
    departure_time TIME,
    arrival_time TIME,
    duration_minutes INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    flight_type VARCHAR(20) DEFAULT 'DOMESTIC',
    short_desc TEXT,
    long_desc TEXT,
    meals_included BOOLEAN DEFAULT false,
    baggage_kg INTEGER DEFAULT 15,
    wifi_available BOOLEAN DEFAULT false,
    seat_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BPP-specific booking confirmations table
CREATE TABLE IF NOT EXISTS bpp_bookings (
    id SERIAL PRIMARY KEY,
    bpp_booking_id VARCHAR(50) UNIQUE NOT NULL,
    platform_booking_id VARCHAR(50),
    flight_id INTEGER REFERENCES flights(id),
    passenger_name VARCHAR(200) NOT NULL,
    passenger_email VARCHAR(100) NOT NULL,
    passenger_phone VARCHAR(20),
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED',
    beckn_transaction_id VARCHAR(100),
    beckn_message_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert domestic flights data
INSERT INTO flights (flight_code, airline_name, aircraft_model, departure_airport, arrival_airport, 
    departure_city, arrival_city, departure_time, arrival_time, duration_minutes, price, 
    flight_type, short_desc, long_desc, meals_included, baggage_kg, wifi_available, seat_type)
VALUES
    ('AI-1234', 'Air India', 'Boeing 737', 'BLR', 'BOM', 'Bangalore', 'Mumbai', 
     '10:00:00', '12:00:00', 120, 5500.00, 'DOMESTIC',
     'Non-stop flight', 'Comfortable economy class with meals included', 
     true, 20, true, 'Economy'),
    
    ('6E-5678', 'IndiGo', 'Airbus A320', 'BLR', 'BOM', 'Bangalore', 'Mumbai',
     '14:30:00', '16:30:00', 120, 4200.00, 'DOMESTIC',
     'Budget airline', 'Affordable travel with reliable service',
     false, 15, false, 'Economy'),
    
    ('UK-9012', 'Vistara', 'Airbus A321', 'BLR', 'BOM', 'Bangalore', 'Mumbai',
     '18:00:00', '20:00:00', 120, 7800.00, 'DOMESTIC',
     'Premium service', 'Full-service airline with premium amenities',
     true, 30, true, 'Premium Economy'),
    
    ('SG-2345', 'SpiceJet', 'Boeing 737', 'DEL', 'BLR', 'Delhi', 'Bangalore',
     '06:00:00', '08:30:00', 150, 4800.00, 'DOMESTIC',
     'Early morning flight', 'Budget-friendly option with good service',
     false, 15, false, 'Economy'),
    
    ('AI-7890', 'Air India', 'Boeing 787', 'HYD', 'BOM', 'Hyderabad', 'Mumbai',
     '12:00:00', '13:30:00', 90, 6200.00, 'DOMESTIC',
     'Quick connection', 'Short duration flight with premium service',
     true, 25, true, 'Business');

-- ============================================
-- INTERNATIONAL FLIGHTS BPP DATABASE SETUP
-- ============================================
\c international_flights_bpp;

-- Create flights table for international flights BPP
CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_code VARCHAR(20) UNIQUE NOT NULL,
    airline_name VARCHAR(100) NOT NULL,
    aircraft_model VARCHAR(50),
    departure_airport VARCHAR(10) NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    departure_city VARCHAR(100),
    arrival_city VARCHAR(100),
    departure_time TIME,
    arrival_time TIME,
    duration_minutes INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    flight_type VARCHAR(20) DEFAULT 'INTERNATIONAL',
    short_desc TEXT,
    long_desc TEXT,
    meals_included BOOLEAN DEFAULT false,
    baggage_kg INTEGER DEFAULT 15,
    wifi_available BOOLEAN DEFAULT false,
    seat_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BPP-specific booking confirmations table
CREATE TABLE IF NOT EXISTS bpp_bookings (
    id SERIAL PRIMARY KEY,
    bpp_booking_id VARCHAR(50) UNIQUE NOT NULL,
    platform_booking_id VARCHAR(50),
    flight_id INTEGER REFERENCES flights(id),
    passenger_name VARCHAR(200) NOT NULL,
    passenger_email VARCHAR(100) NOT NULL,
    passenger_phone VARCHAR(20),
    passport_number VARCHAR(20),
    nationality VARCHAR(50),
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED',
    beckn_transaction_id VARCHAR(100),
    beckn_message_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert international flights data
INSERT INTO flights (flight_code, airline_name, aircraft_model, departure_airport, arrival_airport,
    departure_city, arrival_city, departure_time, arrival_time, duration_minutes, price,
    flight_type, short_desc, long_desc, meals_included, baggage_kg, wifi_available, seat_type)
VALUES
    ('EK-501', 'Emirates', 'Boeing 777', 'BOM', 'DXB', 'Mumbai', 'Dubai',
     '03:00:00', '05:30:00', 210, 15000.00, 'INTERNATIONAL',
     'Mumbai to Dubai', 'International flight from Mumbai to Dubai',
     true, 30, true, 'Economy'),
    
    ('BA-201', 'British Airways', 'Boeing 787', 'BOM', 'LHR', 'Mumbai', 'London',
     '02:00:00', '07:30:00', 540, 45000.00, 'INTERNATIONAL',
     'Mumbai to London', 'International flight from Mumbai to London',
     true, 40, true, 'Business'),
    
    ('SQ-405', 'Singapore Airlines', 'Airbus A380', 'DEL', 'SIN', 'Delhi', 'Singapore',
     '23:00:00', '06:30:00', 330, 22000.00, 'INTERNATIONAL',
     'Delhi to Singapore', 'Premium international service',
     true, 35, true, 'Economy'),
    
    ('QR-570', 'Qatar Airways', 'Boeing 777', 'BLR', 'DOH', 'Bangalore', 'Doha',
     '04:30:00', '07:00:00', 270, 18000.00, 'INTERNATIONAL',
     'Bangalore to Doha', 'Connecting flight to Middle East',
     true, 30, true, 'Economy');

-- ============================================
-- HOTELS BPP DATABASE SETUP
-- ============================================
\c hotels_bpp;

-- Create hotels table for hotels BPP
CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    hotel_code VARCHAR(20) UNIQUE NOT NULL,
    hotel_name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    gps_coordinates VARCHAR(50),
    star_rating DECIMAL(2, 1),
    price_per_night DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    room_type VARCHAR(100),
    short_desc TEXT,
    long_desc TEXT,
    amenities JSONB,
    check_in_time TIME DEFAULT '14:00:00',
    check_out_time TIME DEFAULT '11:00:00',
    total_rooms INTEGER DEFAULT 50,
    available_rooms INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BPP-specific booking confirmations table
CREATE TABLE IF NOT EXISTS bpp_bookings (
    id SERIAL PRIMARY KEY,
    bpp_booking_id VARCHAR(50) UNIQUE NOT NULL,
    platform_booking_id VARCHAR(50),
    hotel_id INTEGER REFERENCES hotels(id),
    guest_name VARCHAR(200) NOT NULL,
    guest_email VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20),
    check_in_date DATE,
    check_out_date DATE,
    number_of_guests INTEGER DEFAULT 1,
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED',
    beckn_transaction_id VARCHAR(100),
    beckn_message_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert hotels data
INSERT INTO hotels (hotel_code, hotel_name, city, location, gps_coordinates, star_rating,
    price_per_night, room_type, short_desc, long_desc, amenities)
VALUES
    ('TAJ-BOM-001', 'Taj Mahal Palace', 'Mumbai', 'Colaba', '18.9220,72.8332', 5.0,
     15000.00, 'Deluxe Room',
     'Iconic luxury hotel', 'Historic 5-star hotel with stunning views of Gateway of India',
     '{"wifi": true, "pool": true, "gym": true, "spa": true, "restaurant": true, "parking": true}'),
    
    ('OYO-BOM-002', 'OYO Rooms Marine Drive', 'Mumbai', 'Marine Drive', '18.9432,72.8236', 3.0,
     3500.00, 'Standard Room',
     'Budget hotel', 'Affordable accommodation near Marine Drive with basic amenities',
     '{"wifi": true, "ac": true, "tv": true, "parking": false}'),
    
    ('HYATT-BOM-003', 'Hyatt Regency Mumbai', 'Mumbai', 'Sahar', '19.0896,72.8656', 5.0,
     12000.00, 'Premium Room',
     'Airport hotel', 'Luxury hotel near Mumbai airport with world-class facilities',
     '{"wifi": true, "pool": true, "gym": true, "spa": true, "restaurant": true, "parking": true, "airport_shuttle": true}'),
    
    ('LEMON-BOM-004', 'Lemon Tree Hotel', 'Mumbai', 'Andheri', '19.1136,72.8697', 4.0,
     6500.00, 'Superior Room',
     'Business hotel', 'Modern hotel perfect for business travelers',
     '{"wifi": true, "gym": true, "restaurant": true, "parking": true, "conference_room": true}'),
    
    ('ITC-BLR-001', 'ITC Gardenia', 'Bangalore', 'Residency Road', '12.9716,77.5946', 5.0,
     18000.00, 'Luxury Suite',
     'Premium luxury', 'Award-winning luxury hotel in the heart of Bangalore',
     '{"wifi": true, "pool": true, "gym": true, "spa": true, "restaurant": true, "parking": true, "butler": true}'),
    
    ('TREEBO-BLR-002', 'Treebo Trend', 'Bangalore', 'Koramangala', '12.9352,77.6245', 3.0,
     2800.00, 'Standard Room',
     'Budget stay', 'Clean and comfortable budget accommodation',
     '{"wifi": true, "ac": true, "tv": true}'),
    
    ('OBEROI-DEL-001', 'The Oberoi', 'Delhi', 'Dr Zakir Hussain Marg', '28.5921,77.2460', 5.0,
     20000.00, 'Deluxe Room',
     'Luxury heritage', 'Iconic luxury hotel with impeccable service',
     '{"wifi": true, "pool": true, "gym": true, "spa": true, "restaurant": true, "parking": true, "concierge": true}'),
    
    ('RADISSON-HYD-001', 'Radisson Blu', 'Hyderabad', 'Gachibowli', '17.4399,78.3908', 4.5,
     8500.00, 'Business Room',
     'IT corridor hotel', 'Modern hotel in Hyderabad IT hub',
     '{"wifi": true, "pool": true, "gym": true, "restaurant": true, "parking": true, "business_center": true}');

-- ============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================

-- Flights BPP indexes
\c flights_bpp;
CREATE INDEX idx_flights_departure_airport ON flights(departure_airport);
CREATE INDEX idx_flights_arrival_airport ON flights(arrival_airport);
CREATE INDEX idx_flights_type ON flights(flight_type);
CREATE INDEX idx_flights_status ON flights(status);
CREATE INDEX idx_bpp_bookings_bpp_id ON bpp_bookings(bpp_booking_id);
CREATE INDEX idx_bpp_bookings_platform_id ON bpp_bookings(platform_booking_id);

-- International Flights BPP indexes
\c international_flights_bpp;
CREATE INDEX idx_flights_departure_airport ON flights(departure_airport);
CREATE INDEX idx_flights_arrival_airport ON flights(arrival_airport);
CREATE INDEX idx_flights_type ON flights(flight_type);
CREATE INDEX idx_flights_status ON flights(status);
CREATE INDEX idx_bpp_bookings_bpp_id ON bpp_bookings(bpp_booking_id);
CREATE INDEX idx_bpp_bookings_platform_id ON bpp_bookings(platform_booking_id);

-- Hotels BPP indexes
\c hotels_bpp;
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_bpp_bookings_bpp_id ON bpp_bookings(bpp_booking_id);
CREATE INDEX idx_bpp_bookings_platform_id ON bpp_bookings(platform_booking_id);

-- ============================================
-- BUSES BPP DATABASE SETUP
-- ============================================

-- 5. Buses BPP Database
CREATE DATABASE buses_bpp;

\c buses_bpp;

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

-- Insert sample bus data
INSERT INTO buses (bus_id, operator_name, bus_type, departure_city, arrival_city, 
    departure_location, arrival_location, departure_time, arrival_time, duration_minutes, 
    price, currency, seats_available, amenities, status)
VALUES
    -- Bangalore to Mumbai
    ('KSRTC-BM-001', 'KSRTC', 'Volvo Club Class', 'BLR', 'BOM', 
     'Kempegowda Bus Station', 'Mumbai Central',
     NOW() + INTERVAL '1 day 18 hours', NOW() + INTERVAL '2 days 10 hours', 960, 
     1800.00, 'INR', 35, 
     '{"wifi": true, "charging_point": true, "water_bottle": true, "blanket": true}', 'ACTIVE'),

    ('VRL-BM-002', 'VRL Travels', 'AC Sleeper', 'BLR', 'BOM',
     'Anand Rao Circle', 'Sion Circle',
     NOW() + INTERVAL '1 day 20 hours', NOW() + INTERVAL '2 days 14 hours', 1080,
     2200.00, 'INR', 28,
     '{"charging_point": true, "reading_light": true, "pillow": true}', 'ACTIVE'),

    -- Bangalore to Delhi (Long haul mock)
    ('SRS-BD-001', 'SRS Travels', 'Scania Multi-Axle', 'BLR', 'DEL',
     'Madiwala', 'Kashmere Gate',
     NOW() + INTERVAL '2 days 10 hours', NOW() + INTERVAL '4 days 2 hours', 2400,
     3500.00, 'INR', 40,
     '{"wifi": true, "tv": true, "charging_point": true}', 'ACTIVE'),

    -- Mumbai to Goa
    ('KAD-MG-001', 'Kadamba Transport', 'Volvo AC', 'BOM', 'GOI',
     'Borivali', 'Panjim',
     NOW() + INTERVAL '1 day 22 hours', NOW() + INTERVAL '2 days 10 hours', 720,
     1200.00, 'INR', 45,
     '{"ac": true, "pushback_seats": true}', 'ACTIVE');

-- Create Indexes
CREATE INDEX idx_buses_route ON buses(departure_city, arrival_city);
CREATE INDEX idx_buses_date ON buses(departure_time);
CREATE INDEX idx_buses_status ON buses(status);
CREATE INDEX idx_bpp_bookings_bpp_id ON bpp_bookings(bpp_booking_id);
CREATE INDEX idx_bpp_bookings_platform_id ON bpp_bookings(platform_booking_id);
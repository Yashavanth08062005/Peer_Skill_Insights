-- Fix origin and destination column length in bookings table
-- Current limit is VARCHAR(10), increasing to VARCHAR(100) to accommodate full station names

-- Connect to the travel_discovery database first
\c travel_discovery;

-- Check current column definitions
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('origin', 'destination');

-- Alter the columns to increase length
ALTER TABLE bookings 
ALTER COLUMN origin TYPE VARCHAR(100);

ALTER TABLE bookings 
ALTER COLUMN destination TYPE VARCHAR(100);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('origin', 'destination');

-- Show current bookings with null origin/destination
SELECT booking_reference, booking_type, item_id, origin, destination, passenger_name
FROM bookings 
WHERE booking_type IN ('train', 'bus') 
AND (origin IS NULL OR destination IS NULL)
ORDER BY created_at DESC;
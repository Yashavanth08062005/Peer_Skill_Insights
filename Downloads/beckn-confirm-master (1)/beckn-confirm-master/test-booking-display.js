/**
 * Test how the booking display will look with the new format
 */

// Mock booking data (based on recent bookings)
const mockBookings = [
    {
        id: 1,
        booking_type: 'bus',
        item_name: 'SRS Travels',
        item_code: 'SRS-BD-001',
        item_id: 'bus-15',
        booking_reference: 'BK73291256',
        booking_status: 'CONFIRMED'
    },
    {
        id: 2,
        booking_type: 'train',
        item_name: 'Rajdhani Express',
        item_code: '12001',
        item_id: 'train-12-3a',
        booking_reference: 'BK73291257',
        booking_status: 'CONFIRMED'
    },
    {
        id: 3,
        booking_type: 'flight',
        item_name: 'IndiGo',
        item_code: '6E-123',
        item_id: 'flight-456',
        booking_reference: 'BK73291258',
        booking_status: 'CONFIRMED'
    },
    {
        id: 4,
        booking_type: 'bus',
        item_name: 'null', // Old booking before fix
        item_code: 'bus-15',
        item_id: 'bus-15',
        booking_reference: 'BK72790671',
        booking_status: 'CONFIRMED'
    }
];

function simulateDisplay(booking) {
    // Simulate the new display logic (SWAPPED)
    const mainTitle = booking.booking_type === 'bus' || booking.booking_type === 'train' 
        ? (booking.item_name && booking.item_name !== 'null' ? booking.item_name : 
           booking.booking_type === 'bus' ? 'Bus Operator' : 'Train Service')
        : (booking.item_name || 'N/A');
        
    const subtitle = booking.booking_type === 'bus' || booking.booking_type === 'train' 
        ? (booking.item_code || booking.item_id || 'N/A')
        : (booking.item_code || 'N/A');
    
    return { mainTitle, subtitle };
}

console.log('🎨 Testing new booking display format...\n');

mockBookings.forEach((booking, index) => {
    const display = simulateDisplay(booking);
    
    console.log(`${index + 1}. ${booking.booking_type.toUpperCase()} BOOKING (${booking.booking_reference})`);
    console.log(`   📋 Main Title: "${display.mainTitle}"`);
    console.log(`   📝 Subtitle: "${display.subtitle}"`);
    console.log(`   Status: ${booking.booking_status}`);
    
    // Show what this looks like
    console.log('   Display Preview:');
    console.log(`   ┌─────────────────────────────────┐`);
    console.log(`   │ 🚌 ${display.mainTitle.padEnd(25)} │`);
    console.log(`   │    ${display.subtitle.padEnd(25)} │`);
    console.log(`   │    ${booking.booking_status.padEnd(25)} │`);
    console.log(`   └─────────────────────────────────┘`);
    console.log('');
});

console.log('📊 Summary of changes:');
console.log('✅ Bus bookings: Show operator name first, then bus code/ID');
console.log('✅ Train bookings: Show train name first, then train number');
console.log('✅ Flight bookings: Keep current format (airline first, then flight number)');
console.log('✅ Old bookings: Will show fallback name first, then item_code');
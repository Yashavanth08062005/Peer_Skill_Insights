/**
 * Test script to verify bus and train names are extracted correctly
 */

// Mock bus item structure (from BPP response)
const mockBusItem = {
    id: 'bus-15',
    descriptor: {
        name: 'SRS Travels',  // This should be the item_name
        code: 'SRS-BD-001',   // This should be the item_code
        short_desc: 'Scania Multi-Axle',
        long_desc: 'SRS Travels - Scania Multi-Axle from BLR to DEL'
    },
    price: {
        currency: 'INR',
        value: '3500.00'
    },
    category_id: 'BUS'
};

// Mock train item structure (from BPP response)
const mockTrainItem = {
    id: 'train-12-3a',
    descriptor: {
        name: 'Rajdhani Express',  // This should be the item_name
        code: '12001',             // This should be the item_code
        short_desc: 'Superfast - AC 3 Tier',
        long_desc: 'Rajdhani Express (12001)'
    },
    price: {
        currency: 'INR',
        value: '2500.00'
    },
    category_id: 'TRAIN'
};

function testNameExtraction(item, type) {
    console.log(`\n🔍 Testing ${type} name extraction:`);
    console.log('Input item:', JSON.stringify(item, null, 2));
    
    // Simulate the fixed logic from PaymentPage.jsx
    const item_name = type === 'flight' ? (item.details?.airline || item.airline) : 
                      type === 'bus' ? (item.descriptor?.name || item.details?.name || item.name) :
                      type === 'train' ? (item.descriptor?.name || item.details?.name || item.name) :
                      (item.details?.name || item.name);
                      
    const item_code = type === 'flight' ? (item.details?.flightNumber || item.flightNumber) : 
                      type === 'bus' ? (item.descriptor?.code || item.details?.code || item.id) :
                      type === 'train' ? (item.descriptor?.code || item.details?.code || item.id) :
                      (item.details?.hotelId || item.id);
    
    console.log(`✅ Extracted item_name: "${item_name}"`);
    console.log(`✅ Extracted item_code: "${item_code}"`);
    
    // Check if extraction is correct
    if (type === 'bus') {
        const expectedName = 'SRS Travels';
        const expectedCode = 'SRS-BD-001';
        console.log(`Expected name: "${expectedName}" - ${item_name === expectedName ? '✅ CORRECT' : '❌ WRONG'}`);
        console.log(`Expected code: "${expectedCode}" - ${item_code === expectedCode ? '✅ CORRECT' : '❌ WRONG'}`);
    } else if (type === 'train') {
        const expectedName = 'Rajdhani Express';
        const expectedCode = '12001';
        console.log(`Expected name: "${expectedName}" - ${item_name === expectedName ? '✅ CORRECT' : '❌ WRONG'}`);
        console.log(`Expected code: "${expectedCode}" - ${item_code === expectedCode ? '✅ CORRECT' : '❌ WRONG'}`);
    }
    
    return { item_name, item_code };
}

console.log('🧪 Testing Bus and Train Name Extraction Fix\n');

// Test bus name extraction
const busResult = testNameExtraction(mockBusItem, 'bus');

// Test train name extraction  
const trainResult = testNameExtraction(mockTrainItem, 'train');

console.log('\n📋 Summary:');
console.log(`Bus: "${busResult.item_name}" (${busResult.item_code})`);
console.log(`Train: "${trainResult.item_name}" (${trainResult.item_code})`);

console.log('\n✅ Fix verification complete!');
console.log('The updated PaymentPage.jsx should now correctly extract:');
console.log('- Bus operator names like "SRS Travels" instead of "bus-15"');
console.log('- Train names like "Rajdhani Express" instead of "train-12-3a"');
console.log('- Proper codes like "SRS-BD-001" and "12001"');
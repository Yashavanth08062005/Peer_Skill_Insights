/**
 * Test the train route fix by simulating a booking payload
 */

// Simulate a train item with tags structure
const trainItem = {
    id: "train-8-2a",
    descriptor: {
        name: "Rajdhani Express",
        code: "22691"
    },
    price: 5200,
    tags: [
        {
            code: "ROUTE",
            list: [
                { code: "FROM", value: "KSR Bengaluru City Junction (SBC)" },
                { code: "TO", value: "Hazrat Nizamuddin (NZM)" },
                { code: "DURATION", value: "1440 mins" }
            ]
        }
    ]
};

// Test the origin/destination extraction logic
function extractOriginDestination(item, type) {
    let origin = null;
    let destination = null;
    
    if (type === 'train' && item.tags) {
        const routeTag = item.tags.find(tag => tag.code === 'ROUTE');
        if (routeTag) {
            const fromTag = routeTag.list.find(item => item.code === 'FROM');
            const toTag = routeTag.list.find(item => item.code === 'TO');
            origin = fromTag ? fromTag.value : null;
            destination = toTag ? toTag.value : null;
        }
    } else {
        origin = item.origin || item.details?.origin;
        destination = item.destination || item.details?.destination;
    }
    
    return { origin, destination };
}

console.log('🚂 Testing train route extraction...');
console.log('Train item:', JSON.stringify(trainItem, null, 2));

const { origin, destination } = extractOriginDestination(trainItem, 'train');

console.log('\n✅ Extracted route information:');
console.log(`Origin: ${origin}`);
console.log(`Destination: ${destination}`);
console.log(`Route display: ${origin} → ${destination}`);

// Test with a simplified version (just city codes)
const simplifiedOrigin = origin ? origin.match(/\(([^)]+)\)/)?.[1] || origin : null;
const simplifiedDestination = destination ? destination.match(/\(([^)]+)\)/)?.[1] || destination : null;

console.log('\n🏙️ Simplified city codes:');
console.log(`Origin: ${simplifiedOrigin}`);
console.log(`Destination: ${simplifiedDestination}`);
console.log(`Route display: ${simplifiedOrigin} → ${simplifiedDestination}`);
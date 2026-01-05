const http = require('http');

const data = JSON.stringify({
    context: {
        domain: "mobility",
        action: "search",
        transaction_id: "test-txn-" + Date.now(),
        message_id: "test-msg-" + Date.now()
    },
    message: {
        intent: {
            fulfillment: {
                end: {
                    location: {
                        gps: "12.9716,77.5946" // Bangalore
                    }
                }
            }
        }
    }
});

const options = {
    hostname: '127.0.0.1',
    port: 3006,
    path: '/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    timeout: 5000
};

console.log('Sending search request to BPP...');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', chuck => body += chuck);
    res.on('end', () => {
        console.log('Response body:', body.substring(0, 1000)); // Log first 1000 chars
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.on('timeout', () => {
    req.destroy();
    console.error('Request timeout');
});

req.write(data);
req.end();

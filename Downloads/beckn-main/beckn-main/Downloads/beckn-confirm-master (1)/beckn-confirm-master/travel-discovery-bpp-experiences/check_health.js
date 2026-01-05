const http = require('http');

function checkPort(port) {
    const options = {
        hostname: '127.0.0.1',
        port: port,
        path: '/health',
        method: 'GET',
        timeout: 2000 // 2 seconds timeout
    };

    console.log(`Checking port ${port}...`);

    const req = http.request(options, (res) => {
        console.log(`Port ${port} responded with status: ${res.statusCode}`);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(`Port ${port} error: ${e.message}`);
    });

    req.on('timeout', () => {
        req.destroy();
        console.error(`Port ${port} timeout`);
    });

    req.end();
}

checkPort(3006);
checkPort(7003);

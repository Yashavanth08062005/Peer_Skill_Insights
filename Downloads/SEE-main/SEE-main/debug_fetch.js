const http = require('http');

http.get('http://localhost:3001/api/state/3', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Profile data:", JSON.stringify(json.profile, null, 2));
        } catch (e) {
            console.log("Raw data:", data);
        }
    });
}).on('error', (err) => {
    console.error("Error:", err.message);
});

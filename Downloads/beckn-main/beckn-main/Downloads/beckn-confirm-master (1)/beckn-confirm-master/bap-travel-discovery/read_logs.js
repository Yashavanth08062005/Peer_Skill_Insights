const fs = require('fs');
try {
    const logs = fs.readFileSync('schema_error.log', 'utf8');
    console.log(logs);
} catch (e) {
    console.error('Error reading log:', e.message);
}

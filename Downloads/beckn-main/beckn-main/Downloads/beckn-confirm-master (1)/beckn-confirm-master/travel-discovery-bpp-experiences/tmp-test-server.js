const http = require('http');
const PORT = 7003;
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Test server listening on http://127.0.0.1:${PORT}`);
});
server.on('error', (err) => {
  console.error('Server error:', err);
});

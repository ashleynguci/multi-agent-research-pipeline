import './config/loadEnv';
import http from 'http';

const PORT = process.env.PORT ?? 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

server.listen(PORT, () => {
  console.log(`Pipeline server listening on port ${PORT}`);
});

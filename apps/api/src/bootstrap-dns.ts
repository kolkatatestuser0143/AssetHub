import dns from 'node:dns';

const servers = ['1.1.1.1', '8.8.8.8'];

dns.setServers(servers);

if (process.env.NODE_ENV !== 'test') {
  console.log(`[DNS] Using DNS servers: ${servers.join(', ')}`);
}
import * as dns from 'node:dns';

const configuredServers = process.env.DNS_SERVERS
  ?.split(',')
  .map((server) => server.trim())
  .filter(Boolean);

const servers = configuredServers?.length
  ? configuredServers
  : ['1.1.1.1', '8.8.8.8'];

dns.setServers(servers);

if (process.env.NODE_ENV !== 'test') {
  console.log(`[DNS] Node DNS servers: ${servers.join(', ')}`);
}

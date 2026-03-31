require('dotenv').config();
const dns = require('dns');
const { promisify } = require('util');

const resolveSrv = promisify(dns.resolveSrv);
const resolve4 = promisify(dns.resolve4);

(async () => {
  const host = 'cluster0.7vrmrdg.mongodb.net';
  console.log('Testing DNS resolution for Atlas cluster...\n');

  // Test SRV
  try {
    const srv = await resolveSrv(`_mongodb._tcp.${host}`);
    console.log('SRV records:', JSON.stringify(srv, null, 2));
  } catch (e) {
    console.log('SRV lookup FAILED:', e.message);
  }

  // Test A record
  try {
    const a = await resolve4(host);
    console.log('A records:', a);
  } catch (e) {
    console.log('A record lookup FAILED:', e.message);
  }

  // Test with alternate DNS
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('\nRetrying with Google/Cloudflare DNS (8.8.8.8, 1.1.1.1)...');
  try {
    const srv2 = await resolveSrv(`_mongodb._tcp.${host}`);
    console.log('SRV records (alt DNS):', JSON.stringify(srv2, null, 2));
  } catch (e) {
    console.log('SRV lookup with alt DNS FAILED:', e.message);
  }
})();

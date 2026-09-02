/**
 * sms-gateway/test/test-http-live.js
 *
 * Sends real HTTP POST SMS webhook requests to http://localhost:4000/api/sms/inbound
 */

const http = require('http');

const API_URL = 'http://localhost:4000/api/sms/inbound';

function sendSmsWebhook(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runLiveTests() {
  console.log('==================================================');
  console.log('Sending Test SMS Webhooks to http://localhost:4000');
  console.log('==================================================\n');

  // Test 1: Price Query (English - Ethio Telecom)
  console.log('1️⃣  Sending Price Query (English) via Ethio Telecom...');
  const res1 = await sendSmsWebhook({
    provider: 'ethio_telecom',
    from: '+251911000001',
    text: 'PRICE TEFF',
  });
  console.log(`Status: ${res1.statusCode}`);
  console.log('Response:', JSON.stringify(res1.data, null, 2));
  console.log('--------------------------------------------------\n');

  // Test 2: Price Query (Amharic - Ethio Telecom)
  console.log('2️⃣  Sending Price Query (Amharic: "ዋጋ ጤፍ") via Ethio Telecom...');
  const res2 = await sendSmsWebhook({
    provider: 'ethio_telecom',
    from: '+251911000002',
    text: 'ዋጋ ጤፍ',
  });
  console.log(`Status: ${res2.statusCode}`);
  console.log('Response:', JSON.stringify(res2.data, null, 2));
  console.log('--------------------------------------------------\n');

  // Test 3: Price Query (Afaan Oromoo - Safaricom)
  console.log('3️⃣  Sending Price Query (Afaan Oromoo: "GATI XAAFII") via Safaricom...');
  const res3 = await sendSmsWebhook({
    provider: 'safaricom',
    from: '+251977000003',
    text: 'GATI XAAFII',
  });
  console.log(`Status: ${res3.statusCode}`);
  console.log('Response:', JSON.stringify(res3.data, null, 2));
  console.log('--------------------------------------------------\n');

  // Test 4: Listing Submission (Farmer - Safaricom)
  console.log('4️⃣  Sending Farmer Listing Submission ("SELL TEFF 8500 10 ADAMA") via Safaricom...');
  const res4 = await sendSmsWebhook({
    provider: 'safaricom',
    from: '+251977111222',
    text: 'SELL TEFF 8500 10 ADAMA',
  });
  console.log(`Status: ${res4.statusCode}`);
  console.log('Response:', JSON.stringify(res4.data, null, 2));
  console.log('--------------------------------------------------\n');

  // Test 5: Rate Limiting Protection (Burst requests from +251911999999)
  console.log('5️⃣  Testing Rate Limiting (Sending 6 requests from +251911999999)...');
  const rateLimitPhone = '+251911999999';
  for (let i = 1; i <= 6; i++) {
    const res = await sendSmsWebhook({
      provider: 'ethio_telecom',
      from: rateLimitPhone,
      text: `PRICE MAIZE ${i}`,
    });
    console.log(`Request #${i} -> Status: ${res.statusCode} | SMS Response: "${res.data.smsResponse}"`);
  }

  console.log('\n==================================================');
  console.log('🎉 All Live Webhook Tests Executed Successfully!');
  console.log('==================================================');
}

runLiveTests().catch(console.error);

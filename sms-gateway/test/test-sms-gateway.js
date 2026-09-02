/**
 * sms-gateway/test/test-sms-gateway.js
 *
 * Automated test suite for Task 5: SMS Gateway Listener, Multi-language Command Parser, and Rate Limiter.
 */

const assert = require('assert');
const { parseSmsCommand, CROP_MAP } = require('../src/parser');
const { checkRateLimit, MAX_REQUESTS_PER_WINDOW } = require('../src/rateLimiter');

console.log('--------------------------------------------------');
console.log('Running Task 5 SMS Gateway & Parser Automated Tests');
console.log('--------------------------------------------------\n');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

// 1. ENGLISH PRICE QUERIES
runTest('English Price Query - Teff', () => {
  const res = parseSmsCommand('PRICE TEFF');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.strictEqual(res.cropId, 'teff');
});

runTest('English Price Query - Red Onion (Multi-word)', () => {
  const res = parseSmsCommand('PRICE RED ONION');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.strictEqual(res.cropId, 'red-onion');
});

// 2. AMHARIC PRICE QUERIES
runTest('Amharic Price Query - Teff (ዋጋ ጤፍ)', () => {
  const res = parseSmsCommand('ዋጋ ጤፍ');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.strictEqual(res.cropId, 'teff');
});

runTest('Amharic Price Query - Red Onion (ዋጋ ቀይ ሽንኩርት)', () => {
  const res = parseSmsCommand('ዋጋ ቀይ ሽንኩርት');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.strictEqual(res.cropId, 'red-onion');
});

// 3. AFAAN OROMOO PRICE QUERIES
runTest('Afaan Oromoo Price Query - Teff (GATI XAAFII)', () => {
  const res = parseSmsCommand('GATI XAAFII');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.strictEqual(res.cropId, 'teff');
});

runTest('Afaan Oromoo Price Query - Red Onion (GATII QULLUBBII DIIMAA)', () => {
  const res = parseSmsCommand('GATII QULLUBBII DIIMAA');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.strictEqual(res.cropId, 'red-onion');
});

// 4. DIRECT CROP QUERY
runTest('Direct Crop Query - Coffee (ቡና)', () => {
  const res = parseSmsCommand('ቡና');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.strictEqual(res.cropId, 'coffee');
});

// 5. LISTING SUBMISSIONS
runTest('English Listing Submission with Qty (SELL TEFF 8500 10 ADAMA)', () => {
  const res = parseSmsCommand('SELL TEFF 8500 10 ADAMA');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'SUBMIT_LISTING');
  assert.strictEqual(res.cropId, 'teff');
  assert.strictEqual(res.price, 8500);
  assert.strictEqual(res.quantity, 10);
  assert.strictEqual(res.pickupLocation, 'ADAMA');
});

runTest('Amharic Listing Submission (ሽያጭ ጤፍ 8500 10 አዳማ)', () => {
  const res = parseSmsCommand('ሽያጭ ጤፍ 8500 10 አዳማ');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'SUBMIT_LISTING');
  assert.strictEqual(res.cropId, 'teff');
  assert.strictEqual(res.price, 8500);
  assert.strictEqual(res.quantity, 10);
  assert.strictEqual(res.pickupLocation, 'አዳማ');
});

runTest('Afaan Oromoo Listing Submission (GURGURTAA XAAFII 8500 10 ADAMA)', () => {
  const res = parseSmsCommand('GURGURTAA XAAFII 8500 10 ADAMA');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'SUBMIT_LISTING');
  assert.strictEqual(res.cropId, 'teff');
  assert.strictEqual(res.price, 8500);
  assert.strictEqual(res.quantity, 10);
  assert.strictEqual(res.pickupLocation, 'ADAMA');
});

runTest('Listing Submission without explicit quantity (SELL TEFF 8500 ADAMA)', () => {
  const res = parseSmsCommand('SELL TEFF 8500 ADAMA');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.intent, 'SUBMIT_LISTING');
  assert.strictEqual(res.cropId, 'teff');
  assert.strictEqual(res.price, 8500);
  assert.strictEqual(res.quantity, 1);
  assert.strictEqual(res.pickupLocation, 'ADAMA');
});

// 6. INVALID / UNKNOWN COMMANDS
runTest('Invalid Crop Name', () => {
  const res = parseSmsCommand('PRICE UNKNOWN_CROP');
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.intent, 'QUERY_PRICE');
  assert.ok(res.error.includes('Unrecognized crop'));
});

runTest('Empty Text Handling', () => {
  const res = parseSmsCommand('');
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.intent, 'UNKNOWN');
});

// 7. RATE LIMITING FUNCTIONALITY
runTest('Outbound Rate Limiting (5 requests allowed, 6th rate-limited)', () => {
  const testPhone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
  
  for (let i = 1; i <= MAX_REQUESTS_PER_WINDOW; i++) {
    const res = checkRateLimit(testPhone);
    assert.strictEqual(res.allowed, true, `Request ${i} should be allowed`);
  }

  const blockedRes = checkRateLimit(testPhone);
  assert.strictEqual(blockedRes.allowed, false, 'Request 6 should be blocked');
  assert.ok(blockedRes.retryAfterSec > 0, 'retryAfterSec should be positive');
});

console.log('\n--------------------------------------------------');
console.log(`Summary: ${passed}/${total} tests passed.`);
console.log('--------------------------------------------------');

if (passed !== total) {
  process.exit(1);
}

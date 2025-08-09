// Netlify Functions test script
// Bu script functions'lar ishlayotganini tekshiradi

const https = require('https');
const http = require('http');

// Test URLs
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-site.netlify.app'
  : 'http://localhost:8888';

const TESTS = [
  {
    name: 'Health Check',
    url: `${BASE_URL}/.netlify/functions/health`,
    expected: { success: true }
  },
  {
    name: 'Books API',
    url: `${BASE_URL}/.netlify/functions/api-books?limit=5`,
    expected: { success: true }
  },
  {
    name: 'Search API',
    url: `${BASE_URL}/.netlify/functions/api-search?q=kitab&limit=3`,
    expected: { success: true }
  }
];

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, error: 'Invalid JSON' });
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  console.log('🧪 Netlify Functions Test Started...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`URL: ${test.url}`);
      
      const result = await makeRequest(test.url);
      
      if (result.status === 200 && result.data.success) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        console.log('Response:', result);
        failed++;
      }
      
    } catch (error) {
      console.log('❌ ERROR');
      console.log('Error:', error.message);
      failed++;
    }
    
    console.log('---');
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Netlify Functions are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
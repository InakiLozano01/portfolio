const http = require('http');

// List of routes to precompile
const routes = [
  '/',
  '/about',
  '/contact',
  '/experience',
  '/skills',
  '/education',
  '/api/sections/[id]'
];

function checkServerReady() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds max wait time
    
    const checkInterval = setInterval(() => {
      attempts++;
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'HEAD',
        timeout: 300
      }, (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkInterval);
          resolve(true);
        }
      });

      req.on('error', () => {
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Server failed to start in time'));
        }
        // Server not ready yet, will retry
      });

      req.end();
    }, 500); // Check every 500ms
  });
}

async function warmupRoute(route) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: route,
    method: 'GET',
    timeout: 30000 // 30 second timeout for compilation
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`✓ Compiled ${route}`);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`Error compiling ${route}:`, error.message);
      resolve();
    });

    req.end();
  });
}

async function main() {
  try {
    console.log('Waiting for Next.js server...');
    await checkServerReady();
    console.log('Server ready, precompiling routes...');
    
    await Promise.all(routes.map(route => warmupRoute(route)));
    
    console.log('✓ All routes precompiled!');
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

main(); 
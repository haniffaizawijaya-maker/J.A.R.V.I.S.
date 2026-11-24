const https = require('https');
https.get('https://www.tiktok.com/@fatihmakes/video/7708041100635671860', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tIdx = data.indexOf('<title>');
    if (tIdx !== -1) {
      console.log('Title:', data.substring(tIdx, tIdx + 150));
    }
    const dIdx = data.indexOf('name="description"');
    if (dIdx !== -1) {
      console.log('Desc:', data.substring(dIdx, dIdx + 300));
    }
  });
});

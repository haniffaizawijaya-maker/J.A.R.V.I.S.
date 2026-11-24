const https = require('https');
https.get('https://www.youtube.com/watch?v=qw16ascMH4Y', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const idx = data.indexOf('shortDescription');
    if (idx !== -1) {
      console.log('ShortDesc slice:', data.substring(idx, idx + 800));
    } else {
      console.log('shortDescription not found, length:', data.length);
    }
  });
});

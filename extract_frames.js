const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 720,
    height: 1280,
    show: false
  });

  const videoPath = path.join(__dirname, 'public', 'video_uploaded.mp4').replace(/\\/g, '/');
  
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; background:black;">
      <video id="v" src="file:///${videoPath}" preload="auto" muted></video>
      <canvas id="c"></canvas>
    </body>
    </html>
  `)}`);

  win.webContents.on('did-finish-load', async () => {
    try {
      const frames = [1.0, 3.0, 5.0, 8.0];
      for (const t of frames) {
        const dataUrl = await win.webContents.executeJavaScript(`
          new Promise((resolve, reject) => {
            const v = document.getElementById('v');
            v.currentTime = ${t};
            v.onseeked = () => {
              const c = document.getElementById('c');
              c.width = v.videoWidth || 720;
              c.height = v.videoHeight || 1280;
              const ctx = c.getContext('2d');
              ctx.drawImage(v, 0, 0, c.width, c.height);
              resolve(c.toDataURL('image/jpeg', 0.9));
            };
            v.onerror = (e) => reject('Video error');
          })
        `);
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        const outPath = path.join(__dirname, `frame_${t}s.jpg`);
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log(`Saved ${outPath}`);
      }
      console.log('All frames extracted successfully');
      app.quit();
    } catch (e) {
      console.error('Extraction error:', e);
      app.quit();
    }
  });
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'php-emulator',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const pathname = url.pathname;

            if (pathname === '/save_settings.php') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

              if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => {
                  body += chunk;
                });
                req.on('end', () => {
                  try {
                    fs.writeFileSync('./settings.json', body, 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'success' }));
                  } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Failed to save settings' }));
                  }
                });
              } else {
                try {
                  const data = fs.readFileSync('./settings.json', 'utf-8');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(data);
                } catch (e) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ city: 'Mumbai', country: 'India', calcMethod: '2', asrMethod: 'hanafi', adjustment: '0' }));
                }
              }
              return;
            }

            if (pathname === '/load_hadith.php' || pathname === '/load_hadiths.php') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

              if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
              }

              const prayer = url.searchParams.get('prayer') || '';
              const day = url.searchParams.get('day') || '1';
              try {
                const hadiths = JSON.parse(fs.readFileSync('./hadiths.json', 'utf-8'));
                const selected = hadiths.find((h: any) => h.Day === String(day) && h.Prayer === prayer);
                if (selected) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(selected));
                } else {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    Day: String(day),
                    Prayer: prayer,
                    Arabic: 'No Hadith available',
                    English: 'No Hadith available for this day and prayer',
                    Source: 'N/A'
                  }));
                }
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error' }));
              }
              return;
            }

            if (pathname === '/list_mp3.php') {
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              let mp3s = ['fajr.mp3', 'dhuhr.mp3', 'asr.mp3', 'maghrib.mp3', 'isha.mp3', 'Alhamd.mp3', 'buzzer.mp3', 'silent.mp3'];
              try {
                const scannedSet = new Set(mp3s);
                ['./azan', './public/azan'].forEach(dir => {
                  if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    files.filter(f => f.toLowerCase().endsWith('.mp3')).forEach(f => scannedSet.add(f));
                  }
                });
                mp3s = Array.from(scannedSet);
              } catch (e) {
                // ignore
              }
              res.end(JSON.stringify(mp3s));
              return;
            }

            if (pathname === '/upload_audio.php' || pathname === '/upload_audio') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

              if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => {
                  body += chunk;
                });
                req.on('end', () => {
                  try {
                    const parsed = JSON.parse(body);
                    const rawName = (parsed.fileName || parsed.name || 'custom_alert.mp3').trim();
                    // Sanitize filename to prevent directory traversal
                    let safeName = rawName.replace(/[^a-zA-Z0-9_\-\. ]/g, '_');
                    if (!safeName.toLowerCase().endsWith('.mp3')) {
                      safeName += '.mp3';
                    }
                    let base64Data = parsed.base64 || parsed.data || '';
                    if (base64Data.includes(',')) {
                      base64Data = base64Data.split(',')[1];
                    }
                    const buffer = Buffer.from(base64Data, 'base64');

                    // Save to both ./azan and ./public/azan
                    ['./azan', './public/azan'].forEach(dir => {
                      if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                      }
                      fs.writeFileSync(path.join(dir, safeName), buffer);
                    });

                    // If android kiosk assets exist, copy there as well
                    const androidAzan = './android-kiosk/app/src/main/assets/azan';
                    if (fs.existsSync(androidAzan)) {
                      fs.writeFileSync(path.join(androidAzan, safeName), buffer);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                      status: 'success', 
                      fileName: safeName, 
                      audioPath: 'azan/' + safeName 
                    }));
                  } catch (err: any) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: err.message }));
                  }
                });
              } else {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Method Not Allowed' }));
              }
              return;
            }

            if (pathname.startsWith('/azan/') || pathname.startsWith('/public/azan/')) {
              const cleanFileName = decodeURIComponent(pathname.replace(/^\/(public\/)?azan\//, ''));
              let targetPath = path.resolve(__dirname, 'azan', cleanFileName);
              if (!fs.existsSync(targetPath)) {
                targetPath = path.resolve(__dirname, 'public', 'azan', cleanFileName);
              }

              if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
                const stat = fs.statSync(targetPath);
                const fileSize = stat.size;
                const range = req.headers.range;

                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Access-Control-Allow-Origin', '*');

                if (range) {
                  const parts = range.replace(/bytes=/, "").split("-");
                  const start = parseInt(parts[0], 10);
                  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                  const chunksize = (end - start) + 1;
                  const file = fs.createReadStream(targetPath, { start, end });
                  res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Content-Length': chunksize,
                    'Content-Type': 'audio/mpeg',
                  });
                  file.pipe(res);
                } else {
                  res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'audio/mpeg',
                  });
                  fs.createReadStream(targetPath).pipe(res);
                }
                return;
              }
            }

            if (pathname === '/prayer_times_proxy.php') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

              if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
              }

              let endpoint = url.searchParams.get('endpoint') || '';
              url.searchParams.delete('endpoint');

              const dateParam = url.searchParams.get('date');
              if (dateParam) {
                url.searchParams.delete('date');
                if (!endpoint) {
                  const parts = dateParam.split('-');
                  const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateParam;
                  endpoint = `timingsByCity/${formattedDate}`;
                }
              }

              if (!endpoint) {
                endpoint = 'timingsByCity';
              }

              const targetUrl = `https://api.aladhan.com/v1/${endpoint}?${url.searchParams.toString()}`;

              // Simple in-memory cache to prevent hitting Aladhan rate limits
              if (!(globalThis as any).__prayerCache) {
                (globalThis as any).__prayerCache = new Map<string, { time: number; data: any }>();
              }
              const cache: Map<string, { time: number; data: any }> = (globalThis as any).__prayerCache;
              const cachedEntry = cache.get(targetUrl);
              const now = Date.now();
              if (cachedEntry && now - cachedEntry.time < 3600000) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(cachedEntry.data));
                return;
              }

              fetch(targetUrl, {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'PrayerTimesKiosk/1.0'
                }
              })
                .then(async response => {
                  if (!response.ok) throw new Error(`Aladhan HTTP error ${response.status}`);
                  const data = await response.json();
                  cache.set(targetUrl, { time: Date.now(), data });
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(data));
                })
                .catch(err => {
                  if (cachedEntry) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(cachedEntry.data));
                    return;
                  }
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ status: 'error', message: err.message }));
                });
              return;
            }

            if (pathname === '/list_backgrounds.php') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify([]));
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

// server.js
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'fade.db');

let enable1m = true;

const collectorModule = require('./collector'); // uses exported API

app.get('/status', (req,res)=>{
  res.json({ enable1m });
});

app.post('/toggle-1m', (req,res)=>{
  enable1m = !!req.body.enable;
  collectorModule.setEnable1m(enable1m);
  res.json({ ok: true, enable1m });
});

app.post('/backfill', async (req,res)=>{
  try {
    await collectorModule.triggerBackfill();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// Viewer HTML (simple)
app.get('/viewer', (req,res)=>{
  const db = new sqlite3.Database(DB_FILE);
  db.all(`SELECT * FROM metrics_minute ORDER BY ts DESC LIMIT 250`, [], (err, rows)=>{
    db.close();
    if (err) return res.status(500).send(err.message);
    // Simple HTML table
    let html = '<html><head><title>FadeMoe3 Viewer</title><style>body{font-family:Arial;background:#0b1020;color:#e6e9ef;padding:12px}table{border-collapse:collapse;width:100%}th,td{padding:6px;border:1px solid #222}th{background:#151827}</style></head><body>';
    html += `<h3>Last 250 DB Rows</h3>`;
    html += '<table><thead><tr><th>ts</th><th>exchange</th><th>symbol</th><th>close</th><th>fundingRate</th><th>openInterest</th></tr></thead><tbody>';
    for (const r of rows) {
      const ts = r.ts ? new Date(r.ts).toISOString() : '';
      html += `<tr><td>${ts}</td><td>${r.exchange}</td><td>${r.symbol}</td><td>${r.close ?? ''}</td><td>${r.fundingRate ?? ''}</td><td>${r.openInterest ?? ''}</td></tr>`;
    }
    html += '</tbody></table></body></html>';
    res.send(html);
  });
});

app.listen(PORT, ()=> {
  console.log('Server listening on', PORT);
});

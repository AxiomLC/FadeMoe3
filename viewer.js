// viewer.js
const sqlite3 = require('sqlite3').verbose();
const Table = require('cli-table3');
const path = require('path');

const DB_FILE = path.join(__dirname, 'fade.db');
const LIMIT = 250;
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.all(`PRAGMA table_info(metrics_minute)`, [], (err, cols) => {
    if (err) { console.error(err); db.close(); return; }
    const colNames = cols.map(c => c.name);
    db.all(`SELECT * FROM metrics_minute ORDER BY ts DESC LIMIT ?`, [LIMIT], (err2, rows) => {
      if (err2) { console.error(err2); db.close(); return; }
      console.log(`--- Last ${LIMIT} DB Rows ---`);
      // build table header from selected friendly subset (if present) else all
      const headers = ['Timestamp','Exchange','Symbol','Price','FR','OI'];
      const table = new Table({
        head: headers,
        colWidths: [25,12,12,12,12,14],
        wordWrap: true
      });
      rows.forEach(r => {
        const ts = r.ts ? new Date(r.ts).toISOString() : 'N/A';
        const price = (r.close != null) ? Number(r.close).toFixed(6) : 'N/A';
        const fr = (r.fundingRate != null) ? Number(r.fundingRate).toPrecision(6) : 'N/A';
        const oi = (r.openInterest != null) ? Number(r.openInterest).toLocaleString() : 'N/A';
        table.push([ts, r.exchange, r.symbol, price, fr, oi]);
      });
      console.log(table.toString());
      db.close();
    });
  });
});

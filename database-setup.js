// database-setup.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'fade.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS metrics_minute (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exchange TEXT,
      symbol TEXT,
      ts INTEGER,           -- epoch ms
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume REAL,
      fundingRate REAL,
      openInterest REAL,
      lsRatio REAL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_exchange_symbol_ts
    ON metrics_minute(exchange, symbol, ts)
  `);
});

db.close();
console.log('Database setup complete (fade.db)');

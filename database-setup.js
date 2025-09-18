const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create/open database
const db = new sqlite3.Database('./10dayPerps.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        createTables();
    }
});

function createTables() {
    // OHLCV data (1m and 5m candles)
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS ohlcv (
            ts INTEGER,
            symbol TEXT,
            timeframe TEXT,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume REAL,
            PRIMARY KEY (ts, symbol, timeframe)
        )`, (err) => {
            if (err) console.error('Error creating ohlcv table:', err);
            else console.log('OHLCV table created');
        });

        // Main metrics table (1-minute intervals)
        db.run(`CREATE TABLE IF NOT EXISTS metrics_minute (
            ts INTEGER,
            symbol TEXT,
            oi REAL,
            oi_delta_5m REAL,
            funding_rate REAL,
            funding_predicted REAL,
            funding_delta_1h REAL,
            mark_price REAL,
            index_price REAL,
            depth_bid REAL,
            depth_ask REAL,
            depth_imbalance REAL,
            taker_buy_volume REAL,
            taker_sell_volume REAL,
            taker_imbalance REAL,
            long_short_ratio REAL,
            liquidations_5m REAL,
            spread REAL,
            volatility_1m REAL,
            PRIMARY KEY (ts, symbol)
        )`, (err) => {
            if (err) console.error('Error creating metrics_minute table:', err);
            else console.log('Metrics table created');
        });

        // Orderbook snapshots (every 15 seconds)
        db.run(`CREATE TABLE IF NOT EXISTS orderbook_snapshots (
            ts INTEGER,
            symbol TEXT,
            bids TEXT,
            asks TEXT,
            PRIMARY KEY (ts, symbol)
        )`, (err) => {
            if (err) console.error('Error creating orderbook_snapshots table:', err);
            else console.log('Orderbook snapshots table created');
        });

        // Wick events for backtesting
        db.run(`CREATE TABLE IF NOT EXISTS wick_events (
            ts INTEGER,
            symbol TEXT,
            wick_type TEXT,
            wick_size REAL,
            label_ts INTEGER,
            PRIMARY KEY (ts, symbol)
        )`, (err) => {
            if (err) console.error('Error creating wick_events table:', err);
            else console.log('Wick events table created');
        });

        // Alert history
        db.run(`CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER,
            symbol TEXT,
            tier INTEGER,
            score REAL,
            features TEXT,
            predicted_direction TEXT,
            confidence REAL
        )`, (err) => {
            if (err) console.error('Error creating alert_history table:', err);
            else console.log('Alert history table created');
        });

        // Create indexes for better performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_ts ON ohlcv(symbol, ts)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_symbol_ts ON metrics_minute(symbol, ts)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_orderbook_symbol_ts ON orderbook_snapshots(symbol, ts)`);
        
        console.log('All tables and indexes created successfully!');
    });
}

// Function to clean old data (keep only 10 days)
function cleanOldData() {
    const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
    
    db.run(`DELETE FROM ohlcv WHERE ts < ?`, [tenDaysAgo]);
    db.run(`DELETE FROM metrics_minute WHERE ts < ?`, [tenDaysAgo]);
    db.run(`DELETE FROM orderbook_snapshots WHERE ts < ?`, [tenDaysAgo]);
    
    console.log('Old data cleaned (10+ days removed)');
}

module.exports = { db, cleanOldData };
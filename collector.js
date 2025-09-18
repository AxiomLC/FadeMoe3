// collector.js
const ccxt = require('ccxt');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Database connection
const db = new sqlite3.Database('./fade.db');

// Load symbols and perp list
let symbolsDynamic = {};
let perpList = [];

try {
  symbolsDynamic = JSON.parse(fs.readFileSync('./symbols-dynamic.json', 'utf8'));
  console.log('[SYMBOLS] Loaded symbols-dynamic.json');
} catch (e) {
  console.error('[ERR] Failed to load symbols-dynamic.json:', e.message);
  console.log('[INFO] Run: node generate-symbols.js first');
  process.exit(1);
}

try {
  const perpListData = require('./perp-list.js');
  perpList = perpListData.perpList || perpListData || [];
  console.log(`[PERP-LIST] Loaded ${perpList.length} base symbols`);
} catch (e) {
  console.error('[ERR] Failed to load perp-list.js:', e.message);
  process.exit(1);
}

// Exchange configurations
const EXCHANGES = {
  binance: new ccxt.binance({ 
    enableRateLimit: true, 
    options: { 
      defaultType: 'future' // Essential for futures/perp data
    } 
  }),
  bybit: new ccxt.bybit({ 
    enableRateLimit: true,
    options: { 
      defaultType: 'swap' // Bybit uses 'swap' for perps
    }
  }),
  okx: new ccxt.okx({ 
    enableRateLimit: true,
    options: { 
      defaultType: 'swap' // OKX perps are 'swap' type
    }
  }),
  hyperliquid: new ccxt.hyperliquid({ 
    enableRateLimit: true 
    // Hyperliquid is perps-only, no need to set type
  })
  // Comment out coinbase for now - limited perp support
  // coinbase: new ccxt.coinbase({ enableRateLimit: true })
};

const POLL_INTERVAL_MIN = 5;
const FAST_INTERVAL_MIN = 1;
let ENABLE_1M_PULL = true; // default on; server can toggle this
const BACKFILL_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_OHLCV_LIMIT = 1000;

function num(v){ if (v==null) return null; const n = Number(v); return isNaN(n)?null:n; }

function insertRow(row) {
  const q = `INSERT INTO metrics_minute (exchange, symbol, ts, open, high, low, close, volume, fundingRate, openInterest, lsRatio)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(q, [row.exchange, row.symbol, row.ts, row.open, row.high, row.low, row.close, row.volume, row.fundingRate, row.openInterest, row.lsRatio], (e)=>{
    if (e) console.error('[DB ERR]', e.message);
  });
}

// get last timestamp for Binance for a base symbol
function getLastTsForSymbolBase(base) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT ts FROM metrics_minute WHERE exchange='binance' AND symbol=? ORDER BY ts DESC LIMIT 1`, [base], (err,row)=>{
      if (err) return reject(err);
      resolve(row ? row.ts : null);
    });
  });
}

// backfill Binance OHLCV for base symbol from since -> now (in chunks)
async function backfillBinanceFor(base, apiSymbol) {
  if (!apiSymbol) return;
  console.log(`[BACKFILL] start ${base} (${apiSymbol})`);
  const ex = EXCHANGES.binance;
  // find since = lastTs or 10 days ago
  let lastTs = await getLastTsForSymbolBase(base);
  if (!lastTs) {
    // default backfill 10 days
    lastTs = Date.now() - 10*24*60*60*1000;
  } else {
    lastTs += 60*1000; // next minute
  }

  const now = Date.now();
  while (lastTs < now) {
    const limit = MAX_OHLCV_LIMIT;
    try {
      const candles = await ex.fetchOHLCV(apiSymbol, '1m', lastTs, limit);
      if (!candles || !candles.length) break;
      for (const c of candles) {
        const [ts, open, high, low, close, volume] = c;
        insertRow({
          exchange: 'binance',
          symbol: base,
          ts,
          open: num(open),
          high: num(high),
          low: num(low),
          close: num(close),
          volume: num(volume),
          fundingRate: null,
          openInterest: null,
          lsRatio: null
        });
      }
      lastTs = candles[candles.length-1][0] + 60*1000;
      // rate-limit friendly pause
      await new Promise(r=>setTimeout(r, 250));
    } catch (err) {
      console.warn(`[BACKFILL ERR] ${base} ${err.message}`);
      await new Promise(r=>setTimeout(r, 1000));
    }
  }
  console.log(`[BACKFILL] done ${base}`);
}

async function fetchPerSymbolOnce(base) {
  // fetch Binance OHLCV 1m single latest candle (live)
  const apiSymbolBin = symbolsDynamic[base]?.binance;
  if (apiSymbolBin && ENABLE_1M_PULL && EXCHANGES.binance) {
    try {
      // use fetchOHLCV latest 1 candle
      const ohl = await EXCHANGES.binance.fetchOHLCV(apiSymbolBin, '1m', undefined, 1).catch(()=>null);
      if (Array.isArray(ohl) && ohl.length) {
        const c = ohl[0];
        const [ts, open, high, low, close, volume] = c;
        // get perp specs from other exchanges (funding/oi)
        for (const exId of Object.keys(EXCHANGES)) {
          const ex = EXCHANGES[exId];
          if (!ex) continue;
          const apiSym = symbolsDynamic[base]?.[exId];
          // For Binance we already have OHLCV; for other exchanges we may also want to store OHLCV if they provide, but your scope is: OHLCV from Binance only, other specs across exchanges
          let fundingRate = null, openInterest = null, lsRatio = null;
          try {
            if (ex.has && ex.has.fetchFundingRate && apiSym) {
              const fr = await ex.fetchFundingRate(apiSym).catch(()=>null);
              fundingRate = num(fr?.fundingRate ?? fr?.predictedFundingRate ?? fr);
            }
          } catch(e){/*ignore*/}
          try {
            if (ex.has && ex.has.fetchOpenInterest && apiSym) {
              const oi = await ex.fetchOpenInterest(apiSym).catch(()=>null);
              openInterest = num(oi?.openInterest ?? oi?.info?.openInterest ?? oi);
            }
          } catch(e){/*ignore*/}

          // Insert a row for this exchange (store base symbol)
          insertRow({
            exchange: exId,
            symbol: base,
            ts,
            open: num(open),
            high: num(high),
            low: num(low),
            close: num(close),
            volume: num(volume),
            fundingRate,
            openInterest,
            lsRatio
          });
        }
      } else {
        console.warn(`[WARN] Binance OHLCV missing for ${base}`);
      }
    } catch (err) {
      console.warn(`[ERR] Binance fetch for ${base}: ${err.message}`);
    }
  } else {
    // If enable 1m is false, just fetch perp specs (funding/oi) for each exchange and store snapshot with null OHLCV
    for (const exId of Object.keys(EXCHANGES)) {
      const ex = EXCHANGES[exId];
      const apiSym = symbolsDynamic[base]?.[exId];
      if (!apiSym || !ex) continue;
      let fundingRate = null, openInterest = null, ts = Date.now();
      try {
        if (ex.has && ex.has.fetchFundingRate) {
          const fr = await ex.fetchFundingRate(apiSym).catch(()=>null);
          fundingRate = num(fr?.fundingRate ?? fr?.predictedFundingRate ?? fr);
        }
      } catch(e){}
      try {
        if (ex.has && ex.has.fetchOpenInterest) {
          const oi = await ex.fetchOpenInterest(apiSym).catch(()=>null);
          openInterest = num(oi?.openInterest ?? oi?.info?.openInterest ?? oi);
        }
      } catch(e){}
      insertRow({
        exchange: exId,
        symbol: base,
        ts,
        open: null, high: null, low: null, close: null, volume: null,
        fundingRate, openInterest, lsRatio: null
      });
    }
  }
}

// check for backfill need (binance only)
async function checkAndBackfill() {
  for (const base of perpList) {
    try {
      const lastTs = await getLastTsForSymbolBase(base);
      const now = Date.now();
      if (!lastTs || (now - lastTs) > BACKFILL_THRESHOLD_MS) {
        const apiSymbolBin = symbolsDynamic[base]?.binance;
        if (apiSymbolBin) {
          console.log(`[AUTO-BACKFILL] ${base} gap detected. lastTs: ${lastTs}`);
          await backfillBinanceFor(base, apiSymbolBin);
        } else {
          console.log(`[BACKFILL SKIP] ${base} has no binance mapping`);
        }
      }
    } catch (e) {
      console.error(`[ERR] checkAndBackfill ${base}: ${e.message}`);
    }
  }
}

async function runOnceAll() {
  for (const base of perpList) {
    await fetchPerSymbolOnce(base);
    // small delay for rate limits
    await new Promise(r=>setTimeout(r, 150));
  }
}

let running = false;
async function startLoop() {
  if (running) return;
  running = true;
  // initial backfill check
  await checkAndBackfill();
  // first pass
  await runOnceAll();
  // schedule repeated polls
  const interval = ENABLE_1M_PULL ? FAST_INTERVAL_MIN*60*1000 : POLL_INTERVAL_MIN*60*1000;
  setInterval(async ()=>{
    await checkAndBackfill();
    await runOnceAll();
  }, interval);
}

if (require.main === module) {
  // allow --once
  const once = process.argv.includes('--once');
  if (once) {
    (async ()=>{ await checkAndBackfill(); await runOnceAll(); db.close(); })();
  } else {
    startLoop().catch(e=>{ console.error('Collector fatal', e); process.exit(1); });
  }
}

module.exports = {
  startLoop,
  setEnable1m: (v) => { ENABLE_1M_PULL = !!v; },
  triggerBackfill: async () => { await checkAndBackfill(); }
};
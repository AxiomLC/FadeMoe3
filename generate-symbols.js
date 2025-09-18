// generate-symbols.js
const ccxt = require('ccxt');
const fs = require('fs');
const path = require('path');

const perpList = require('./perp-list'); // should export an array of base strings: ["BTC","ETH",...]
const OUT = path.join(__dirname, 'symbols-dynamic.json');

const EXCHANGES = ['binance','bybit','okx','hyperliquid','coinbase'];

function isPerpOrSwap(market) {
  if (!market) return false;
  if (market.contract === true) return true;
  const t = (market.info?.contractType || market.type || '').toString().toLowerCase();
  return t.includes('perpetual') || t.includes('swap') || t.includes('future');
}

async function loadMarketsSafe(id) {
  try {
    const ex = new ccxt[id]({ enableRateLimit: true });
    await ex.loadMarkets();
    return ex;
  } catch (e) {
    console.warn(`[WARN] loadMarkets ${id}: ${e.message}`);
    return null;
  }
}

(async function main(){
  const map = {};
  const exMap = {};
  for (const id of EXCHANGES) {
    exMap[id] = await loadMarketsSafe(id);
  }

  for (const base of perpList) {
    map[base] = {};
    for (const id of EXCHANGES) {
      const ex = exMap[id];
      if (!ex) { map[base][id] = null; continue; }
      // prefer market with same base and contract true
      const markets = Object.values(ex.markets || {});
      const match = markets.find(m => m.base === base && isPerpOrSwap(m) && (m.quote === 'USDT' || m.quote === 'USDC' || m.symbol.toUpperCase().includes('PERP')));
      if (match) {
        map[base][id] = match.symbol; // readable symbol (e.g., 'BTC/USDT', 'BTCUSDT', 'BTC-USDT-SWAP')
        console.log(`[OK] ${id} ${base} -> ${match.symbol}`);
      } else {
        // fallback: any market where symbol startsWith base
        const sub = markets.find(m => m.symbol.startsWith(base + '/'));
        map[base][id] = sub ? sub.symbol : null;
        if (sub) console.log(`[FALLBACK] ${id} ${base} -> ${sub.symbol}`);
        else console.log(`[MISS] ${id} ${base}`);
      }
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  console.log('✅ Wrote symbols-dynamic.json');
})();

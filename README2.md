# FadeMoe3 – Crypto Perp Alert System (Phase 2)

## Current Status
- **Database setup** complete (`database-setup.js` → `fade.db` with `metrics_minute` table).  
- **Collector pipeline** drafted (`collector.js`): polls multi-exchange perp metrics and inserts into DB.  
- **Core config** ready (`core-config.json`) to store AI-determined alert combos.  
- **Viewer script** (`viewer.js`) to inspect recent DB rows.

## Target Exchange Coverage (Locked 6)
1. **Binance** – high volume, fully supported perps.  
2. **Bybit** – major CEX, strong perp liquidity.  
3. **OKX** – high-volume, full perp endpoints.  
4. **Hyperliquid** – trending DEX, DeFi-native perps.    
5. **Coinbase** – optional for institutional expansion, limited perps.

> ❌ Kraken, Kucoin, Bitget omitted to reduce complexity; can be added later if volumes justify.

## Collector Notes
- Each exchange is queried **separately** via CCXT REST (free version).  
- Each DB row includes: `exchange, symbol, ts, open, high, low, close, volume, fundingRate, oi, lsRatio`.  
- Collector is robust: try/catch per exchange & symbol; missing markets or unsupported specs will log errors but continue.

## DB Notes
- DB file: `fade.db` (replace any old 10dayPerps.db references).  
- Table: `metrics_minute`.  
- Example columns:


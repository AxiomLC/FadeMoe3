# 🌙 FadeMoe3 - AI-Powered Perpetuals Wick Zone Alert System

## Project Overview
**FadeMoe3** is a sophisticated crypto perpetual futures alert system designed to predict "wick zones" - rapid price movements caused by liquidation cascades - 5-30 minutes before they occur. The system combines real-time market data analysis with AI backtesting to dynamically optimize prediction algorithms.

## Core Concept
- **Wick Zones**: Sudden price spikes/drops caused by liquidation clusters, stop-loss cascades, and orderbook imbalances
- **Prediction Window**: 5-30 minutes advance warning on 1-minute and 5-minute charts
- **Target**: 50+ perpetual tokens across major exchanges (Binance, Bybit, OKX, Hyperliquid, Coinbase)
- **AI Integration**: Dynamic algorithm optimization via OpenAI/Claude/Mistral APIs

## Architecture

### Data Collection (1-minute intervals)
**8 Critical Metrics** collected every minute:
1. **Open Interest Delta** - Rapid OI changes signal fresh leverage
2. **Funding Rate Momentum** - Extreme funding indicates side imbalances  
3. **Liquidation Clusters** - Recent liquidation spikes and heatmap zones
4. **Orderbook Depth Imbalance** - Thin sides create wick vulnerability
5. **Taker Flow** - Buy vs sell aggressor volume patterns
6. **Mark/Index Premium** - Perp-spot basis stress indicators
7. **Long/Short Ratio** - Position crowding metrics
8. **OHLCV Wick Features** - Historical wick patterns and volatility

### Database Schema (SQLite)
- **10-day rolling window** with automatic cleanup
- **1-minute granularity** for all metrics
- **15-second orderbook snapshots** for depth analysis
- **Backtesting labels** for wick event correlation

### Alert System (3-Tier)
- **Tier 1**: High probability wick zones (>1.4 score) - Audio + Modal alerts
- **Tier 2**: Medium probability (1.0-1.4 score) - Visual notifications  
- **Tier 3**: Low probability (0.7-1.0 score) - Background logging

### AI Backtesting Loop
1. **Historical Analysis**: AI evaluates 10-day database for pattern correlations
2. **Algorithm Generation**: Creates optimized indicator combinations
3. **Performance Testing**: Walk-forward validation with precision/recall metrics
4. **Dynamic Updates**: Overwrites `core-config.json` with superior algorithms
5. **Archive Management**: Stores previous configs with timestamps

## File Structure
```
FadeMoe3/
├── public/                    # Frontend UI
│   ├── index.html            # Main dashboard (dark/purple theme)
│   └── alert-cards.js        # Alert display components
├── archive/                   # Historical configs and backups
├── fade.db             # SQLite database (10-day rolling)
├── server.js                 # Express web server
├── core-trader.js            # Main alert engine
├── collector.js              # Exchange API handler
├── perp-list.js              # 50-token configuration
├── backtester.js             # AI integration module
├── core-config.json          # Dynamic algorithm parameters
├── database-setup.js         # DB schema initialization
├── .env                      # API keys (OpenAI, Claude, Mistral)
└── package.json              # Node.js dependencies
```

## Technology Stack
- **Backend**: Node.js + Express
- **Database**: SQLite3 with 1-minute granularity
- **Exchange APIs**: CCXT library for unified access
- **AI Integration**: OpenAI GPT-4, Claude Sonnet 4, Mistral (toggleable)
- **Frontend**: Vanilla HTML/JS with flex grid layout
- **Real-time Data**: WebSocket connections for low-latency feeds

## Key Features

### Real-Time Processing
- **1-minute data collection** from multiple exchanges
- **5-minute alert evaluation** cycles
- **Manual run** button for immediate analysis
- **Cross-exchange validation** for data reliability

### AI-Powered Optimization  
- **Automated backtesting** against historical wick events
- **Algorithm evolution** based on performance metrics
- **Multi-AI provider** testing (OpenAI vs Claude vs Mistral)
- **Walk-forward validation** to prevent overfitting

### User Interface
- **Dark/purple theme** optimized for trading environments
- **Responsive alert cards** with 5-minute chart previews
- **Wick zone visualization** with shaded price targets
- **Accuracy tracking** and confidence scores
- **Export functionality** for external tools

### Professional Features
- **Rate limit management** across all API endpoints
- **Automatic data cleanup** (10-day rolling window)
- **Alert cooldown periods** to prevent spam
- **Historical performance** tracking and analytics
- **Modular architecture** for easy scaling

## Prediction Methodology

### Signal Combination
Combines multiple market stress indicators into weighted scores:
- **OI spikes** + **funding extremes** + **thin orderbooks** = High probability setup
- **Taker imbalances** + **liquidation clusters** + **basis divergence** = Direction confirmation
- **Historical patterns** + **cross-exchange validation** = Timing precision

### Scoring Algorithm
```javascript
score = Σ(weight_i × normalize(feature_i))
// Features normalized via z-scores using 10-day historical data
// Thresholds: Tier1 ≥1.4, Tier2 ≥1.0, Tier3 ≥0.7
```

### Success Metrics
- **Lead Time**: 5-30 minute advance warning
- **Precision**: >70% accuracy on Tier 1 alerts  
- **Recall**: Capture >80% of significant wick events
- **False Positive Rate**: <20% on high-tier alerts

## Future Enhancements
- **Auto-trading integration** with risk management
- **Social sentiment** analysis (Twitter, Discord, Telegram)
- **Options flow** correlation for institutional positioning
- **Multi-timeframe** analysis (1m, 5m, 15m confluence)
- **Portfolio optimization** for wick-based strategies

## Development Notes
- **Rate Limits**: Carefully managed across all exchanges
- **Data Quality**: Cross-validation and anomaly detection
- **AI Costs**: Optimized API usage with local caching
- **Scalability**: Modular design for additional exchanges/tokens
- **Security**: API keys secured in .env with gitignore

---
*FadeMoe3 represents the fusion of quantitative analysis, real-time data processing, and artificial intelligence to predict some of the most profitable yet dangerous moments in cryptocurrency perpetual futures markets.*
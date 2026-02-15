const q = (id) => document.getElementById(id);

function row(k, v, cls = "") {
  return `<div class="row ${cls}"><span>${k}</span><span>${v}</span></div>`;
}

function fmtPnl(v) {
  return `${Number(v || 0).toFixed(2)}c`;
}

function fmtTs(s) {
  if (!s) return "none";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "none";
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function render(data) {
  const targetStrategy = new URLSearchParams(location.search).get('strategy');
  const loop = data.loop || {};
  const strat = data.strategy || {};
  const perf = data.performance || {};
  const allPositions = data.positions || {};
  const allTrades = data.recent_trades || [];
  const positions = targetStrategy ? Object.fromEntries(Object.entries(allPositions).filter(([,p]) => (p.strategy || data.strategy?.name) === targetStrategy)) : allPositions;
  const trades = targetStrategy ? allTrades.filter(t => (t.strategy || 'legacy') === targetStrategy) : allTrades;
  const byAsset = perf.by_asset || {};
  const byStrategy = perf.by_strategy || {};
  const strategyPerf = targetStrategy ? (byStrategy[targetStrategy] || { trades: 0, wins: 0, losses: 0, pnl_cents: 0, win_rate: 0 }) : null;
  const evalr = data.self_eval || {};
  const recentCycles = loop.recent_cycles || [];

  q("system").innerHTML = [
    row("ACTIVE", String(!!loop.active), loop.active ? "good" : "bad"),
    row("MODE", strat.mode || "paper_only"),
    row("STRATEGY", targetStrategy || strat.name || 'active'),
    row("LAST_UPDATE", fmtTs(loop.last_updated)),
    row("POLL", `${strat.poll_seconds ?? "?"}s`),
    row("SERIES", (strat.series_tickers || []).join(",") || "none"),
    row("FOCUSED_LAST", loop.focused_market_count_last_cycle ?? 0),
  ].join("");

  const rules = targetStrategy ? ((strat.configs || {})[targetStrategy] || strat.rules || {}) : (strat.rules || {});
  q("market").innerHTML = [
    row("ASSETS", (rules.trade_assets || []).join(',') || '?'),
    row("ALLOW NO", String(rules.allow_no_trades ?? true)),
    row("TAKE PROFIT", `${rules.take_profit_cents ?? "?"}c`),
    row("STOP LOSS", `${rules.stop_loss_cents ?? "?"}c`),
    row("MAX HOLD", `${rules.max_hold_minutes ?? "?"}m`),
    row("MIN VOLUME", rules.min_volume ?? "?"),
    row("MAX SPREAD", `${rules.max_spread_cents ?? "?"}c`),
    row("SPIKE FILTER", `${rules.spike_filter_bps ?? "?"}bps`),
    row("MAX OPEN", rules.max_open_positions ?? "?"),
    row("MOMENTUM >=", `${rules.min_momentum_bps ?? "?"}bps`),
    row("MIN EDGE", `${rules.min_edge_cents ?? "?"}c`),
    row("MIN DISLOC", `${rules.min_dislocation_cents ?? "n/a"}c`),
    row("EVAL", evalr.decision || "n/a"),
    row("EVAL WR", `${evalr.win_rate_pct ?? "?"}%`),
    row("EVAL EXP", `${evalr.expectancy_cents ?? "?"}c`),
  ].join("");

  const assetLines = targetStrategy
    ? [`${targetStrategy}: trades=${strategyPerf.trades} win_rate=${strategyPerf.win_rate}% pnl=${Number(strategyPerf.pnl_cents || 0).toFixed(2)}c`]
    : Object.entries(byAsset).map(([a, s]) => `${a}: trades=${s.trades} win_rate=${s.win_rate}% pnl=${Number(s.pnl_cents || 0).toFixed(2)}c`);
  q("candidates").textContent = assetLines.length ? assetLines.join("\n") : "No closed trades yet.";

  q("paper").innerHTML = [
    row("OPEN_POS", Object.keys(positions).length),
    row("REALIZED", targetStrategy ? 'n/a' : fmtPnl(perf.realized_pnl_cents), Number(perf.realized_pnl_cents) >= 0 ? "good" : "bad"),
    row("UNREALIZED", targetStrategy ? 'n/a' : fmtPnl(perf.unrealized_pnl_cents), Number(perf.unrealized_pnl_cents) >= 0 ? "good" : "bad"),
    row("TOTAL", targetStrategy ? fmtPnl(strategyPerf.pnl_cents) : fmtPnl(perf.total_pnl_cents), Number(targetStrategy ? strategyPerf.pnl_cents : perf.total_pnl_cents) >= 0 ? "good" : "bad"),
    row("TRADES", targetStrategy ? strategyPerf.trades : (perf.trades_total ?? 0)),
    row("WIN RATE", `${targetStrategy ? strategyPerf.win_rate : (perf.win_rate ?? 0)}%`),
  ].join("");

  const posList = Object.entries(positions).map(([ticker, p]) =>
    `${ticker}\n  ${p.asset || "UNK"} ${(p.side || "YES")} x${p.qty} entry=${p.entry_price} mark=${p.mark_price} uPnL=${p.unrealized_pnl_cents}c`
  );
  q("positions").textContent = posList.length ? posList.join("\n\n") : "No open positions.";

  const tradeLines = trades.slice(-12).reverse().map((t) =>
    `${t.time} | ${t.asset || "UNK"} | ${t.ticker} | pnl=${Number(t.pnl_cents || 0).toFixed(2)}c | ${t.reason || "n/a"}`
  );
  q("artifacts").textContent = tradeLines.length ? tradeLines.join("\n") : "No recent closed trades.";

  const totals = recentCycles.map(c => Number(c.total_pnl_cents || 0));
  const maxAbs = Math.max(1, ...totals.map(v => Math.abs(v)));
  q("profitChart").innerHTML = totals.length
    ? totals.map(v => {
        const h = Math.max(4, Math.round((Math.abs(v) / maxAbs) * 36));
        return `<div class="profit-col"><div class="profit-bar ${v < 0 ? "neg" : ""}" style="height:${h}px" title="${v.toFixed(2)}c"></div></div>`;
      }).join("")
    : "";

  q("statusText").textContent = loop.active ? "ONLINE / 15M LOOP ACTIVE" : "ONLINE / LOOP INACTIVE";
}

async function load() {
  q("clock").textContent = new Date().toLocaleTimeString();
  try {
    const res = await fetch("./dashboard_latest.json?ts=" + Date.now());
    if (!res.ok) throw new Error("Failed to load dashboard data");
    const data = await res.json();
    render(data);
  } catch (e) {
    q("statusText").textContent = "DATA OFFLINE";
    q("candidates").textContent = String(e.message || e);
  }
}

load();
setInterval(load, 15000);

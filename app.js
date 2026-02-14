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
  const loop = data.loop || {};
  const strat = data.strategy || {};
  const perf = data.performance || {};
  const positions = data.positions || {};
  const trades = data.recent_trades || [];
  const byAsset = perf.by_asset || {};
  const evalr = data.self_eval || {};
  const recentCycles = loop.recent_cycles || [];

  q("system").innerHTML = [
    row("ACTIVE", String(!!loop.active), loop.active ? "good" : "bad"),
    row("MODE", strat.mode || "paper_only"),
    row("LAST_UPDATE", fmtTs(loop.last_updated)),
    row("POLL", `${strat.poll_seconds ?? "?"}s`),
    row("SERIES", (strat.series_tickers || []).join(",") || "none"),
    row("FOCUSED_LAST", loop.focused_market_count_last_cycle ?? 0),
  ].join("");

  const rules = strat.rules || {};
  q("market").innerHTML = [
    row("BUY YES <=", `${rules.buy_yes_below_cents ?? "?"}c`),
    row("TAKE PROFIT", `${rules.take_profit_cents ?? "?"}c`),
    row("STOP LOSS", `${rules.stop_loss_cents ?? "?"}c`),
    row("MAX HOLD", `${rules.max_hold_minutes ?? "?"}m`),
    row("MIN VOLUME", rules.min_volume ?? "?"),
    row("MAX SPREAD", `${rules.max_spread_cents ?? "?"}c`),
    row("MAX OPEN", rules.max_open_positions ?? "?"),
    row("SELL YES >=", `${rules.sell_yes_above_cents ?? "?"}c`),
    row("MOMENTUM >=", `${rules.momentum_min_cents ?? "?"}c`),
    row("EVAL", evalr.decision || "n/a"),
    row("EVAL WR", `${evalr.win_rate_pct ?? "?"}%`),
    row("EVAL EXP", `${evalr.expectancy_cents ?? "?"}c`),
  ].join("");

  const assetLines = Object.entries(byAsset).map(([a, s]) => {
    return `${a}: trades=${s.trades} win_rate=${s.win_rate}% pnl=${Number(s.pnl_cents || 0).toFixed(2)}c`;
  });
  q("candidates").textContent = assetLines.length ? assetLines.join("\n") : "No closed trades yet.";

  q("paper").innerHTML = [
    row("OPEN_POS", perf.open_positions ?? 0),
    row("REALIZED", fmtPnl(perf.realized_pnl_cents), Number(perf.realized_pnl_cents) >= 0 ? "good" : "bad"),
    row("UNREALIZED", fmtPnl(perf.unrealized_pnl_cents), Number(perf.unrealized_pnl_cents) >= 0 ? "good" : "bad"),
    row("TOTAL", fmtPnl(perf.total_pnl_cents), Number(perf.total_pnl_cents) >= 0 ? "good" : "bad"),
    row("TRADES", perf.trades_total ?? 0),
    row("WIN RATE", `${perf.win_rate ?? 0}%`),
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
        const h = Math.max(6, Math.round((Math.abs(v) / maxAbs) * 56));
        return `<div class="profit-bar ${v < 0 ? "neg" : ""}" style="height:${h}px" title="${v.toFixed(2)}c"></div>`;
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

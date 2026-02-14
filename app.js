const q = (id) => document.getElementById(id);

function row(k, v, cls = "") {
  return `<div class="row ${cls}"><span>${k}</span><span>${v}</span></div>`;
}

function fmtPnl(v) {
  const n = Number(v || 0).toFixed(2);
  return `${n}c`;
}

function render(data) {
  const sys = data.system || {};
  const market = data.market || {};
  const paper = data.paper || {};
  const live = data.live_loop || {};
  const cands = market.candidates || [];
  const positions = live.state_positions || paper.positions || {};
  const arts = data.artifacts || {};

  q("system").innerHTML = [
    row("MODE", sys.mode || "?"),
    row("TRADE_ENABLED", String(sys.trade_enabled), sys.trade_enabled ? "bad" : "good"),
    row("LOOP_ACTIVE", String(!!live.active), live.active ? "good" : "bad"),
    row("LOOP_POLL", `${live.poll_seconds ?? "?"}s`),
    row("ASSETS", (live.assets || []).join(",") || "?"),
    row("UPDATED", data.generated_at || "?")
  ].join("");

  q("market").innerHTML = [
    row("FETCHED", market.fetched ?? 0),
    row("ELIGIBLE", market.eligible ?? 0),
    row("FALLBACK", String(market.fallback_used ?? false), market.fallback_used ? "warn" : "good"),
    row("CANDIDATES", cands.length),
    row("FOCUSED_NOW", live.focused_market_count ?? 0)
  ].join("");

  q("paper").innerHTML = [
    row("OPEN_POS", live.open_positions ?? paper.open_positions ?? 0),
    row("REALIZED", fmtPnl(paper.realized_pnl_cents), Number(paper.realized_pnl_cents) >= 0 ? "good" : "bad"),
    row("UNREALIZED", fmtPnl(paper.unrealized_pnl_cents), Number(paper.unrealized_pnl_cents) >= 0 ? "good" : "bad"),
    row("TOTAL", fmtPnl(live.total_pnl_cents ?? paper.total_pnl_cents), Number(live.total_pnl_cents ?? paper.total_pnl_cents) >= 0 ? "good" : "bad"),
    row("WIN RATE", `${paper.win_rate ?? 0}%`),
    row("TRADES", paper.trades_total ?? 0)
  ].join("");

  q("candidates").textContent = cands.length
    ? cands.map((c, i) => `${i + 1}. ${c.market_ticker}\n   score=${c.score} vol=${c.volume} spread=${c.spread_bps} mid=${c.mid_price}`).join("\n\n")
    : "No candidates in latest scan.";

  const posList = Object.entries(positions).map(([ticker, p]) =>
    `${ticker}\n  ${(p.side || "YES")} x${p.qty} entry=${p.entry_price} mark=${p.mark_price} uPnL=${p.unrealized_pnl_cents}c`
  );
  q("positions").textContent = posList.length ? posList.join("\n\n") : "No open paper positions.";

  q("artifacts").innerHTML = [
    row("RANKING", arts.ranking || "none"),
    row("BACKTEST", arts.backtest || "none"),
    row("PROPOSAL", arts.proposal || "none"),
    row("SUMMARY", arts.daily_summary || "none"),
    row("LAST_LOOP", live.last_updated || "none")
  ].join("");

  q("statusText").textContent = live.active ? "ONLINE / LOOP ACTIVE" : "ONLINE / LOOP IDLE";
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

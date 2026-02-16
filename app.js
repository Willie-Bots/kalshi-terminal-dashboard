const DATA_URL = './dashboard_latest.json';
const $ = (id) => document.getElementById(id);
const qp = new URLSearchParams(location.search);
const strategy = qp.get('strategy') || '';
const cents = (n) => `${n >= 0 ? '+' : '-'}$${Math.abs(Number(n || 0) / 100).toFixed(2)}`;

function drawLine(canvas, vals) {
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  if (!vals.length) return;
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = (i / Math.max(vals.length - 1, 1)) * (W - 20) + 10;
    const y = H - 12 - ((v - min) / span) * (H - 24);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = vals[vals.length - 1] >= 0 ? '#69f0ae' : '#ff6b6b';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function outline(cfg = {}) {
  return [
    `trade_assets: ${(cfg.trade_assets || []).join(', ') || 'n/a'}`,
    `take_profit_cents: ${cfg.take_profit_cents ?? 'n/a'}`,
    `stop_loss_cents: ${cfg.stop_loss_cents ?? 'n/a'}`,
    `max_hold_minutes: ${cfg.max_hold_minutes ?? 'n/a'}`,
    `min_edge_cents: ${cfg.min_edge_cents ?? 'n/a'}`,
    `min_momentum_bps: ${cfg.min_momentum_bps ?? 'n/a'}`,
    `spike_filter_bps: ${cfg.spike_filter_bps ?? 'n/a'}`,
    `max_open_positions: ${cfg.max_open_positions ?? 'n/a'}`,
  ].join('\n');
}

async function boot() {
  const data = await fetch(DATA_URL).then(r => r.json());
  const available = data.strategy?.available || [];
  const target = strategy || available[0] || 'unknown';

  $('strategyName').textContent = target;
  $('strategyMeta').textContent = `Updated ${new Date(data.generated_at).toLocaleString()}`;

  const sPerf = data.performance?.by_strategy?.[target] || { pnl_cents: 0 };
  const cycles = data.loop?.by_strategy?.[target]?.recent_cycles || [];
  const series = cycles.map(c => Number(c.total_pnl_cents || 0));
  drawLine($('strategyChart'), series.length ? series : [Number(sPerf.pnl_cents || 0)]);

  const pnl = Number(sPerf.pnl_cents || 0);
  $('strategyPnl').textContent = `PnL ${cents(pnl)}`;
  $('strategyPnl').className = `kpi ${pnl >= 0 ? 'good' : 'bad'}`;

  const trades = (data.recent_trades || []).filter(t => t.strategy === target).slice().reverse();
  $('tradeRows').innerHTML = trades.length ? trades.map(t => `
    <tr>
      <td>${(t.time || '').slice(11,19)}</td>
      <td>${t.ticker || ''}</td>
      <td>${t.side || ''}</td>
      <td>${t.entry ?? ''}</td>
      <td>${t.exit ?? ''}</td>
      <td class="${(t.pnl_cents||0)>=0?'good':'bad'}">${cents(t.pnl_cents || 0)}</td>
      <td>${t.reason || ''}</td>
    </tr>`).join('') : '<tr><td colspan="7">No trades yet.</td></tr>';

  const cfg = data.strategy?.configs?.[target] || {};
  $('strategyOutline').textContent = outline(cfg);
  $('strategyScript').textContent = data.strategy?.scripts?.[target] || '# strategy script unavailable';
}

boot().catch((e) => { $('strategyMeta').textContent = `Load error: ${e.message}`; });

const DATA_URL = './dashboard_latest.json';

const $ = (id) => document.getElementById(id);
const cents = (n) => `${n >= 0 ? '+' : '-'}$${Math.abs(Number(n || 0) / 100).toFixed(2)}`;

function drawLine(canvas, vals) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  if (!vals.length) return;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = (i / Math.max(1, vals.length - 1)) * (W - 20) + 10;
    const y = H - 12 - ((v - min) / span) * (H - 24);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = vals[vals.length - 1] >= 0 ? '#69f0ae' : '#ff6b6b';
  ctx.lineWidth = 2;
  ctx.stroke();
}

async function boot() {
  const data = await fetch(DATA_URL).then(r => r.json());
  $('meta').textContent = `Updated ${new Date(data.generated_at).toLocaleString()}`;

  const byStrategy = data.performance?.by_strategy || {};
  const rows = Object.entries(byStrategy).sort((a,b)=>b[1].pnl_cents-a[1].pnl_cents);

  const totals = rows.map(([,s]) => Number(s.pnl_cents || 0));
  drawLine($('overallChart'), totals.length ? totals : [0]);

  const total = Number(data.performance?.total_pnl_cents || 0);
  $('overallPnl').textContent = `Overall ${cents(total)}`;
  $('overallPnl').className = `kpi ${total >= 0 ? 'good' : 'bad'}`;

  $('strategyRows').innerHTML = rows.map(([name, s]) => `
    <tr>
      <td><a class="link" href="./strategy.html?strategy=${encodeURIComponent(name)}">${name}</a></td>
      <td>${s.trades ?? 0}</td>
      <td>${(s.win_rate ?? 0).toFixed(1)}%</td>
      <td class="${(s.pnl_cents||0)>=0?'good':'bad'}">${cents(s.pnl_cents || 0)}</td>
    </tr>
  `).join('');
}

boot().catch((e) => { $('meta').textContent = `Load error: ${e.message}`; });

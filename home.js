const q = (id) => document.getElementById(id);

function row(k, v) { return `<div class="row"><span>${k}</span><span>${v}</span></div>`; }

async function load() {
  q('clock').textContent = new Date().toLocaleTimeString();
  try {
    const res = await fetch('./dashboard_latest.json?ts=' + Date.now());
    if (!res.ok) throw new Error('failed');
    const d = await res.json();
    const bys = d.performance?.by_strategy || {};
    const loopBy = d.loop?.by_strategy || {};
    const strategyCount = (d.strategy?.available || []).length;
    const runningCount = Object.values(loopBy).filter(x => !!x?.active).length;
    q('active').innerHTML = [
      row('MODE', d.strategy?.mode || 'paper_only'),
      row('PARALLEL', String(!!d.strategy?.parallel)),
      row('STRATEGIES', strategyCount),
      row('RUNNING', runningCount),
      row('LAST_UPDATE', d.loop?.last_updated || 'none'),
      row('TOTAL_PNL', `${Number(d.performance?.total_pnl_cents || 0).toFixed(2)}c`),
    ].join('');

    const avail = d.strategy?.available || [];
    const lines = avail.map(s => {
      const st = bys[s] || { trades: 0, win_rate: 0, pnl_cents: 0 };
      const run = loopBy[s]?.active ? 'active' : 'idle';
      return `${s} [${run}]\n  trades=${st.trades} win_rate=${st.win_rate}% pnl=${Number(st.pnl_cents || 0).toFixed(2)}c`;
    });
    q('library').textContent = lines.join('\n\n') || 'No strategies';
    q('statusText').textContent = 'ONLINE';
  } catch {
    q('statusText').textContent = 'DATA OFFLINE';
  }
}

load();
setInterval(load, 15000);

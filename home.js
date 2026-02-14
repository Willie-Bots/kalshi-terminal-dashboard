const q = (id) => document.getElementById(id);

function row(k, v) { return `<div class="row"><span>${k}</span><span>${v}</span></div>`; }

async function load() {
  q('clock').textContent = new Date().toLocaleTimeString();
  try {
    const res = await fetch('./dashboard_latest.json?ts=' + Date.now());
    if (!res.ok) throw new Error('failed');
    const d = await res.json();
    const active = d.strategy?.name || 'unknown';
    const bys = d.performance?.by_strategy || {};
    q('active').innerHTML = [
      row('NAME', active),
      row('MODE', d.strategy?.mode || 'paper_only'),
      row('LAST_UPDATE', d.loop?.last_updated || 'none'),
      row('TOTAL_PNL', `${Number(d.performance?.total_pnl_cents || 0).toFixed(2)}c`),
    ].join('');

    const avail = d.strategy?.available || [];
    const lines = avail.map(s => {
      const st = bys[s] || { trades: 0, win_rate: 0, pnl_cents: 0 };
      return `${s}\n  trades=${st.trades} win_rate=${st.win_rate}% pnl=${Number(st.pnl_cents || 0).toFixed(2)}c`;
    });
    q('library').textContent = lines.join('\n\n') || 'No strategies';
    q('statusText').textContent = 'ONLINE';
  } catch {
    q('statusText').textContent = 'DATA OFFLINE';
  }
}

load();
setInterval(load, 15000);

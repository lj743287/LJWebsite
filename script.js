const APP_VERSION = 'v3.0.0';
const SNAPSHOT_PATH = './data/league-one.json';

const tableBody = document.querySelector('#standingsTable tbody');
const statusEl = document.querySelector('#status');
const seasonInfoEl = document.querySelector('#seasonInfo');
const versionEl = document.querySelector('#appVersion');
const refreshButton = document.querySelector('#refreshButton');

const FALLBACK_ROWS = [
  'Birmingham City', 'Barnsley', 'Blackpool', 'Bolton Wanderers', 'Bristol Rovers', 'Burton Albion',
  'Cambridge United', 'Crawley Town', 'Charlton Athletic', 'Exeter City', 'Huddersfield Town',
  'Leyton Orient', 'Lincoln City', 'Mansfield Town', 'Northampton Town', 'Peterborough United',
  'Reading', 'Rotherham United', 'Shrewsbury Town', 'Stevenage', 'Stockport County',
  'Wigan Athletic', 'Wrexham', 'Wycombe Wanderers'
].map((teamName, index) => ({
  rank: index + 1,
  teamName,
  played: '-',
  won: '-',
  drawn: '-',
  lost: '-',
  goalDiff: '-',
  points: '-'
}));

function renderRows(rows) {
  tableBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${row.rank}</td>
        <td>${row.teamName}</td>
        <td>${row.played}</td>
        <td>${row.won}</td>
        <td>${row.drawn}</td>
        <td>${row.lost}</td>
        <td>${row.goalDiff}</td>
        <td><strong>${row.points}</strong></td>
      </tr>
    `
    )
    .join('');
}

function formatDate(value) {
  if (!value) return 'unknown time';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

async function loadSnapshot() {
  statusEl.textContent = 'Loading League One table…';

  try {
    const response = await fetch(`${SNAPSHOT_PATH}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rows = Array.isArray(data.rows) && data.rows.length ? data.rows : FALLBACK_ROWS;

    renderRows(rows);
    seasonInfoEl.textContent = data.seasonLabel || 'English League One';
    versionEl.textContent = `Version: ${APP_VERSION}`;
    statusEl.textContent = `Updated ${formatDate(data.updatedAt)} • Source: ${data.source || 'snapshot file'}`;
  } catch (error) {
    console.error('Snapshot load failed:', error);
    renderRows(FALLBACK_ROWS);
    seasonInfoEl.textContent = 'English League One';
    versionEl.textContent = `Version: ${APP_VERSION}`;
    statusEl.textContent = 'Snapshot unavailable, showing fallback team list.';
  }
}

refreshButton.addEventListener('click', loadSnapshot);
renderRows(FALLBACK_ROWS);
versionEl.textContent = `Version: ${APP_VERSION}`;
loadSnapshot();

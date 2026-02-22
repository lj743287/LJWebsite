const APP_VERSION = 'v4.2.0';

const refreshButton = document.querySelector('#refreshButton');
const statusEl = document.querySelector('#status');
const seasonInfoEl = document.querySelector('#seasonInfo');
const versionEl = document.querySelector('#appVersion');
const tableBody = document.querySelector('#standingsTable tbody');

if (versionEl) versionEl.textContent = `Version: ${APP_VERSION}`;

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function renderRows(rows) {
  if (!tableBody || !rows?.length) return;
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

function mapSportsDb(payload) {
  const table = payload?.table ?? [];
  if (!table.length) return null;

  const season = table[0]?.strSeason || '';

  return {
    source: 'TheSportsDB live table',
    season,
    seasonLabel: `English League One${season ? ` • ${season}` : ''}`,
    rows: table.map((team, index) => ({
      rank: Number(team.intRank) || index + 1,
      teamName: team.strTeam ?? 'Unknown Team',
      played: team.intPlayed ?? '-',
      won: team.intWin ?? '-',
      drawn: team.intDraw ?? '-',
      lost: team.intLoss ?? '-',
      goalDiff: team.intGoalDifference ?? '-',
      points: team.intPoints ?? '-'
    }))
  };
}

function seasonStartYear(season) {
  if (!season) return -1;
  const match = /^(\d{4})-(\d{4})$/.exec(season.trim());
  return match ? Number(match[1]) : -1;
}

function buildSportsDbCandidates() {
  const year = new Date().getFullYear();
  const seasons = [
    `${year}-${year + 1}`,
    `${year - 1}-${year}`,
    `${year + 1}-${year + 2}`,
    `${year - 2}-${year - 1}`
  ];

  return seasons.map(
    (season) => `https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4396&s=${season}`
  );
}

async function fetchCurrentLiveStandings() {
  const errors = [];
  const successes = [];

  for (const url of buildSportsDbCandidates()) {
    try {
      const response = await fetch(`${url}&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const mapped = mapSportsDb(payload);
      if (!mapped?.rows?.length) throw new Error('No rows');
      successes.push(mapped);
    } catch (error) {
      errors.push(`${url} -> ${error.message}`);
    }
  }

  if (!successes.length) {
    throw new Error(errors.join(' | '));
  }

  successes.sort((a, b) => seasonStartYear(b.season) - seasonStartYear(a.season));
  return successes[0];
}

async function refreshLiveTable() {
  setStatus('Loading current League One table from live API…');

  try {
    const live = await fetchCurrentLiveStandings();
    renderRows(live.rows);
    if (seasonInfoEl) seasonInfoEl.textContent = live.seasonLabel;
    setStatus(`Live API loaded (${live.source}) • ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error('Live API fetch failed:', error);
    setStatus('Live API unavailable right now. Showing embedded fallback table.');
  }
}

refreshButton?.addEventListener('click', refreshLiveTable);
refreshLiveTable();

const APP_VERSION = 'v4.6.0';
const MIN_EXPECTED_TEAMS = 24;
const SNAPSHOT_PATH = './data/league-one.json';

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

function currentSeasonStartYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? year : year - 1;
}

function seasonStringFromStart(startYear) {
  return `${startYear}-${startYear + 1}`;
}

function mapSportsDb(payload) {
  const table = payload?.table ?? [];
  if (!table.length) return null;

  const season = table[0]?.strSeason || '';
  const rows = table.map((team, index) => ({
    rank: Number(team.intRank) || index + 1,
    teamName: team.strTeam ?? 'Unknown Team',
    played: Number(team.intPlayed ?? 0),
    won: team.intWin ?? '-',
    drawn: team.intDraw ?? '-',
    lost: team.intLoss ?? '-',
    goalDiff: team.intGoalDifference ?? '-',
    points: team.intPoints ?? '-'
  }));

  const totalPlayed = rows.reduce((sum, row) => sum + (Number(row.played) || 0), 0);

  return {
    source: 'TheSportsDB live table',
    season,
    seasonLabel: `English League One${season ? ` • ${season}` : ''}`,
    rows,
    totalPlayed
  };
}

function buildSportsDbCandidates() {
  const start = currentSeasonStartYear();
  const seasons = [
    seasonStringFromStart(start),
    seasonStringFromStart(start - 1),
    seasonStringFromStart(start + 1),
    seasonStringFromStart(start - 2)
  ];

  return seasons.map((season) => ({
    season,
    url: `https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4396&s=${season}`
  }));
}

function pickBestSeason(results) {
  const targetSeason = seasonStringFromStart(currentSeasonStartYear());
  const exact = results.filter((r) => r.season === targetSeason);

  if (exact.length) {
    exact.sort((a, b) => b.totalPlayed - a.totalPlayed);
    return exact[0];
  }

  results.sort((a, b) => {
    const yearA = Number((a.season || '').slice(0, 4)) || 0;
    const yearB = Number((b.season || '').slice(0, 4)) || 0;
    return yearB - yearA || b.totalPlayed - a.totalPlayed;
  });

  return results[0];
}

async function fetchCurrentLiveStandings() {
  const errors = [];
  const successes = [];

  for (const source of buildSportsDbCandidates()) {
    try {
      const response = await fetch(`${source.url}&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const mapped = mapSportsDb(payload);
      if (!mapped?.rows?.length) throw new Error('No rows');
      if (mapped.rows.length < MIN_EXPECTED_TEAMS) {
        throw new Error(`Partial table (${mapped.rows.length} teams)`);
      }

      successes.push(mapped);
    } catch (error) {
      errors.push(`${source.season}: ${error.message}`);
    }
  }

  if (!successes.length) throw new Error(errors.join(' | '));
  return pickBestSeason(successes);
}

async function fetchSnapshotStandings() {
  const response = await fetch(`${SNAPSHOT_PATH}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (rows.length < MIN_EXPECTED_TEAMS) throw new Error(`Snapshot partial (${rows.length})`);
  return {
    source: payload?.source || 'snapshot',
    seasonLabel: payload?.seasonLabel || 'English League One',
    rows
  };
}

async function refreshLiveTable() {
  setStatus('Loading full current League One table from live API…');

  try {
    const live = await fetchCurrentLiveStandings();
    if ((live.rows?.length || 0) < MIN_EXPECTED_TEAMS) {
      throw new Error(`Live table incomplete (${live.rows?.length || 0} teams)`);
    }
    renderRows(live.rows);
    if (seasonInfoEl) seasonInfoEl.textContent = live.seasonLabel;
    setStatus(`Live API loaded (${live.source}) • ${live.rows.length} teams • ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error('Live API fetch failed:', error);
    try {
      const snapshot = await fetchSnapshotStandings();
      renderRows(snapshot.rows);
      if (seasonInfoEl) seasonInfoEl.textContent = snapshot.seasonLabel;
      setStatus(`Live API unavailable, showing snapshot (${snapshot.source}) • ${snapshot.rows.length} teams.`);
    } catch (snapshotError) {
      console.error('Snapshot fallback failed:', snapshotError);
      setStatus('Live and snapshot data unavailable right now.');
    }
  }
}

refreshButton?.addEventListener('click', refreshLiveTable);
refreshLiveTable();

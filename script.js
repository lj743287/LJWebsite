const standingsTable = document.querySelector('#standingsTable');
const tableBody = standingsTable?.querySelector('tbody');
const statusEl = document.querySelector('#status');
const seasonInfoEl = document.querySelector('#seasonInfo');
const refreshButton = document.querySelector('#refreshButton');

const LEAGUE_ENDPOINT = 'https://api-football-standings.azharimm.dev/leagues/eng.3/standings';

const FALLBACK_TEAMS = [
  'Birmingham City', 'Barnsley', 'Blackpool', 'Bolton Wanderers', 'Bristol Rovers', 'Burton Albion',
  'Cambridge United', 'Crawley Town', 'Charlton Athletic', 'Exeter City', 'Huddersfield Town',
  'Leyton Orient', 'Lincoln City', 'Mansfield Town', 'Northampton Town', 'Peterborough United',
  'Reading', 'Rotherham United', 'Shrewsbury Town', 'Stevenage', 'Stockport County',
  'Wigan Athletic', 'Wrexham', 'Wycombe Wanderers'
];

function stat(stats, key) {
  return stats.find((entry) => entry.name === key)?.value ?? '-';
}

function renderRows(rows) {
  if (!tableBody) return;
  tableBody.innerHTML = rows.map((row) => `
    <tr title="${row.note || ''}">
      <td>${row.rank}</td>
      <td>${row.teamName}</td>
      <td>${row.played}</td>
      <td>${row.won}</td>
      <td>${row.drawn}</td>
      <td>${row.lost}</td>
      <td>${row.goalDiff}</td>
      <td><strong>${row.points}</strong></td>
    </tr>
  `).join('');
}

function renderFallbackTable(message = 'Live feed unavailable right now. Showing League One team list as fallback.') {
  const fallbackRows = FALLBACK_TEAMS.map((teamName, index) => ({
    rank: index + 1,
    teamName,
    played: '-',
    won: '-',
    drawn: '-',
    lost: '-',
    goalDiff: '-',
    points: '-',
    note: 'Fallback team list shown because live feed is temporarily unavailable.'
  }));

  renderRows(fallbackRows);
  if (seasonInfoEl) seasonInfoEl.textContent = 'English League One';
  if (statusEl) statusEl.textContent = message;
}

function normalizeStandings(standings) {
  return standings.map((entry, index) => {
    const stats = entry.stats ?? [];
    const rank = stat(stats, 'rank');
    return {
      rank: rank === '-' ? index + 1 : rank,
      teamName: entry.team?.displayName ?? 'Unknown Team',
      played: stat(stats, 'gamesPlayed'),
      won: stat(stats, 'wins'),
      drawn: stat(stats, 'ties'),
      lost: stat(stats, 'losses'),
      goalDiff: stat(stats, 'pointDifferential'),
      points: stat(stats, 'points'),
      note: entry.note?.description ?? ''
    };
  });
}

function buildCandidateUrls() {
  const year = new Date().getFullYear();
  const seasons = [year + 1, year, year - 1, year - 2];
  return [`${LEAGUE_ENDPOINT}?sort=asc`, ...seasons.map((season) => `${LEAGUE_ENDPOINT}?season=${season}&sort=asc`)];
}

async function fetchStandingsFromCandidates() {
  const errors = [];
  for (const url of buildCandidateUrls()) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const standings = payload?.data?.standings ?? [];
      if (!standings.length) throw new Error('No standings in response');
      return {
        standings: normalizeStandings(standings),
        seasonLabel: payload?.data?.seasonDisplay ?? 'League One'
      };
    } catch (error) {
      errors.push(`${url} -> ${error.message}`);
    }
  }
  throw new Error(errors.join(' | '));
}

async function loadStandings() {
  if (statusEl) statusEl.textContent = 'Loading latest standings…';
  try {
    const result = await fetchStandingsFromCandidates();
    renderRows(result.standings);
    if (seasonInfoEl) seasonInfoEl.textContent = result.seasonLabel;
    if (statusEl) statusEl.textContent = `Showing ${result.standings.length} teams. Source: live data.`;
  } catch (error) {
    console.error('Unable to fetch live standings:', error);
    renderFallbackTable();
  }
}

renderFallbackTable('Showing fallback table while live data loads…');
refreshButton?.addEventListener('click', loadStandings);
loadStandings();

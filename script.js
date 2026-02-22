const standingsTable = document.querySelector('#standingsTable');
const tableBody = standingsTable?.querySelector('tbody');
const statusEl = document.querySelector('#status');
const seasonInfoEl = document.querySelector('#seasonInfo');
const refreshButton = document.querySelector('#refreshButton');

const FALLBACK_TEAMS = [
  'Birmingham City', 'Barnsley', 'Blackpool', 'Bolton Wanderers', 'Bristol Rovers', 'Burton Albion',
  'Cambridge United', 'Crawley Town', 'Charlton Athletic', 'Exeter City', 'Huddersfield Town',
  'Leyton Orient', 'Lincoln City', 'Mansfield Town', 'Northampton Town', 'Peterborough United',
  'Reading', 'Rotherham United', 'Shrewsbury Town', 'Stevenage', 'Stockport County',
  'Wigan Athletic', 'Wrexham', 'Wycombe Wanderers'
];

function renderRows(rows) {
  if (!tableBody) return;
  tableBody.innerHTML = rows
    .map(
      (row) => `
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
    `
    )
    .join('');
}

function renderFallbackTable(message = 'Live feed unavailable right now. Showing League One team list as fallback.') {
  renderRows(
    FALLBACK_TEAMS.map((teamName, index) => ({
      rank: index + 1,
      teamName,
      played: '-',
      won: '-',
      drawn: '-',
      lost: '-',
      goalDiff: '-',
      points: '-',
      note: 'Fallback team list shown because live feed is temporarily unavailable.'
    }))
  );

  if (seasonInfoEl) seasonInfoEl.textContent = 'English League One';
  if (statusEl) statusEl.textContent = message;
}

function mapEspnStandings(payload) {
  const entries = payload?.children?.[0]?.standings?.entries ?? payload?.standings?.entries ?? [];
  if (!entries.length) return null;

  const rows = entries.map((entry, index) => {
    const stats = entry.stats || [];
    const getStat = (name) => stats.find((s) => s.name === name)?.value ?? '-';
    const getDisplay = (name) => stats.find((s) => s.name === name)?.displayValue;

    return {
      rank: getStat('rank') === '-' ? index + 1 : getStat('rank'),
      teamName: entry.team?.displayName ?? 'Unknown Team',
      played: getStat('gamesPlayed'),
      won: getStat('wins'),
      drawn: getStat('ties'),
      lost: getStat('losses'),
      goalDiff: getStat('pointDifferential'),
      points: getStat('points'),
      note: getDisplay('summary') || ''
    };
  });

  return {
    seasonLabel: payload?.season?.displayName || payload?.name || 'English League One',
    rows
  };
}

function mapSportsDbTable(payload) {
  const table = payload?.table ?? [];
  if (!table.length) return null;

  return {
    seasonLabel: `English League One • ${table[0]?.strSeason || 'Current season'}`,
    rows: table.map((team, index) => ({
      rank: Number(team.intRank) || index + 1,
      teamName: team.strTeam ?? 'Unknown Team',
      played: team.intPlayed ?? '-',
      won: team.intWin ?? '-',
      drawn: team.intDraw ?? '-',
      lost: team.intLoss ?? '-',
      goalDiff: team.intGoalDifference ?? '-',
      points: team.intPoints ?? '-',
      note: `Form: ${team.strForm || 'N/A'}`
    }))
  };
}

function buildCandidateUrls() {
  const now = new Date().getFullYear();
  const sportsDbSeasons = [`${now}-${now + 1}`, `${now - 1}-${now}`, `${now - 2}-${now - 1}`];

  return [
    {
      name: 'ESPN',
      url: 'https://site.api.espn.com/apis/v2/sports/soccer/eng.3/standings',
      mapper: mapEspnStandings
    },
    ...sportsDbSeasons.map((season) => ({
      name: 'TheSportsDB',
      url: `https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4396&s=${season}`,
      mapper: mapSportsDbTable
    }))
  ];
}

async function fetchLiveStandings() {
  const errors = [];

  for (const source of buildCandidateUrls()) {
    try {
      const response = await fetch(`${source.url}${source.url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const mapped = source.mapper(payload);

      if (!mapped?.rows?.length) {
        throw new Error('No standings in response');
      }

      return { ...mapped, source: source.name };
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | '));
}

async function loadStandings() {
  if (statusEl) statusEl.textContent = 'Loading live League One standings…';

  try {
    const live = await fetchLiveStandings();
    renderRows(live.rows);
    if (seasonInfoEl) seasonInfoEl.textContent = live.seasonLabel;
    if (statusEl) statusEl.textContent = `Showing ${live.rows.length} teams. Source: ${live.source}.`;
  } catch (error) {
    console.error('Unable to fetch live standings:', error);
    renderFallbackTable('Could not reach live standings feed. Showing fallback team list.');
  }
}

renderFallbackTable('Showing fallback table while live data loads…');
refreshButton?.addEventListener('click', loadStandings);
loadStandings();

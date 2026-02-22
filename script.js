const standingsTable = document.querySelector('#standingsTable');
const tableBody = standingsTable.querySelector('tbody');
const statusEl = document.querySelector('#status');
const seasonInfoEl = document.querySelector('#seasonInfo');
const refreshButton = document.querySelector('#refreshButton');

const API_URL =
  'https://api-football-standings.azharimm.dev/leagues/eng.3/standings?season=2025&sort=asc';

function stat(stats, key) {
  return stats.find((entry) => entry.name === key)?.value ?? '-';
}

function renderRows(standings) {
  tableBody.innerHTML = standings
    .map(({ team, note, stats }) => {
      const description = note?.description ?? '';
      return `
      <tr title="${description}">
        <td>${stat(stats, 'rank')}</td>
        <td>${team?.displayName ?? 'Unknown Team'}</td>
        <td>${stat(stats, 'gamesPlayed')}</td>
        <td>${stat(stats, 'wins')}</td>
        <td>${stat(stats, 'ties')}</td>
        <td>${stat(stats, 'losses')}</td>
        <td>${stat(stats, 'pointDifferential')}</td>
        <td><strong>${stat(stats, 'points')}</strong></td>
      </tr>
    `;
    })
    .join('');
}

async function loadStandings() {
  statusEl.textContent = 'Loading latest standings…';
  standingsTable.hidden = true;

  try {
    const response = await fetch(API_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    const seasonLabel = payload?.data?.seasonDisplay ?? 'League One';
    const updatedAt = payload?.data?.standings?.[0]?.stats?.find((s) => s.name === 'lastUpdated')?.displayValue;

    const standings = payload?.data?.standings ?? [];

    if (!standings.length) {
      throw new Error('No standings available from the data source.');
    }

    renderRows(standings);
    seasonInfoEl.textContent = updatedAt ? `${seasonLabel} • Updated ${updatedAt}` : seasonLabel;
    statusEl.textContent = `Showing ${standings.length} teams.`;
    standingsTable.hidden = false;
  } catch (error) {
    console.error(error);
    seasonInfoEl.textContent = 'English League One';
    statusEl.textContent =
      'Unable to load live standings right now. Please try refresh in a few moments.';
  }
}

refreshButton.addEventListener('click', loadStandings);
loadStandings();

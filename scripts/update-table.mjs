import fs from 'node:fs/promises';

const outputPath = new URL('../data/league-one.json', import.meta.url);

function currentSeasonStartYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? year : year - 1;
}

function seasonString(startYear) {
  return `${startYear}-${startYear + 1}`;
}

function candidates() {
  const start = currentSeasonStartYear();
  const seasons = [seasonString(start), seasonString(start - 1), seasonString(start + 1)];
  return seasons.map((season) => ({
    season,
    url: `https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4396&s=${season}`
  }));
}

function mapRows(table) {
  return table.map((team, index) => ({
    rank: Number(team.intRank) || index + 1,
    teamName: team.strTeam ?? 'Unknown Team',
    played: Number(team.intPlayed ?? 0),
    won: Number(team.intWin ?? 0),
    drawn: Number(team.intDraw ?? 0),
    lost: Number(team.intLoss ?? 0),
    goalDiff: Number(team.intGoalDifference ?? 0),
    points: Number(team.intPoints ?? 0)
  }));
}

let selected = null;
const errors = [];

for (const candidate of candidates()) {
  try {
    const response = await fetch(candidate.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const table = payload?.table ?? [];
    if (table.length < 20) throw new Error(`Partial table (${table.length})`);

    selected = { season: candidate.season, table };
    if (candidate.season === seasonString(currentSeasonStartYear())) break;
  } catch (error) {
    errors.push(`${candidate.season}: ${error.message}`);
  }
}

if (!selected) throw new Error(`No valid table found. ${errors.join(' | ')}`);

const snapshot = {
  version: 'v4.4.0',
  seasonLabel: `English League One • ${selected.season}`,
  updatedAt: new Date().toISOString(),
  source: 'TheSportsDB standings snapshot',
  rows: mapRows(selected.table)
};

await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote ${snapshot.rows.length} rows for ${selected.season}`);

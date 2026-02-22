import fs from 'node:fs/promises';

const API_URL = 'https://site.api.espn.com/apis/v2/sports/soccer/eng.3/standings';
const outputPath = new URL('../data/league-one.json', import.meta.url);

function mapRows(payload) {
  const entries = payload?.children?.[0]?.standings?.entries ?? [];
  return entries.map((entry, index) => {
    const stats = entry.stats || [];
    const get = (name) => stats.find((s) => s.name === name)?.value ?? '-';

    return {
      rank: get('rank') === '-' ? index + 1 : get('rank'),
      teamName: entry.team?.displayName ?? 'Unknown Team',
      played: get('gamesPlayed'),
      won: get('wins'),
      drawn: get('ties'),
      lost: get('losses'),
      goalDiff: get('pointDifferential'),
      points: get('points')
    };
  });
}

const response = await fetch(API_URL);
if (!response.ok) throw new Error(`Standings request failed: ${response.status}`);
const payload = await response.json();
const rows = mapRows(payload);

if (!rows.length) throw new Error('No rows returned from standings API');

const snapshot = {
  version: 'v4.0.0',
  seasonLabel: payload?.season?.displayName || payload?.name || 'English League One',
  updatedAt: new Date().toISOString(),
  source: 'ESPN standings snapshot',
  rows
};

await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote ${rows.length} rows to data/league-one.json`);

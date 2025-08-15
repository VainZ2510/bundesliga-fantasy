import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const API_KEY = process.env.SPORTMONKS_KEY || process.env.REACT_APP_SPORTMONKS_KEY;
const LEAGUE_ID_BUNDESLIGA = 82;

// --- Fantasy points calculation ---
function calcPoints(stats, pos) {
  let pts = 0;
  pts += (stats.goal || 0) * 8;
  pts += (stats.assist || 0) * 4;
  pts += (stats.played ? 2 : 0);
  if (pos === "Goalkeeper") {
    pts += (stats.clean_sheet ? 5 : 0);
    pts -= (stats.goal_conceded || 0) * 1;
  } else {
    pts -= (stats.goal_conceded || 0) * 0.5;
  }
  return Math.round(pts * 10) / 10;
}

// --- Get fixtures for a week ---
async function getFixtures(week) {
  const res = await fetch(
    `https://api.sportmonks.com/v3/football/fixtures?leagues=${LEAGUE_ID_BUNDESLIGA}&season=latest&round=${week}&api_token=${API_KEY}`
  );
  const json = await res.json();
  return json?.data || [];
}

// --- Lock players whose match has started ---
async function lockStartedPlayers(week) {
  const fixtures = await getFixtures(week);
  const startedTeams = new Set();
  const now = new Date();

  for (const f of fixtures) {
    if (new Date(f.starting_at) <= now) {
      startedTeams.add(f.localteam_id);
      startedTeams.add(f.visitorteam_id);
    }
  }

  if (startedTeams.size > 0) {
    const { data: players } = await supabase
      .from('bundesliga_players')
      .select('id, api_team_id');

    const toLock = players
      .filter(p => startedTeams.has(p.api_team_id))
      .map(p => p.id);

    if (toLock.length) {
      await supabase
        .from('team_players')
        .update({ locked: true })
        .in('player_id', toLock)
        .eq('week', week);
    }
  }
}

// --- Update live scores ---
async function updateScores(week) {
  const fixtures = await getFixtures(week);

  for (const f of fixtures) {
    for (const player of [...(f.localteam?.lineup || []), ...(f.visitorteam?.lineup || [])]) {
      const pts = calcPoints(player.stats || {}, player.position?.name || '');
      await supabase
        .from('player_live_points')
        .upsert({
          team_id: player.team_id,
          player_id: player.player_id,
          week,
          points: pts
        });
    }
  }

  // Aggregate to matchups
  const { data: matchups } = await supabase
    .from('matchups')
    .select('*')
    .eq('week', week)
    .eq('status', 'live');

  for (const m of matchups) {
    const { data: t1pts } = await supabase
      .from('player_live_points')
      .select('points')
      .eq('team_id', m.team1_id)
      .eq('week', week);

    const { data: t2pts } = await supabase
      .from('player_live_points')
      .select('points')
      .eq('team_id', m.team2_id)
      .eq('week', week);

    const sum = arr => (arr || []).reduce((a, b) => a + Number(b.points || 0), 0);

    await supabase
      .from('matchups')
      .update({
        team1_score: sum(t1pts),
        team2_score: sum(t2pts)
      })
      .eq('id', m.id);
  }
}

// --- Check and change week status ---
async function manageWeeks() {
  const { data: weeks } = await supabase.from('gameweeks').select('*');

  for (const gw of weeks) {
    const now = new Date();

    if (gw.status === 'upcoming' && new Date(gw.lock_at) <= now) {
      await supabase.rpc('go_live', { p_week: gw.week });
    }
    if (gw.status === 'live') {
      await lockStartedPlayers(gw.week);
      await updateScores(gw.week);

      const fixtures = await getFixtures(gw.week);
      const allDone = fixtures.every(f => ['FT','AET','FT_PEN','CANCELLED','POSTPONED'].includes(f.status));
      if (allDone) {
        await supabase.rpc('close_week', { p_week: gw.week });
      }
    }
  }
}

// Run every 15s
console.log('🏆 gameManager running...');
setInterval(manageWeeks, 15000);
await manageWeeks();

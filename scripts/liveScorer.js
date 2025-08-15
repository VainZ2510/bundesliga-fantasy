// scripts/liveScorer.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const API_KEY = process.env.SPORTMONKS_KEY || process.env.REACT_APP_SPORTMONKS_KEY;

let isRunning = false;
const fixtureCache = {};

function calculateFantasyPoints(stats, position) {
  let pts = 0;
  pts += (stats.goal || 0) * 8;
  pts += (stats.shot || 0) * 0.8;
  pts += (stats.assist || 0) * 4;
  pts += (stats.pass_leading_to_shot || 0) * 0.4;
  pts += (stats.mileage_km || 0) * (position === 'Goalkeeper' ? 0.4 : 0.2);
  pts += (stats.successful_pass || 0) * 0.125;
  pts += (stats.missed_pass || 0) * -0.2;
  pts += (stats.foul_handball || 0) * -0.5;
  pts += (stats.was_fouled || 0) * 0.75;
  pts += (stats.offside || 0) * -0.75;
  pts += (stats.penalty_won || 0) * 4;
  pts += (stats.penalty_missed || 0) * -4;
  pts += (stats.own_goal || 0) * -4;
  pts += (stats.foul_leading_to_penalty || 0) * -4;
  pts += (stats.played ? 2 : 0);
  pts += (stats.yellow_card || 0) * -1;
  pts += (stats.second_yellow || 0) * -2;
  pts += (stats.red_card || 0) * -4;
  if (position === 'Goalkeeper') {
    pts += (stats.goal_conceded || 0) * -1;
    pts += (stats.penalty_saved || 0) * 10;
    pts += (stats.shot_saved || 0) * 2.5;
    pts += (stats.no_goal_conceded ? 5 : 0);
  } else {
    pts += (stats.goal_conceded || 0) * -0.5;
  }
  pts += (stats.interception || 0) * 1;
  pts += (stats.duel_won || 0) * 0.8;
  pts += (stats.duel_lost || 0) * -0.5;
  pts += (stats.dribbled_past || 0) * 1;
  return Math.round(pts * 100) / 100;
}

async function getFixtureIdsForWeek(week) {
  if (fixtureCache[week]) return fixtureCache[week];
  try {
    const res = await fetch(
      `https://api.sportmonks.com/v3/football/fixtures?leagues=82&season=latest&round=${week}&api_token=${API_KEY}`
    );
    const json = await res.json();
    fixtureCache[week] = json?.data ? json.data.map((f) => f.id) : [];
    return fixtureCache[week];
  } catch (err) {
    console.error('❌ Error fetching fixture IDs:', err.message);
    return [];
  }
}

async function fetchStatsForFixture(api_id, fixture_id, position) {
  try {
    const res = await fetch(
      `https://api.sportmonks.com/v3/football/fixtures/${fixture_id}/player-stats/${api_id}?api_token=${API_KEY}`
    );
    const json = await res.json();
    const s = json?.data;
    if (!s) return 0;
    return calculateFantasyPoints(s, position);
  } catch (err) {
    console.error(`❌ Error stats p:${api_id} f:${fixture_id}`, err.message);
    return 0;
  }
}

async function scoreTeamForWeek(teamId, week, fixtureIds) {
  const { data: rows, error } = await supabase
    .from('team_players')
    .select('player_id, bundesliga_players(api_id, position)')
    .eq('team_id', teamId);

  if (error || !rows?.length) {
    return { total: 0, perPlayer: [] };
  }

  const perPlayer = [];
  for (const r of rows) {
    const info = r.bundesliga_players;
    if (!info?.api_id) {
      perPlayer.push({ player_id: r.player_id, points: 0 });
      continue;
    }
    let sum = 0;
    for (const fixId of fixtureIds) {
      sum += await fetchStatsForFixture(info.api_id, fixId, info.position);
    }
    perPlayer.push({ player_id: r.player_id, points: Math.round(sum * 100) / 100 });
  }

  const total = perPlayer.reduce((a, b) => a + (b.points || 0), 0);
  return { total, perPlayer };
}

async function scoreLoop() {
  if (isRunning) return;
  isRunning = true;

  try {
    const { data: matchups, error } = await supabase
      .from('matchups')
      .select('*')
      .neq('status', 'complete');

    if (error || !matchups?.length) {
      console.log('No pending matchups found');
      return;
    }

    for (const m of matchups) {
      const fixtureIds = await getFixtureIdsForWeek(m.week);
      const t1 = await scoreTeamForWeek(m.team1_id, m.week, fixtureIds);
      const t2 = await scoreTeamForWeek(m.team2_id, m.week, fixtureIds);

      await supabase
        .from('matchups')
        .update({ team1_score: t1.total, team2_score: t2.total })
        .eq('id', m.id);

      if (t1.perPlayer.length) {
        await supabase.from('player_live_points').upsert(
          t1.perPlayer.map((p) => ({
            team_id: m.team1_id,
            player_id: p.player_id,
            week: m.week,
            points: p.points,
          }))
        );
      }
      if (t2.perPlayer.length) {
        await supabase.from('player_live_points').upsert(
          t2.perPlayer.map((p) => ({
            team_id: m.team2_id,
            player_id: p.player_id,
            week: m.week,
            points: p.points,
          }))
        );
      }
    }

    console.log('✅ Live scores updated @', new Date().toLocaleTimeString());
  } catch (err) {
    console.error('❌ Error in scoreLoop:', err.message);
  } finally {
    isRunning = false;
  }
}

setInterval(scoreLoop, 15000);
scoreLoop();

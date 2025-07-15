import { useState } from 'react';
import { supabase } from '../supabaseClient';

// SCORING RULES (your actual rules)
function calculateFantasyPoints(stats, position) {
  let pts = 0;
  pts += (stats.goal || 0) * 8;
  pts += (stats.shot || 0) * 0.8;
  pts += (stats.assist || 0) * 4;
  pts += (stats.pass_leading_to_shot || 0) * 0.4;
  if (position === "Goalkeeper") {
    pts += (stats.mileage_km || 0) * 0.4;
  } else {
    pts += (stats.mileage_km || 0) * 0.2;
  }
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
  if (position === "Goalkeeper") {
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

// Fetch stats for a player (using API-Football) for a given fixture
async function fetchPlayerStats(playerApiId, fixtureId, position) {
  const apiKey = process.env.REACT_APP_API_FOOTBALL_KEY;
  const url = `https://api-football-v1.p.rapidapi.com/v3/players?player=${playerApiId}&fixture=${fixtureId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com"
    }
  });
  const data = await res.json();

  if (!data.response || data.response.length === 0) return null;
  const stats = data.response[0].statistics[0];

  // Map API-Football stats to your schema (add more fields as needed)
  return {
    goal: stats.goals.total || 0,
    shot: stats.shots.total || 0,
    assist: stats.goals.assists || 0,
    played: stats.games.minutes > 0 ? 1 : 0,
    yellow_card: stats.cards.yellow || 0,
    red_card: stats.cards.red || 0,
    // Add the rest of your scoring fields by mapping here!
  };
}

// ---- IMPORTANT: Map your league weeks to Bundesliga fixture IDs! ----
// For demo/testing, hard-code a fixtureId.
// For real use, you must build a function that maps week to the correct fixtureId!
async function getFixtureIdForWeek(week) {
  // TODO: Replace this logic for your league!
  // For now, always return a fixtureId that exists (see API-Football docs or test output)
  // Example: return 1035044 for matchday 1, etc.
  return 1035044; // <-- Change this for each week!
}

export default function ScoreUpdater() {
  const [msg, setMsg] = useState('');
  const leagueId = localStorage.getItem('leagueId');

  const updateScores = async () => {
    setMsg('Calculating scores (live from API)...');

    // 1. Get all matchups for this league and all weeks (pending or not)
    const { data: matchups } = await supabase
      .from('matchups')
      .select('id, week, team1_id, team2_id, status')
      .eq('league_id', leagueId);

    if (!matchups) {
      setMsg('No matchups found');
      return;
    }

    // 2. For each matchup, calculate total team scores
    for (let m of matchups) {
      // Get players for both teams
      const { data: team1players } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', m.team1_id);
      const { data: team2players } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', m.team2_id);

      let team1Points = 0;
      let team2Points = 0;

      for (let p of team1players) {
        // Make sure your players table has 'api_id' and 'position' fields!
        const { data: playerInfo } = await supabase
          .from('players')
          .select('api_id, position')
          .eq('id', p.player_id)
          .single();
        if (!playerInfo) continue;

        const fixtureId = await getFixtureIdForWeek(m.week);
        const stats = await fetchPlayerStats(playerInfo.api_id, fixtureId, playerInfo.position);
        if (stats) team1Points += calculateFantasyPoints(stats, playerInfo.position);
      }
      for (let p of team2players) {
        const { data: playerInfo } = await supabase
          .from('players')
          .select('api_id, position')
          .eq('id', p.player_id)
          .single();
        if (!playerInfo) continue;
        const fixtureId = await getFixtureIdForWeek(m.week);
        const stats = await fetchPlayerStats(playerInfo.api_id, fixtureId, playerInfo.position);
        if (stats) team2Points += calculateFantasyPoints(stats, playerInfo.position);
      }

      await supabase
        .from('matchups')
        .update({
          team1_score: team1Points,
          team2_score: team2Points,
          status: 'complete'
        })
        .eq('id', m.id);
    }

    setMsg('Scores updated using real Bundesliga data!');
  };

  return (
    <div style={{ maxWidth: 600, margin: '32px auto' }}>
      <button onClick={updateScores}>Update Scores for All Matchups (API)</button>
      <div style={{ marginTop: 16, color: 'limegreen' }}>{msg}</div>
      <p style={{ color: 'yellow', fontSize: 14 }}>
        (Scoring uses your actual rules. For a real season, update <code>getFixtureIdForWeek</code> to link your matchweeks to Bundesliga fixtures.)
      </p>
    </div>
  );
}

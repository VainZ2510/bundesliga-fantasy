import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import axios from 'axios';

function calculateFantasyPoints(stats, position) {
  let pts = 0;
  pts += (stats.goal || 0) * 8;
  pts += (stats.shot || 0) * 0.8;
  pts += (stats.assist || 0) * 4;
  pts += (stats.pass_leading_to_shot || 0) * 0.4;
  pts += (stats.mileage_km || 0) * (position === "Goalkeeper" ? 0.4 : 0.2);
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

async function fetchPlayerStats(playerApiId, fixtureId, position) {
  const apiKey = process.env.REACT_APP_SPORTMONKS_KEY;
  const url = `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}/player-stats/${playerApiId}?api_token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.data) return null;
  return {
    goal: data.data.goals || 0,
    shot: data.data.shots || 0,
    assist: data.data.assists || 0,
    played: data.data.minutes > 0 ? 1 : 0,
    yellow_card: data.data.yellow_cards || 0,
    second_yellow: data.data.second_yellow || 0,
    red_card: data.data.red_cards || 0,
    goal_conceded: data.data.goals_conceded || 0,
    penalty_saved: data.data.penalty_saves || 0,
    shot_saved: data.data.shots_saved || 0,
    no_goal_conceded: data.data.clean_sheets ? 1 : 0,
    mileage_km: data.data.distance_covered || 0,
    interception: data.data.interceptions || 0,
    duel_won: data.data.duels_won || 0,
    duel_lost: data.data.duels_lost || 0,
    dribbled_past: data.data.dribbled_past || 0,
    foul_handball: data.data.foul_handball || 0,
    was_fouled: data.data.was_fouled || 0,
    offside: data.data.offside || 0,
    penalty_won: data.data.penalty_won || 0,
    penalty_missed: data.data.penalty_missed || 0,
    own_goal: data.data.own_goal || 0,
    foul_leading_to_penalty: data.data.foul_leading_to_penalty || 0,
    successful_pass: data.data.successful_pass || 0,
    missed_pass: data.data.missed_pass || 0,
  };
}

async function getFixtureIdsForWeek(week) {
  const API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;
  try {
    const res = await axios.get(`https://api.sportmonks.com/v3/football/fixtures?leagues=82&season=latest&round=${week}&api_token=${API_KEY}`);
    return res.data.data.map(fixture => fixture.id);
  } catch {
    return [];
  }
}

export default function ScoreUpdater() {
  const [msg, setMsg] = useState('');
  const leagueId = localStorage.getItem('leagueId');

  const updateScores = async () => {
    setMsg('Calculating scores...');
    const { data: matchups } = await supabase
      .from('matchups')
      .select('id, week, team1_id, team2_id')
      .eq('league_id', leagueId);

    if (!matchups) return setMsg('No matchups found');

    for (let m of matchups) {
      const fixtureIds = await getFixtureIdsForWeek(m.week);
      let team1Points = 0, team2Points = 0;

      const { data: team1players } = await supabase.from('team_players').select('player_id').eq('team_id', m.team1_id);
      const { data: team2players } = await supabase.from('team_players').select('player_id').eq('team_id', m.team2_id);

      for (const fixtureId of fixtureIds) {
        for (let p of team1players) {
          const { data: playerInfo } = await supabase.from('players').select('api_id, position').eq('id', p.player_id).single();
          if (!playerInfo) continue;
          const stats = await fetchPlayerStats(playerInfo.api_id, fixtureId, playerInfo.position);
          if (stats) team1Points += calculateFantasyPoints(stats, playerInfo.position);
        }
        for (let p of team2players) {
          const { data: playerInfo } = await supabase.from('players').select('api_id, position').eq('id', p.player_id).single();
          if (!playerInfo) continue;
          const stats = await fetchPlayerStats(playerInfo.api_id, fixtureId, playerInfo.position);
          if (stats) team2Points += calculateFantasyPoints(stats, playerInfo.position);
        }
      }

      await supabase.from('matchups').update({
        team1_score: team1Points,
        team2_score: team2Points,
        status: 'complete'
      }).eq('id', m.id);
    }
    setMsg('Scores updated using real Bundesliga data!');
  };

  return (
    <div style={{ maxWidth: 600, margin: '32px auto' }}>
      <button onClick={updateScores}>Update Scores</button>
      <div style={{ marginTop: 16, color: 'limegreen' }}>{msg}</div>
    </div>
  );
}

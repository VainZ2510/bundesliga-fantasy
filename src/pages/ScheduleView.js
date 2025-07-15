// src/ScheduleView.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function ScheduleView({ leagueId }) {
  const [matchups, setMatchups] = useState([]);
  const [teamNames, setTeamNames] = useState({});

  useEffect(() => {
    if (!leagueId) return;

    async function fetchSchedule() {
      // 1. Get teams in this league
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', leagueId);

      // Build a lookup table for team id -> name
      const nameLookup = {};
      (teams || []).forEach(team => { nameLookup[team.id] = team.name; });
      setTeamNames(nameLookup);

      // 2. Get all matchups for this league
      const { data: matchupsData } = await supabase
        .from('matchups')
        .select('*')
        .eq('league_id', leagueId)
        .order('week', { ascending: true });

      setMatchups(matchupsData || []);
    }

    fetchSchedule();
  }, [leagueId]);

  return (
    <div>
      <h3>Season Schedule</h3>
      <table>
        <thead>
          <tr>
            <th>Week</th>
            <th>Team 1</th>
            <th>Team 2</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {matchups.map((m) => (
            <tr key={m.id}>
              <td>{m.week}</td>
              <td>{teamNames[m.team1_id] || 'TBD'}</td>
              <td>{teamNames[m.team2_id] || 'TBD'}</td>
              <td>
                {m.team1_score !== null && m.team2_score !== null
                  ? `${m.team1_score} : ${m.team2_score}`
                  : 'TBD'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScheduleView;

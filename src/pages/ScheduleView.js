// src/pages/ScheduleView.js
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function ScheduleView({ leagueId }) {
  const [matchups, setMatchups] = useState([]);

  useEffect(() => {
    async function fetchMatchups() {
      const { data, error } = await supabase
        .from('matchups')
        .select('week, team1_id, team2_id, team1_score, team2_score')
        .eq('league_id', leagueId)
        .order('week', { ascending: true });

      if (!error && data) setMatchups(data);
    }
    if (leagueId) fetchMatchups();
  }, [leagueId]);

  return (
    <div>
      <h3>Season Schedule</h3>
      {matchups.length === 0 ? (
        <p>No matchups generated yet.</p>
      ) : (
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
            {matchups.map((m, i) => (
              <tr key={i}>
                <td>{m.week}</td>
                <td>{m.team1_id}</td>
                <td>{m.team2_id}</td>
                <td>
                  {m.team1_score !== null && m.team2_score !== null
                    ? `${m.team1_score} : ${m.team2_score}`
                    : 'TBD'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ScheduleView;

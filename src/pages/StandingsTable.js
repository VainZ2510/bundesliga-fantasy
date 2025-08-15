// src/pages/StandingsTable.js
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

function StandingsTable({ leagueId }) {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    async function fetchTeams() {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, points, wins, losses, draws')
        .eq('league_id', leagueId)
        .order('points', { ascending: false });
      if (!error && data) setTeams(data);
    }
    if (leagueId) fetchTeams();
  }, [leagueId]);

  return (
    <div>
      <h3>Standings</h3>
      {teams.length === 0 ? (
        <p>No standings yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Points</th>
              <th>Wins</th>
              <th>Draws</th>
              <th>Losses</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.points ?? 0}</td>
                <td>{t.wins ?? 0}</td>
                <td>{t.draws ?? 0}</td>
                <td>{t.losses ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StandingsTable;

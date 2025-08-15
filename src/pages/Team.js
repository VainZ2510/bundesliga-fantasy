import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import DraftCenter from './DraftCenter.js';
import ScheduleView from './ScheduleView.js';
import StandingsTable from './StandingsTable.js';


function Team() {
  const [teamName, setTeamName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [teamId, setTeamId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchTeamAndPlayers() {
      // Get current user & league
      const { data: { user } } = await supabase.auth.getUser();
      const leagueId = localStorage.getItem('leagueId');

      if (!user || !leagueId) {
        setMessage('Not in a league or not logged in!');
        return;
      }

      // Find user's team in this league
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .single();

      if (teamError || !team) {
        setMessage('Team not found!');
        return;
      }

      setTeamId(team.id);
      setTeamName(team.name);
      setNewTeamName(team.name);

      // Get all players on this team
      const { data: teamPlayers, error: playersError } = await supabase
        .from('team_players')
        .select('player_id, players(name, club, position)')
        .eq('team_id', team.id);

      if (playersError) {
        setPlayers([]);
      } else {
        setPlayers(teamPlayers.map(tp => tp.players));
      }
    }

    fetchTeamAndPlayers();
  }, []);

  // Rename team handler
  const handleRename = async (e) => {
    e.preventDefault();
    if (!teamId || !newTeamName) return;

    const { error } = await supabase
      .from('teams')
      .update({ name: newTeamName })
      .eq('id', teamId);

    if (error) {
      setMessage('Rename failed: ' + error.message);
    } else {
      setTeamName(newTeamName);
      setMessage('Team name updated!');
    }
  };

  return (
    <div className="team-container">
      <h1>My Team</h1>
      {message && <div style={{ marginBottom: 12, color: 'red' }}>{message}</div>}
      <h2>
        Team Name: {teamName}
      </h2>
      <form onSubmit={handleRename} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
          placeholder="Enter new team name"
          required
        />
        <button type="submit" style={{ marginLeft: 10 }}>Rename Team</button>
      </form>

      <h3>Drafted Players:</h3>
      {players.length === 0 ? (
        <div>No players drafted yet.</div>
      ) : (
        <ul>
          {players.map((player, idx) => (
            <li key={idx}>
              <strong>{player.name}</strong> - {player.club} ({player.position})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Team;

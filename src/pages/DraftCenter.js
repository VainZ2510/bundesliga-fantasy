import './DraftCenter.css';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function DraftCenter({ leagueId }) {
  const [players, setPlayers] = useState([]);
  const [myTeamPlayers, setMyTeamPlayers] = useState([]); // Your squad
  const [message, setMessage] = useState('');
  const [teamId, setTeamId] = useState(null);
  const [userId, setUserId] = useState(null);
  const TEAM_SIZE = 8; // Change as you need

  // Fetch all players & your squad
  useEffect(() => {
    async function fetchData() {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;
      setUserId(user.user.id);

      // Get your team in this league
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('league_id', leagueId)
        .single();
      if (!team) return setMessage('Create your team first!');

      setTeamId(team.id);

      // Get all players
      const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('*');
      if (playersError) {
        setMessage('Failed to load players!');
        return;
      }
      setPlayers(allPlayers);

      // Get your team's current players
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', team.id);
      const myIds = teamPlayers ? teamPlayers.map(tp => tp.player_id) : [];

      // Fetch player objects for your team
      const myPlayers = allPlayers.filter(p => myIds.includes(p.id));
      setMyTeamPlayers(myPlayers);
    }
    if (leagueId) fetchData();
  }, [leagueId, message]);

  // Get IDs of all players in your team
  const myPlayerIds = myTeamPlayers.map(p => p.id);

  // Count how many you have from each club
  const clubCounts = {};
  myTeamPlayers.forEach(p => {
    clubCounts[p.club] = (clubCounts[p.club] || 0) + 1;
  });

  // All available players (not already in your team, and you don't already have 2 from this club)
  const availablePlayers = players.filter(
    p =>
      !myPlayerIds.includes(p.id) &&
      (clubCounts[p.club] || 0) < 2
  );

  // Add a player (if not full and not >2 from club)
  const handleAddPlayer = async (player) => {
    setMessage('');
    if (myTeamPlayers.length >= TEAM_SIZE) {
      setMessage(`Max team size is ${TEAM_SIZE}`);
      return;
    }
    // Check club limit
    const clubNum = myTeamPlayers.filter(p => p.club === player.club).length;
    if (clubNum >= 2) {
      setMessage('You can only have 2 players from one club.');
      return;
    }
    // Add
    const { error } = await supabase
      .from('team_players')
      .insert([{ team_id: teamId, player_id: player.id }]);
    if (error) setMessage('Error adding player');
    else setMessage('Player added!');
  };

  // Remove player
  const handleDropPlayer = async (playerId) => {
    setMessage('');
    const { error } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId)
      .eq('player_id', playerId);
    if (error) setMessage('Error dropping player');
    else setMessage('Player dropped!');
  };

  return (
    <div className="draft-container">
      <h2>Your Squad</h2>
      {myTeamPlayers.length === 0 ? (
        <div>No players in your team.</div>
      ) : (
        <ul>
          {myTeamPlayers.map(p => (
            <li key={p.id} className="player-card">
              <strong>{p.name}</strong> - {p.club} ({p.position})
              <button style={{ marginLeft: 10 }} onClick={() => handleDropPlayer(p.id)}>
                Drop
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>Add Players</h2>
      {message && <div className="success-message">{message}</div>}
      <div style={{ marginBottom: 10 }}>
        {`You can have max ${TEAM_SIZE} players and no more than 2 from any club.`}
      </div>
      {availablePlayers.length === 0 ? (
        <div>No available players to add.</div>
      ) : (
        <div>
          {availablePlayers.map(player => (
            <div key={player.id} className="player-card">
              <strong>{player.name}</strong>
              <span style={{ marginLeft: 6 }}>{player.club} ({player.position})</span>
              <button style={{ marginLeft: 10 }} onClick={() => handleAddPlayer(player)}>
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DraftCenter;

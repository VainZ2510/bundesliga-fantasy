import './DraftCenter.css';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function DraftCenter() {
  const [players, setPlayers] = useState([]);
  const [draftedPlayerIds, setDraftedPlayerIds] = useState([]);
  const [pickMade, setPickMade] = useState(false);
  const [message, setMessage] = useState('');
  const leagueId = localStorage.getItem('leagueId');

  useEffect(() => {
    // Fetch all players & already drafted players for this league
    async function fetchDraftData() {
      // 1. All players
      const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('*');
      if (playersError) {
        setMessage('Failed to load players!');
        return;
      }
      setPlayers(allPlayers);

      // 2. Get all team IDs in this league
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId);

      if (teamsError || !teams) {
        setDraftedPlayerIds([]);
        return;
      }

      const teamIds = teams.map(team => team.id);
      if (teamIds.length === 0) {
        setDraftedPlayerIds([]);
        return;
      }

      // 3. Now fetch drafted players
      const { data: drafted, error: draftedError } = await supabase
        .from('team_players')
        .select('player_id')
        .in('team_id', teamIds);

      if (draftedError || !drafted) {
        setDraftedPlayerIds([]);
      } else {
        setDraftedPlayerIds(drafted.map(row => row.player_id));
      }
    }
    if (leagueId) {
      fetchDraftData();
    }
  }, [pickMade, leagueId]);

  const handleDraftPick = async (playerId) => {
    setMessage('');
    const userId = (await supabase.auth.getUser()).data.user.id;

    // Find user's team in this league
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .single();

    if (teamError || !team) {
      setMessage('Team not found. You must create your team before drafting!');
      return;
    }

    // Check if player already drafted in league
    if (draftedPlayerIds.includes(playerId)) {
      setMessage('This player has already been drafted by another team.');
      return;
    }

    // Insert drafted player for this team
    const { error } = await supabase
      .from('team_players')
      .insert([{ team_id: team.id, player_id: playerId }]);

    if (error) {
      setMessage('Draft failed: ' + error.message);
      return;
    }

    setPickMade(!pickMade); // trigger re-fetch
    setMessage('Player drafted successfully!');
  };

  // Filter out already-drafted players
  const availablePlayers = players.filter(p => !draftedPlayerIds.includes(p.id));

  return (
    <div className="draft-container">
      <h1>Draft Center</h1>
      {message && <div className="success-message">{message}</div>}
      {!pickMade ? (
        <>
          <h2>Available Players:</h2>
          {availablePlayers.length === 0 ? (
            <p>Loading or all players drafted...</p>
          ) : (
            <div>
              {availablePlayers.map((player) => (
                <div key={player.id} className="player-card">
                  <strong style={{ fontSize: 18 }}>{player.name}</strong>
                  <div style={{ margin: '8px 0' }}>{player.club} <span style={{ color: '#777' }}>({player.position})</span></div>
                  <button
                    onClick={() => handleDraftPick(player.id)}
                  >
                    Draft This Player
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="success-message">
          <h3>Player drafted successfully!</h3>
          <p>Refresh the page or draft again if needed.</p>
        </div>
      )}
    </div>
  );
}

export default DraftCenter;

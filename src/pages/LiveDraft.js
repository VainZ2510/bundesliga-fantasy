import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const TEAM_SIZE = 11;
const POSITION_LIMITS = { GK: 1, DEF: 3, MID: 3, FW: 1, FLEX: 3 };

export default function LiveDraft({ leagueId }) {
  const [userId, setUserId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [takenPlayerIds, setTakenPlayerIds] = useState([]);
  const [myPlayers, setMyPlayers] = useState([]);
  const [draft, setDraft] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchInitial = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return;
      setUserId(user.id);

      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .single();
      if (team) setTeamId(team.id);

      const { data: allPlayers } = await supabase.from('players').select('*');
      setPlayers(allPlayers);

      const { data: picks } = await supabase
        .from('draft_picks')
        .select('player_id')
        .in('draft_id', [draft?.id]);
      setTakenPlayerIds(picks?.map(p => p.player_id) || []);
    };

    if (leagueId) fetchInitial();
  }, [leagueId]);

  // Subscribe to draft state changes
  useEffect(() => {
    const channel = supabase
      .channel('drafts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drafts' }, (payload) => {
        if (payload.new) setDraft(payload.new);
        setIsMyTurn(payload.new.current_pick_user_id === userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const countByPosition = (players) => {
    return players.reduce((acc, p) => {
      const pos = p.position;
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {});
  };

  const validatePick = (player) => {
    if (takenPlayerIds.includes(player.id)) return 'Already taken';
    if (myPlayers.length >= TEAM_SIZE) return 'Team full';

    const counts = countByPosition(myPlayers);
    if (POSITION_LIMITS[player.position] && counts[player.position] >= POSITION_LIMITS[player.position]) {
      return `Max ${POSITION_LIMITS[player.position]} ${player.position}s`;
    }
    return null;
  };

  const handlePick = async (player) => {
    setMessage('');
    const error = validatePick(player);
    if (error) return setMessage(error);

    const { error: insertError } = await supabase.from('draft_picks').insert({
      draft_id: draft.id,
      user_id: userId,
      player_id: player.id,
      pick_number: draft.pick_number,
      round: draft.round
    });
    if (insertError) return setMessage('Pick failed');

    setTakenPlayerIds([...takenPlayerIds, player.id]);
    setMyPlayers([...myPlayers, player]);
  };

  const availablePlayers = players.filter(p => !takenPlayerIds.includes(p.id));

  return (
    <div className="live-draft">
      <h2>Live Draft Center</h2>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      <p>{isMyTurn ? 'Your turn!' : 'Waiting for others...'}</p>

      <h3>Available Players</h3>
      {availablePlayers.map(p => (
        <div key={p.id} className="player-card">
          <strong>{p.name}</strong> - {p.club} ({p.position})
          {isMyTurn && (
            <button onClick={() => handlePick(p)}>Pick</button>
          )}
        </div>
      ))}

      <h3>Your Picks</h3>
      <ul>
        {myPlayers.map(p => (
          <li key={p.id}>{p.name} - {p.position}</li>
        ))}
      </ul>
    </div>
  );
}

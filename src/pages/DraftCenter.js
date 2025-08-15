import './DraftCenter.css';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function DraftCenter({ leagueId }) {
  const [players, setPlayers] = useState([]);
  const [draft, setDraft] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      setUserId(auth.user.id);

      // Get my team
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', auth.user.id)
        .eq('league_id', leagueId)
        .single();
      setMyTeam(team);

      // Get draft info
      const { data: draftInfo } = await supabase
        .from('drafts')
        .select('*')
        .eq('league_id', leagueId)
        .single();
      setDraft(draftInfo);

      // Load available players
      await loadPlayers();

      // Subscribe to draft changes in real-time
      supabase
        .channel('draft-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_picks' }, () => {
          loadPlayers();
          loadDraft();
        })
        .subscribe();
    }
    if (leagueId) init();
  }, [leagueId]);

  async function loadPlayers() {
    const { data: drafted } = await supabase.from('draft_picks').select('player_id');
    const draftedIds = drafted?.map(d => d.player_id) || [];

    const { data: all } = await supabase
      .from('bundesliga_players')
      .select('*')
      .not('id', 'in', `(${draftedIds.join(',') || 'NULL'})`);

    setPlayers(all || []);
    setLoading(false);
  }

  async function loadDraft() {
    const { data: draftInfo } = await supabase
      .from('drafts')
      .select('*')
      .eq('league_id', leagueId)
      .single();
    setDraft(draftInfo);
  }

  async function pickPlayer(playerId) {
    setMessage('');
    const { error } = await supabase.rpc('make_draft_pick', {
      p_draft_id: draft.id,
      p_user_id: userId,
      p_player_id: playerId
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('✅ Pick made!');
    }
  }

  if (loading) return <div>Loading draft...</div>;

  const isMyTurn = draft?.current_pick_user_id === userId;

  return (
    <div className="draft-container">
      <h2>Draft Center</h2>
      <p>{isMyTurn ? '🟢 Your turn!' : '⏳ Waiting for other players...'}</p>
      {message && <p style={{ color: 'yellow' }}>{message}</p>}

      <h3>Available Players</h3>
      {players.length === 0 ? (
        <p>No players left to draft.</p>
      ) : (
        players.map(p => (
          <div key={p.id} className="player-card">
            <strong>{p.name}</strong> — {p.club} ({p.position})
            <button
              onClick={() => pickPlayer(p.id)}
              disabled={!isMyTurn}
              style={{ marginLeft: 10 }}
            >
              Draft
            </button>
          </div>
        ))
      )}
    </div>
  );
}

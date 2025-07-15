import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function Matchups() {
  const [matchups, setMatchups] = useState([]);
  const [teamId, setTeamId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const leagueId = localStorage.getItem('leagueId');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. Get logged-in user's team in this league
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data: team } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .single();

      if (!team) {
        setMatchups([]);
        setTeamId(null);
        setLoading(false);
        return;
      }
      setTeamId(team.id);

      // 2. Get all matchups for this team, ordered by week
      const { data: allMatchups } = await supabase
        .from('matchups')
        .select('id, week, team1_id, team2_id, team1_score, team2_score, status')
        .eq('league_id', leagueId)
        .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`)
        .order('week', { ascending: true });

      // 3. Figure out which matchup is the "next" (first pending, or last if all done)
      let nextIdx = 0;
      if (allMatchups && allMatchups.length > 0) {
        nextIdx = allMatchups.findIndex(m => m.status === 'pending');
        if (nextIdx === -1) nextIdx = allMatchups.length - 1; // If all completed, show last
      }
      setMatchups(allMatchups || []);
      setCurrentIndex(nextIdx);
      setLoading(false);
    }
    fetchData();
  }, [leagueId]);

  // Helper: get opponent team ID in a matchup
  function getOpponentId(match) {
    return match.team1_id === teamId ? match.team2_id : match.team1_id;
  }

  // Helper: get opponent name
  const [opponentName, setOpponentName] = useState('');
  useEffect(() => {
    async function fetchOpponentName() {
      if (matchups.length === 0 || teamId === null) {
        setOpponentName('');
        return;
      }
      const match = matchups[currentIndex];
      if (!match) {
        setOpponentName('');
        return;
      }
      const opponentId = getOpponentId(match);
      const { data: opponent } = await supabase
        .from('teams')
        .select('name')
        .eq('id', opponentId)
        .single();
      setOpponentName(opponent?.name || '');
    }
    fetchOpponentName();
    // Only re-run when matchup changes
    // eslint-disable-next-line
  }, [matchups, currentIndex, teamId]);

  if (loading) return <div>Loading matchups...</div>;
  if (matchups.length === 0) return <div>No matchups found.</div>;

  const match = matchups[currentIndex];
  const isHome = match.team1_id === teamId;

  // Calculate scores (or show "-")
  const myScore = isHome ? match.team1_score : match.team2_score;
  const oppScore = isHome ? match.team2_score : match.team1_score;
  const status = match.status;

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', background: '#181818', borderRadius: 16, padding: 32 }}>
      <h2 style={{ textAlign: 'center' }}>My Matchups</h2>
      <h4 style={{ textAlign: 'center' }}>Matchweek {match.week}</h4>
      <div style={{ fontSize: 20, textAlign: 'center', margin: 24 }}>
        <strong>YOU</strong> {typeof myScore === 'number' ? myScore : '-'}
        <span style={{ margin: '0 12px' }}>vs</span>
        <strong>{opponentName || "..."}</strong> {typeof oppScore === 'number' ? oppScore : '-'}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span>Status: {status === 'pending' ? 'Upcoming' : 'Completed'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        <button
          onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
          disabled={currentIndex === 0}
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentIndex(Math.min(currentIndex + 1, matchups.length - 1))}
          disabled={currentIndex === matchups.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Matchups;

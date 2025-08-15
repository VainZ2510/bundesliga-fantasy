import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function Matchups() {
  const [matchups, setMatchups] = useState([]);
  const leagueId = localStorage.getItem('leagueId');

  async function fetchMatchups() {
    const { data, error } = await supabase
      .from('matchups')
      .select(`
        id,
        week,
        team1_score,
        team2_score,
        status,
        team1:team1_id(name),
        team2:team2_id(name)
      `)
      .eq('league_id', leagueId);

    if (!error) setMatchups(data || []);
  }

  useEffect(() => {
    fetchMatchups();

    const channel = supabase
      .channel('matchups-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matchups' },
        () => {
          fetchMatchups(); // refresh when any score changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId]);

  return (
    <div>
      <h2>Live Matchups</h2>
      {matchups.map(m => (
        <div key={m.id} style={{ border: '1px solid #ccc', margin: 10, padding: 10 }}>
          <strong>Week {m.week}</strong> - {m.team1?.name} vs {m.team2?.name}
          <div style={{ fontSize: 18, marginTop: 6 }}>
            {m.team1_score} : {m.team2_score}
          </div>
          <small>Status: {m.status}</small>
        </div>
      ))}
    </div>
  );
}

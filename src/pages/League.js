import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function League() {
  const [teams, setTeams] = useState([]);
  const [leagueId, setLeagueId] = useState(localStorage.getItem('leagueId') || '');
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    async function fetchLeagueData() {
      const { data: leagues, error: leagueError } = await supabase
        .from('leagues')
        .select('id')
        .limit(1);

      if (leagueError) {
        console.error('Error fetching league:', leagueError);
        return;
      }

      if (leagues && leagues.length > 0) {
        const id = leagues[0].id;
        setLeagueId(id);
        localStorage.setItem('leagueId', id);

        const { data: teamsData } = await supabase
          .from('teams')
          .select('name')
          .eq('league_id', id);

        setTeams(teamsData || []);

        const { data: scheduleData } = await supabase
          .from('matchups')
          .select(`
            week,
            team1_score,
            team2_score,
            team1:team1_id ( name ),
            team2:team2_id ( name )
          `)
          .eq('league_id', id)
          .order('week', { ascending: true });

        setSchedule(scheduleData || []);
      }
    }

    fetchLeagueData();
  }, []);

  const startDraft = async () => {
    if (!leagueId) {
      alert('No league ID found');
      return;
    }

    const { error } = await supabase.rpc('start_draft', { league_id: leagueId });

    if (error) {
      alert(`Error starting draft: ${error.message}`);
    } else {
      alert('Draft started successfully!');
    }
  };

  // Group matches by week
  const groupedSchedule = schedule.reduce((acc, match) => {
    if (!acc[match.week]) acc[match.week] = [];
    acc[match.week].push(match);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
      <h2 style={{ color: 'orange' }}>Teams</h2>
      {teams.map((team, i) => (
        <div key={i}>{team.name}</div>
      ))}

      <div style={{ margin: '20px 0' }}>
        <button
          onClick={startDraft}
          style={{
            backgroundColor: '#4CAF50', // Soft green
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Start Draft
        </button>
      </div>
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
  <button
    onClick={() => window.location.href = '/current-matchup'}
    style={{
      backgroundColor: '#ff8800',
      color: 'white',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
    }}
  >
    View Current Matchup
  </button>
</div>


      <h2 style={{ color: 'orange', marginTop: '30px' }}>Schedule</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: 'orange', color: 'white' }}>
            <th style={{ padding: '8px' }}>Week</th>
            <th style={{ padding: '8px' }}>Player 1</th>
            <th style={{ padding: '8px' }}>Score</th>
            <th style={{ padding: '8px' }}>Player 2</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedSchedule).map(([week, matches], weekIndex) =>
            matches.map((match, matchIndex) => (
              <tr
                key={`${week}-${matchIndex}`}
                style={{
                  backgroundColor: weekIndex % 2 === 0 ? '#f2f2f2' : 'white',
                  textAlign: 'center',
                }}
              >
                {matchIndex === 0 && (
                  <td
                    rowSpan={matches.length}
                    style={{
                      padding: '8px',
                      fontWeight: 'bold',
                      backgroundColor: weekIndex % 2 === 0 ? '#f2f2f2' : 'white',
                    }}
                  >
                    {week}
                  </td>
                )}
                <td style={{ padding: '8px' }}>{match.team1?.name || 'TBD'}</td>
                <td style={{ padding: '8px' }}>
                  {match.team1_score ?? 0} : {match.team2_score ?? 0}
                </td>
                <td style={{ padding: '8px' }}>{match.team2?.name || 'TBD'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

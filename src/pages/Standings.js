import './Standings.css';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

function Standings() {
  const [standings, setStandings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Fetch standings
  const fetchStandings = async () => {
    const { data, error } = await supabase
      .from('league_standings')
      .select(`
        team_id,
        wins,
        losses,
        draws,
        points_for,
        points_against,
        points,
        teams(name)
      `)
      .order('points', { ascending: false });

    if (error) {
      console.error('Error fetching standings:', error);
    } else {
      setStandings(data || []);
    }
  };

  useEffect(() => {
    fetchStandings();

    // Live updates
    const subscription = supabase
      .channel('standings-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'league_standings' },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() !== '') {
      setMessages([...messages, input]);
      setInput('');
    }
  };

  return (
    <div className="standings-container">
      <h1>League Standings</h1>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Record</th>
            <th>PF</th>
            <th>PA</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => (
            <tr key={team.team_id}>
              <td>{index + 1}</td>
              <td>{team.teams?.name}</td>
              <td>{team.wins}-{team.losses}-{team.draws}</td>
              <td>{team.points_for}</td>
              <td>{team.points_against}</td>
              <td>{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="chat-box">
        <h2>Trash Talk</h2>
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <form onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default Standings;

import './Standings.css';
import { useState } from 'react';

function Standings() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

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
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Team A</td>
            <td>3-0</td>
            <td>9</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Team B</td>
            <td>2-1</td>
            <td>6</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Team C</td>
            <td>1-2</td>
            <td>3</td>
          </tr>
          <tr>
            <td>4</td>
            <td>Team D</td>
            <td>0-3</td>
            <td>0</td>
          </tr>
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

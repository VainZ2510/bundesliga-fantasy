import { useEffect, useState } from 'react';
import axios from 'axios';

function BundesligaTest() {
  const [fixtures, setFixtures] = useState([]);
  const API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

  useEffect(() => {
    async function fetchFixtures() {
      try {
        // Bundesliga league id: 82
        const res = await axios.get('http://localhost:5000/api/fixtures');
        setFixtures(res.data.data || []);
      } catch (err) {
        console.error('Sportmonks fetch error:', err);
      }
    }
    fetchFixtures();
  }, [API_KEY]);

  return (
    <div>
      <h2>Test: Bundesliga Fixtures</h2>
      <ul>
        {fixtures.map(fix => (
          <li key={fix.id}>
            {fix.participants?.[0]?.name} vs {fix.participants?.[1]?.name} @ {fix.starting_at}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BundesligaTest;

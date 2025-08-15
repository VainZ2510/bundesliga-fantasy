import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { supabase } from '../supabaseClient.js';
import DraftCenter from './DraftCenter.js';
import ScheduleView from './ScheduleView.js';
import StandingsTable from './StandingsTable.js';

function Dashboard() {
  const leagueId = localStorage.getItem('leagueId');
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          className="logout-btn"
          onClick={async () => {
            await supabase.auth.signOut();
            localStorage.removeItem('leagueId');
            window.location.href = '/login';
          }}
        >
          Log out
        </button>
      </div>
      <h1>Welcome to booyah Bundesliga Fantasy!</h1>
      {!leagueId ? (
        <>
          <p>You are not in a league yet.</p>
          <div className="dashboard-buttons">
            <Link to="/league">
              <button>Create or Join a League</button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <p>What would you like to do?</p>
          <div className="dashboard-buttons">
            <Link to="/team">
              <button>Manage My Team</button>
            </Link>
            <Link to="/draft">
              <button>Go to Draft Center</button>
            </Link>
            <Link to="/standings">
              <button>View Standings</button>
            </Link>
          </div>
          <Link to="/matchups">
  <button>View My Matchups</button>
</Link>

        </>
      )}
    </div>
  );
}

export default Dashboard;

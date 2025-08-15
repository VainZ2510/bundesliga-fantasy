import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.js';
import Login from './pages/Login.js';
import Signup from './pages/Signup.js';
import Dashboard from './pages/Dashboard.js';
import DraftCenter from './pages/DraftCenter.js';
import League from './pages/League.js';
import Team from './pages/Team.js';
import Standings from './pages/Standings.js';
import Matchups from './pages/Matchups.js';
import ScoreUpdater from './pages/ScoreUpdater.js';
import BundesligaTest from './pages/BundesligaTest.js';
import CurrentMatchup from './pages/CurrentMatchup.js';






function App() {
  return (
    <Router>
      <nav style={{ padding: "10px" }}>
        <Link to="/">Home</Link> |{" "}
        <Link to="/login">Login</Link> |{" "}
        <Link to="/signup">Signup</Link> |{" "}
        <Link to="/dashboard">Dashboard</Link> |{" "}
        <Link to="/draft">Draft</Link> |{" "}
        <Link to="/league">League</Link> |{" "}
        <Link to="/team">Team</Link> |{" "}
        <Link to="/bundesligatest">BundesligaTest</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/draft" element={<DraftCenter />} />
        <Route path="/league" element={<League />} />
        <Route path="/team" element={<Team />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/matchups" element={<Matchups />} />
        <Route path="/scoreupdate" element={<ScoreUpdater />} />
        <Route path="/bundesligatest" element={<BundesligaTest />} />
        <Route path="/current-matchup" element={<CurrentMatchup />} />

      </Routes>
    </Router>
  );
}

export default App;

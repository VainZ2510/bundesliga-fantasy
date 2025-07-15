import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DraftCenter from './pages/DraftCenter';
import League from './pages/League';
import Team from './pages/Team';
import Standings from './pages/Standings';
import Matchups from './pages/Matchups';
import ScoreUpdater from './pages/ScoreUpdater';
import BundesligaTest from './pages/BundesligaTest';

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
      </Routes>
    </Router>
  );
}

export default App;

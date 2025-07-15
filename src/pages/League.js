import './League.css';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DraftCenter from './DraftCenter';
import ScheduleView from './ScheduleView';
import StandingsTable from './StandingsTable';

function generateInviteCode(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateMatchups(leagueId) {
  // Delete existing matchups for the league first
  await supabase.from('matchups').delete().eq('league_id', leagueId);

  // Fetch teams
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);

  if (error || !teams) {
    alert('Could not fetch teams');
    return;
  }
  let teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  if (n < 2) {
    alert('Not enough teams');
    return;
  }

  // Add BYE for odd team numbers
  let hasBye = false;
  if (n % 2 !== 0) {
    teamIds.push(null);
    hasBye = true;
  }
  const numTeams = teamIds.length;
  const totalRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  let rounds = [];

  // Generate rounds (Berger Tables)
  let arr = [...teamIds];
  for (let round = 0; round < totalRounds; round++) {
    let roundMatches = [];
    for (let i = 0; i < matchesPerRound; i++) {
      let home = arr[i];
      let away = arr[numTeams - 1 - i];
      if (home !== null && away !== null) {
        roundMatches.push({ home, away });
      }
    }
    rounds.push(roundMatches);

    // Rotate teams, keeping first in place
    arr = [arr[0], ...arr.slice(-1), ...arr.slice(1, -1)];
  }

  // Double round robin: repeat, but swap home/away, and increment week numbers
  let matchups = [];
  let week = 1;
  for (let i = 0; i < rounds.length; i++) {
    for (let match of rounds[i]) {
      matchups.push({
        league_id: leagueId,
        week,
        team1_id: match.home,
        team2_id: match.away,
        team1_score: null,
        team2_score: null,
        status: 'pending'
      });
    }
    week++;
  }
  // Second half, swap home/away
  for (let i = 0; i < rounds.length; i++) {
    for (let match of rounds[i]) {
      matchups.push({
        league_id: leagueId,
        week,
        team1_id: match.away,
        team2_id: match.home,
        team1_score: null,
        team2_score: null,
        status: 'pending'
      });
    }
    week++;
  }

  const { error: insertError } = await supabase
    .from('matchups')
    .insert(matchups);

  if (insertError) {
    alert('Error inserting matchups: ' + insertError.message);
    return;
  }
  alert('Season schedule generated!');
}


function League() {
  const [leagueName, setLeagueName] = useState('');
  const [created, setCreated] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamMessage, setTeamMessage] = useState('');
  const [hasTeam, setHasTeam] = useState(false);
  const [teams, setTeams] = useState([]);
  const [userId, setUserId] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [draftStarted, setDraftStarted] = useState(false);
  const [section, setSection] = useState('schedule'); // Tabs: 'schedule' | 'draft' | 'standings'

  const leagueIdFromStorage = localStorage.getItem('leagueId');

  useEffect(() => {
    async function getUserAndTeams() {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) setUserId(user.user.id);

      if (leagueIdFromStorage) {
        const { data: leagueTeams } = await supabase
          .from('teams')
          .select('id, name, user_id')
          .eq('league_id', leagueIdFromStorage);
        setTeams(leagueTeams || []);

        // Check if this user is the league owner AND if draft has started!
        const { data: league } = await supabase
          .from('leagues')
          .select('owner_id, name, invite_code, draft_started')
          .eq('id', leagueIdFromStorage)
          .single();
        if (league) {
          setIsOwner(league.owner_id === user?.user?.id);
          setLeagueName(league.name);
          setInviteCode(league.invite_code);
          setDraftStarted(!!league.draft_started);
        }

        // Check if user already has a team in this league
        if (user?.user?.id) {
          const { data: userTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('user_id', user.user.id)
            .eq('league_id', leagueIdFromStorage);
          setHasTeam(userTeams && userTeams.length > 0);
        }
      }
    }
    getUserAndTeams();
  }, [leagueIdFromStorage, created, hasTeam, draftStarted]);

  async function getUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    const ownerId = await getUserId();
    if (!ownerId) {
      alert('You must be logged in to create a league');
      return;
    }

    const code = generateInviteCode();
    const { data, error } = await supabase
      .from('leagues')
      .insert([{ name: leagueName, owner_id: ownerId, invite_code: code, draft_started: false }])
      .select()
      .single();

    if (error) {
      alert('Failed to create league');
      return;
    }

    setInviteCode(code);
    localStorage.setItem('leagueId', data.id);
    setCreated(true);
    setJoinMessage('');
    setHasTeam(false);
  };

  const handleJoinLeague = async (e) => {
    e.preventDefault();
    setJoinMessage('');
    setHasTeam(false);

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('invite_code', joinCode)
      .single();

    if (leagueError || !league) {
      setJoinMessage('League not found with that code');
      return;
    }

    const { count, error: countError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.id);

    if (countError) {
      setJoinMessage('Could not check league size');
      return;
    }
    if (count >= 8) {
      setJoinMessage('League is full (max 8 teams)');
      return;
    }

    localStorage.setItem('leagueId', league.id);
    setCreated(true);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setTeamMessage('');
    const userId = await getUserId();
    const leagueId = localStorage.getItem('leagueId');

    if (!userId || !leagueId || !teamName) {
      setTeamMessage('Please fill out all fields');
      return;
    }

    const { data: existingTeams, error: teamErr } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .eq('league_id', leagueId);

    if (teamErr) {
      setTeamMessage('Error checking your teams');
      return;
    }
    if (existingTeams && existingTeams.length > 0) {
      setTeamMessage('You already have a team in this league');
      setHasTeam(true);
      return;
    }

    const { error } = await supabase
      .from('teams')
      .insert([{ name: teamName, user_id: userId, league_id: leagueId }]);
    if (error) {
      setTeamMessage('Error creating team: ' + error.message);
    } else {
      setTeamMessage('Team created successfully!');
      setHasTeam(true);
    }
  };

  const handleStartDraft = async () => {
    await supabase
      .from('leagues')
      .update({ draft_started: true })
      .eq('id', leagueIdFromStorage);
    setDraftStarted(true);
    setSection('draft');
  };

  return (
    <div className="league-container">
      {!leagueIdFromStorage ? (
        <>
          <h1>booyah Bundesliga Fantasy</h1>
          {!created ? (
            <>
              <h2>Create a League</h2>
              <form onSubmit={handleCreate}>
                <input
                  type="text"
                  placeholder="League Name"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  required
                />
                <button type="submit">Create League</button>
              </form>
              <hr />
              <h2>Or Join a League</h2>
              <form onSubmit={handleJoinLeague}>
                <input
                  type="text"
                  placeholder="Enter Invite Code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  required
                />
                <button type="submit">Join League</button>
              </form>
              {joinMessage && <div style={{ color: 'red' }}>{joinMessage}</div>}
            </>
          ) : (
            <div className="success-message">
              <h3>League "{leagueName}" created!</h3>
              <p>Share this link to invite friends:</p>
              <input readOnly value={`https://your-app-url.com/join/${inviteCode}`} />
              <h3 style={{ marginTop: 24 }}>Create Your Team</h3>
              <form onSubmit={handleCreateTeam}>
                <input
                  type="text"
                  placeholder="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
                <button type="submit">Create Team</button>
              </form>
              {teamMessage && <div style={{ color: hasTeam ? 'green' : 'red', marginTop: 8 }}>{teamMessage}</div>}
            </div>
          )}
        </>
      ) : (
        !hasTeam ? (
          <div>
            <h2>Create Your Team</h2>
            <form onSubmit={handleCreateTeam}>
              <input
                type="text"
                placeholder="Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
              <button type="submit">Create Team</button>
            </form>
            {teamMessage && <div style={{ color: hasTeam ? 'green' : 'red', marginTop: 8 }}>{teamMessage}</div>}
          </div>
        ) : (
          <>
            <h1>booyah Bundesliga Fantasy</h1>
            <h2>League: {leagueName}</h2>
            <p>Invite Code: {inviteCode}</p>
            <h3>Teams in this league:</h3>
            <ul>
              {teams.map(team => (
                <li key={team.id}>
                  {team.name} {team.user_id === userId && '(You)'}
                </li>
              ))}
            </ul>

            {/* ---- NAVIGATION BUTTONS ---- */}
            <div style={{ margin: '18px 0' }}>
              <button onClick={() => setSection('schedule')} disabled={section === 'schedule'}>
                Schedule
              </button>
              <button
                onClick={() => setSection('draft')}
                disabled={section === 'draft' || !draftStarted}
                style={{ marginLeft: 8 }}
              >
                Draft / Swap Center
              </button>
              <button
                onClick={() => setSection('standings')}
                disabled={section === 'standings'}
                style={{ marginLeft: 8 }}
              >
                Standings
              </button>
            </div>

            {/* Only owner sees start draft button */}
            {isOwner && !draftStarted && (
              <button style={{ marginBottom: 16 }} onClick={handleStartDraft}>
                Start Draft
              </button>
            )}

            {/* Only owner sees generate matchups */}
            {isOwner && teams.length >= 2 && (
              <button style={{ marginBottom: 16, marginLeft: 16 }} onClick={() => generateMatchups(leagueIdFromStorage)}>
                Generate Season Schedule
              </button>
              
            )}

            {/* ---- SECTION DISPLAY ---- */}
            <div>
              {section === 'schedule' && (
                <ScheduleView leagueId={leagueIdFromStorage} />
              )}

              {section === 'draft' && draftStarted && (
                <DraftCenter leagueId={leagueIdFromStorage} />
              )}

              {section === 'draft' && !draftStarted && (
                <div style={{ marginTop: 16, color: 'gray' }}>
                  The draft has not started yet.
                </div>
              )}

              {section === 'standings' && (
                <StandingsTable leagueId={leagueIdFromStorage} />
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default League;

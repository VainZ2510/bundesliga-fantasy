require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SPORTMONKS_API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

// Fetch Bundesliga league with current season and all teams included
async function fetchBundesligaTeams() {
  const url = `https://api.sportmonks.com/v3/football/leagues/82?api_token=${SPORTMONKS_API_KEY}&include=currentseason.teams`;
  try {
    const res = await axios.get(url);
    console.log('League response:', JSON.stringify(res.data, null, 2));
const teams = res.data.data?.currentseason?.teams || [];

    console.log(`Fetched ${teams.length} Bundesliga teams.`);
    return teams;
  } catch (err) {
    console.error('Error fetching Bundesliga teams:', err.response?.data || err.message);
    return [];
  }
}

// Fetch squad (players) for a given team ID
async function fetchTeamSquad(teamId) {
  const url = `https://api.sportmonks.com/v3/football/squads/teams/${teamId}/extended?api_token=${SPORTMONKS_API_KEY}`;
  try {
    const res = await axios.get(url);
    return res.data.data;
  } catch (err) {
    console.error(`Error fetching squad for team ${teamId}:`, err.response?.data || err.message);
    return [];
  }
}

// Normalize strings for matching
function normalizeString(str) {
  return str.toLowerCase().trim();
}

// Main function to update players' api_id in Supabase
async function updatePlayersApiId() {
  const teams = await fetchBundesligaTeams();
  if (teams.length === 0) {
    console.log('No teams found, aborting.');
    return;
  }

  // Fetch local players once
  const { data: localPlayers, error: localError } = await supabase
    .from('players')
    .select('id, name, club');

  if (localError) {
    console.error('Error fetching local players:', localError);
    return;
  }

  // For each team, fetch squad players and update matches
  for (const team of teams) {
    const teamNameNormalized = normalizeString(team.name);
    const squadPlayers = await fetchTeamSquad(team.id);

    for (const sp of squadPlayers) {
      const spNameNormalized = normalizeString(sp.name);

      // Find matching local player by name AND club
      const localPlayer = localPlayers.find(lp =>
        normalizeString(lp.name) === spNameNormalized &&
        normalizeString(lp.club) === teamNameNormalized
      );

      if (localPlayer) {
        // Update api_id
        const { error: updateError } = await supabase
          .from('players')
          .update({ api_id: sp.player_id.toString() })
          .eq('id', localPlayer.id);

        if (updateError) {
          console.error(`Failed to update player ${localPlayer.name}`, updateError);
        } else {
          console.log(`Updated player ${localPlayer.name} with api_id ${sp.player_id}`);
        }
      } else {
        console.log(`No match for player ${sp.name} in club ${team.name}`);
      }
    }
  }
}

updatePlayersApiId()
  .then(() => console.log('Update process complete.'))
  .catch(console.error);
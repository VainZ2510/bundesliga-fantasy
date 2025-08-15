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
    return res.data.data || [];
  } catch (err) {
    console.error(`Error fetching squad for team ${teamId}:`, err.response?.data || err.message);
    return [];
  }
}

// Main sync function
async function syncBundesligaPlayers() {
  const teams = await fetchBundesligaTeams();
  if (teams.length === 0) {
    console.log('No teams found, aborting.');
    return;
  }

  for (const team of teams) {
    // Upsert team
    const { error: teamError } = await supabase
      .from('bundesliga_teams')
      .upsert({
        id: team.id,
        name: team.name,
        short_code: team.short_code,
        country_id: team.country_id,
        sport_id: team.sport_id,
        venue_id: team.venue_id,
        image_path: team.image_path,
        founded: team.founded,
        type: team.type,
        placeholder: team.placeholder
      });
    if (teamError) {
      console.error(`Error upserting team ${team.name}:`, teamError);
    }

    // Fetch and upsert players for this team
    const squad = await fetchTeamSquad(team.id);
    for (const player of squad) {
      if (!player.player_id) {
        console.warn(`Skipping player with missing player_id:`, player.name || player);
        continue;
      }
      const { error: playerError } = await supabase
        .from('players')
        .upsert({
          api_id: player.player_id.toString(),
          name: player.name || '',
          club: team.name || '',
          position: player.position_name || 'Unknown',
          nationality: player.nationality || '',
          birthdate: player.date_of_birth || null,
          image_path: player.image_path || ''
        });
      if (playerError) {
        console.error(`Error upserting player ${player.name}:`, playerError);
      }
    }
  }
  console.log('Bundesliga teams and players synced successfully!');
}

syncBundesligaPlayers()
  .catch(console.error);

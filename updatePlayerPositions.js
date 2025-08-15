require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SPORTMONKS_API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

async function fetchPlayerDetails(playerId) {
  const url = `https://api.sportmonks.com/v3/football/players/${playerId}?api_token=${SPORTMONKS_API_KEY}`;
  try {
    const res = await axios.get(url);
    console.log(`Player ${playerId} details:`, JSON.stringify(res.data.data, null, 2)); // <-- log full data
    return res.data.data;
  } catch (err) {
    console.error(`Failed to fetch details for player ${playerId}:`, err.response?.data || err.message);
    return null;
  }
}


async function updatePlayerPositions() {
  // Get all players from your table with a valid api_id
  const { data: players, error } = await supabase
    .from('players')
    .select('id, api_id, name');

  if (error) {
    console.error('Error fetching players from Supabase:', error);
    return;
  }

  for (const player of players) {
    if (!player.api_id) {
      console.log(`Skipping player ${player.name} without api_id`);
      continue;
    }

    const details = await fetchPlayerDetails(player.api_id);
    if (!details) continue;

    // Position name usually in details.position_name or similar
    const position = details.position_name || details.position?.name || null;

    if (!position) {
      console.log(`No position info for player ${player.name} (${player.api_id})`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({ position: position })
      .eq('id', player.id);

    if (updateError) {
      console.error(`Failed to update position for player ${player.name}:`, updateError);
    } else {
      console.log(`Updated position for player ${player.name} to "${position}"`);
    }
  }
  console.log('Player positions updated successfully!');
}

updatePlayerPositions().catch(console.error);

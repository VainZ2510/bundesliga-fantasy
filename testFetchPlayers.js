require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

async function fetchBundesligaPlayers() {
  try {
    const res = await axios.get(`https://api.sportmonks.com/v3/football/players?leagues=82&season=latest&page=1&api_token=${API_KEY}&include=team`);
    if (res.data.data) {
      console.log('Sample player object:', res.data.data[0]);
    } else {
      console.log('No player data found');
    }
  } catch (error) {
    console.error('Error fetching Bundesliga players:', error.response?.data || error.message);
  }
}

fetchBundesligaPlayers();

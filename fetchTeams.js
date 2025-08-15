require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

async function fetchBundesligaTeams() {
  try {
    const res = await axios.get(`https://api.sportmonks.com/v3/football/teams?leagues=82&api_token=${API_KEY}`);
    return res.data.data;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

fetchBundesligaTeams().then(teams => {
  console.log('Bundesliga Teams from Sportmonks API:');
  teams.forEach(team => {
    console.log(`${team.name}`);
  });
});

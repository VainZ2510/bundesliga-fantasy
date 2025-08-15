require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

async function fetchLeagues() {
  try {
    const res = await axios.get(`https://api.sportmonks.com/v3/football/leagues?api_token=${API_KEY}`);
    return res.data.data;
  } catch (error) {
    console.error('Error fetching leagues:', error);
    return [];
  }
}

fetchLeagues().then(leagues => {
  console.log('Leagues available in your subscription:');
  leagues.forEach(league => {
    console.log(`ID: ${league.id} - Name: ${league.name}`);
  });
});

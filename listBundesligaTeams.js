require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

async function fetchBundesligaTeams() {
  try {
   const res = await axios.get(`https://api.sportmonks.com/v3/football/teams?league=82&season=latest&api_token=${SPORTMONKS_API_KEY}`);
    const teams = res.data.data;

    console.log(`Fetched ${teams.length} Bundesliga teams:`);
    teams.forEach(team => {
      console.log(`ID: ${team.id} - Name: ${team.name}`);
    });
  } catch (error) {
    console.error("Error fetching Bundesliga teams:", error.response?.data || error.message);
  }
}

fetchBundesligaTeams();

require('dotenv').config();
const axios = require('axios');

const SPORTMONKS_API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

async function fetchSportmonksTeams() {
  const res = await axios.get(`https://api.sportmonks.com/v3/football/teams?leagues=82&season=latest&api_token=${SPORTMONKS_API_KEY}`);
  if (!res.data.data) return [];
  return res.data.data;
}

fetchSportmonksTeams()
  .then(teams => {
    console.log('Sportmonks teams:');
    teams.forEach(team => {
      console.log(team.name);
    });
  })
  .catch(console.error);

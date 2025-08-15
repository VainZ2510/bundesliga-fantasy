require('dotenv').config();
const axios = require('axios');

const key = process.env.REACT_APP_SPORTMONKS_KEY;

async function test() {
  try {
    const res = await axios.get(`https://api.sportmonks.com/v3/football/leagues/82?api_token=${key}&include=currentseason.teams`);
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();

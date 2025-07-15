const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const API_KEY = process.env.REACT_APP_SPORTMONKS_KEY;

// Proxy endpoint
app.get('/api/fixtures', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.sportmonks.com/v3/football/fixtures?leagues=82&season=latest&api_token=${API_KEY}`
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});

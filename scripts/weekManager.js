import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const API_KEY = process.env.SPORTMONKS_KEY || process.env.REACT_APP_SPORTMONKS_KEY;
const LEAGUE_ID_BUNDESLIGA = 82; // Bundesliga league ID

async function getGameweeks() {
  const { data, error } = await supabase.from('gameweeks').select('*');
  if (error) throw error;
  return data || [];
}

async function goLive(week) {
  const { error } = await supabase.rpc('go_live', { p_week: week });
  if (error) console.error('go_live error', error.message);
}

async function closeWeek(week) {
  const { error } = await supabase.rpc('close_week', { p_week: week });
  if (error) console.error('close_week error', error.message);
}

async function allFixturesFinished(week) {
  try {
    const res = await fetch(
      `https://api.sportmonks.com/v3/football/fixtures?leagues=${LEAGUE_ID_BUNDESLIGA}&season=latest&round=${week}&api_token=${API_KEY}`
    );
    const json = await res.json();
    if (!json?.data?.length) return false;
    const doneStatuses = new Set(['FT','AET','PEN','FT_PEN','ENDED','POSTPONED','CANCELLED']);
    return json.data.every(f => doneStatuses.has(String(f.status).toUpperCase()));
  } catch {
    return false;
  }
}

async function tick() {
  try {
    const weeks = await getGameweeks();
    const now = new Date();

    for (const gw of weeks) {
      if (gw.status === 'upcoming' && new Date(gw.lock_at) <= now) {
        await goLive(gw.week);
      }
      if (gw.status === 'live') {
        const fixturesDone = await allFixturesFinished(gw.week);
        if (fixturesDone) {
          await closeWeek(gw.week);
        }
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}

console.log('⏱ weekManager running...');
setInterval(tick, 60_000);
await tick();

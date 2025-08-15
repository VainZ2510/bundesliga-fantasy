import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import './CurrentMatchup.css';

const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];

// Optional: slug helper for crest filenames in /public/crests/<slug>.png
const crestSrc = (club) =>
  club ? `/crests/${club.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png` : null;

export default function CurrentMatchup() {
  const leagueId = localStorage.getItem('leagueId');
  const [myTeam, setMyTeam] = useState(null);
  const [oppTeam, setOppTeam] = useState(null);
  const [matchup, setMatchup] = useState(null);

  const [myPlayers, setMyPlayers] = useState([]);
  const [oppPlayers, setOppPlayers] = useState([]);
  const [myPts, setMyPts] = useState({});
  const [oppPts, setOppPts] = useState({});
  const [myEv, setMyEv] = useState({});
  const [oppEv, setOppEv] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  const orderPlayers = (rows) =>
    (rows || [])
      .slice()
      .sort((a, b) => {
        const pa = POS_ORDER.indexOf(a.position);
        const pb = POS_ORDER.indexOf(b.position);
        return pa === pb ? a.name.localeCompare(b.name) : pa - pb;
      });

  function pairByPosition(leftArr, rightArr) {
    const group = (arr) =>
      POS_ORDER.reduce((acc, pos) => {
        acc[pos] = arr.filter((p) => p.position === pos);
        return acc;
      }, {});
    const L = group(leftArr);
    const R = group(rightArr);

    const rows = [];
    for (const pos of POS_ORDER) {
      const len = Math.max(L[pos].length, R[pos].length);
      for (let i = 0; i < len; i++) {
        rows.push({
          left: L[pos][i] || null,
          right: R[pos][i] || null,
        });
      }
    }
    return rows;
  }

  const fetchAll = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId || !leagueId) return;

    // My team
    const { data: my } = await supabase
      .from('teams')
      .select('id, name')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();
    if (!my) return;
    setMyTeam(my);

    // My active/pending matchup (closest by week)
    const { data: m } = await supabase
      .from('matchups')
      .select('*')
      .eq('league_id', leagueId)
      .or(`team1_id.eq.${my.id},team2_id.eq.${my.id}`)
      .neq('status', 'complete')
      .order('week', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!m) {
      setLoading(false);
      return;
    }
    setMatchup(m);

    // Opponent
    const oppId = m.team1_id === my.id ? m.team2_id : m.team1_id;
    const { data: opp } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', oppId)
      .single();
    setOppTeam(opp);

    // Team players
    const [{ data: mineTP }, { data: oppTP }] = await Promise.all([
      supabase.from('team_players').select('player_id').eq('team_id', my.id),
      supabase.from('team_players').select('player_id').eq('team_id', oppId),
    ]);
    const myIds = (mineTP || []).map((r) => r.player_id);
    const oppIds = (oppTP || []).map((r) => r.player_id);

    // Pull full player rows (assumes bundesliga_players has "club" column)
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      myIds.length
        ? supabase
            .from('bundesliga_players')
            .select('id, name, position, club')
            .in('id', myIds)
        : { data: [] },
      oppIds.length
        ? supabase
            .from('bundesliga_players')
            .select('id, name, position, club')
            .in('id', oppIds)
        : { data: [] },
    ]);
    const myOrdered = orderPlayers(mine || []);
    const oppOrdered = orderPlayers(theirs || []);
    setMyPlayers(myOrdered);
    setOppPlayers(oppOrdered);

    // Live points
    const [{ data: mp }, { data: op }] = await Promise.all([
      supabase
        .from('player_live_points')
        .select('player_id, points')
        .eq('team_id', my.id)
        .eq('week', m.week),
      supabase
        .from('player_live_points')
        .select('player_id, points')
        .eq('team_id', oppId)
        .eq('week', m.week),
    ]);
    setMyPts(
      Object.fromEntries((mp || []).map((r) => [r.player_id, Number(r.points || 0)]))
    );
    setOppPts(
      Object.fromEntries((op || []).map((r) => [r.player_id, Number(r.points || 0)]))
    );

    // Events (for icons). If table is empty, nothing will show.
    const [{ data: me }, { data: oe }] = await Promise.all([
      supabase
        .from('player_live_events')
        .select('*')
        .eq('team_id', my.id)
        .eq('week', m.week),
      supabase
        .from('player_live_events')
        .select('*')
        .eq('team_id', oppId)
        .eq('week', m.week),
    ]);
    setMyEv(Object.fromEntries((me || []).map((r) => [r.player_id, r])));
    setOppEv(Object.fromEntries((oe || []).map((r) => [r.player_id, r])));

    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15000);
    return () => clearInterval(id);
  }, [leagueId]);

  const iAmTeam1 = matchup && myTeam && matchup.team1_id === myTeam.id;
  const myTotal = useMemo(
    () => (matchup ? Number(iAmTeam1 ? matchup.team1_score : matchup.team2_score) || 0 : 0),
    [matchup, iAmTeam1]
  );
  const oppTotal = useMemo(
    () => (matchup ? Number(iAmTeam1 ? matchup.team2_score : matchup.team1_score) || 0 : 0),
    [matchup, iAmTeam1]
  );

  const leftLeads = myTotal >= oppTotal;
  const rows = pairByPosition(myPlayers, oppPlayers);

  const EventIcons = ({ ev }) => {
    if (!ev) return null;
    const chips = [];
    if (ev.goals)       chips.push(<span key="g">⚽ {ev.goals}</span>);
    if (ev.assists)     chips.push(<span key="a">🅰️ {ev.assists}</span>);
    if (ev.yellow)      chips.push(<span key="y">🟨 {ev.yellow}</span>);
    if (ev.red)         chips.push(<span key="r">🟥 {ev.red}</span>);
    if (ev.pens_saved)  chips.push(<span key="ps">🧤 {ev.pens_saved}</span>);
    if (ev.pens_missed) chips.push(<span key="pm">❌ {ev.pens_missed}</span>);
    if (ev.own_goals)   chips.push(<span key="og">⛔ {ev.own_goals}</span>);
    return chips.length ? <div className="cm-icons">{chips}</div> : null;
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading matchup…</div>;
  if (!matchup) return <div style={{ padding: 20, textAlign: 'center' }}>No active matchup.</div>;

  return (
    <div className="cm-wrap">
      <div className="cm-title">
        {myTeam?.name}{' '}
        <span className={leftLeads ? 'good' : 'bad'}>
          ({myTotal.toFixed(1)} pts)
        </span>{' '}
        vs {oppTeam?.name}{' '}
        <span className={leftLeads ? 'bad' : 'good'}>
          ({oppTotal.toFixed(1)} pts)
        </span>
      </div>

      {lastUpdated && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <div className="cm-card">
        <div className="cm-head">
          <div>Player</div>
          <div className="center">Score</div>
          <div className="right">Player</div>
        </div>

        {rows.length === 0 ? (
          <div className="cm-empty">No players yet for this matchup.</div>
        ) : (
          rows.map((row, idx) => {
            const L = row.left;
            const R = row.right;
            const lPts = L ? (myPts[L.id] || 0) : null;
            const rPts = R ? (oppPts[R.id] || 0) : null;
            const lEv = L ? myEv[L.id] : null;
            const rEv = R ? oppEv[R.id] : null;

            return (
              <div className="cm-row" key={idx}>
                <div className="cm-cell">
                  {L ? (
                    <div className="cm-player left">
                      <div className="cm-rowtop">
                        {L.club && <img className="cm-crest" src={crestSrc(L.club)} alt="" onError={(e)=>{e.currentTarget.style.display='none'}} />}
                        <div>
                          <div className="cm-name">{L.name}</div>
                          <div className="cm-pos">{L.position}</div>
                        </div>
                      </div>
                      <EventIcons ev={lEv} />
                    </div>
                  ) : (
                    <div className="cm-missing">—</div>
                  )}
                </div>

                <div className="cm-cell center">
                  <div className="cm-score">
                    <span>{L ? lPts.toFixed(1) : ''}</span>
                    <span className="sep">:</span>
                    <span>{R ? rPts.toFixed(1) : ''}</span>
                  </div>
                </div>

                <div className="cm-cell right">
                  {R ? (
                    <div className="cm-player right">
                      <div className="cm-rowtop">
                        <div>
                          <div className="cm-name">{R.name}</div>
                          <div className="cm-pos">{R.position}</div>
                        </div>
                        {R.club && <img className="cm-crest" src={crestSrc(R.club)} alt="" onError={(e)=>{e.currentTarget.style.display='none'}} />}
                      </div>
                      <EventIcons ev={rEv} />
                    </div>
                  ) : (
                    <div className="cm-missing">—</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

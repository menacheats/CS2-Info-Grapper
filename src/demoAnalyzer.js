import axios from 'axios';

export async function fetchRecentDemos(steamId) {
  const demos = {
    faceit: [],
    esea: [],
    mm: [],
    errors: []
  };

  // Try FaceIt demos
  try {
    demos.faceit = await fetchFaceItDemos(steamId);
  } catch (e) {
    demos.errors.push(`FaceIt demos: ${e.message}`);
  }

  // Try ESEA demos
  try {
    demos.esea = await fetchESEADemos(steamId);
  } catch (e) {
    demos.errors.push(`ESEA demos: ${e.message}`);
  }

  return demos;
}

async function fetchFaceItDemos(steamId) {
  const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
  if (!FACEIT_API_KEY) return [];

  try {
    // Search for player
    const searchRes = await axios.get('https://open.faceit.com/api/v4/players', {
      params: {
        nickname: steamId,
        game: 'cs2'
      },
      headers: {
        'Authorization': `Bearer ${FACEIT_API_KEY}`
      },
      timeout: 5000
    });

    if (!searchRes.data.players || searchRes.data.players.length === 0) {
      return [];
    }

    const playerId = searchRes.data.players[0].player_id;

    // Fetch recent matches
    const matchesRes = await axios.get(`https://open.faceit.com/api/v4/players/${playerId}/matches?game=cs2&limit=20`, {
      headers: {
        'Authorization': `Bearer ${FACEIT_API_KEY}`
      },
      timeout: 5000
    });

    const matches = matchesRes.data.items || [];
    const demos = [];

    for (const match of matches.slice(0, 10)) {
      try {
        const matchRes = await axios.get(`https://open.faceit.com/api/v4/matches/${match.match_id}`, {
          headers: {
            'Authorization': `Bearer ${FACEIT_API_KEY}`
          },
          timeout: 5000
        });

        const matchData = matchRes.data;
        const playerStats = matchData.players.find(p => p.player_id === playerId);

        if (playerStats) {
          demos.push({
            platform: 'FaceIt',
            matchId: match.match_id,
            date: new Date(matchData.created_at).toLocaleDateString(),
            map: matchData.voting?.map?.pick || 'Unknown',
            result: playerStats.player_stats?.Result || 'Unknown',
            kills: parseInt(playerStats.player_stats?.Kills) || 0,
            deaths: parseInt(playerStats.player_stats?.Deaths) || 0,
            assists: parseInt(playerStats.player_stats?.Assists) || 0,
            kd: ((parseInt(playerStats.player_stats?.Kills) || 0) / (parseInt(playerStats.player_stats?.Deaths) || 1)).toFixed(2),
            hs: playerStats.player_stats?.['HS %'] || '0%',
            demoUrl: matchData.demo_url?.[0] || null,
            status: matchData.status
          });
        }
      } catch (e) {
        // Skip individual match errors
      }
    }

    return demos;
  } catch (e) {
    return [];
  }
}

async function fetchESEADemos(steamId) {
  // ESEA doesn't have a public API, but we can try to fetch from their website
  try {
    const res = await axios.get(`https://play.esea.net/api/player/${steamId}/matches?limit=10`, {
      timeout: 5000
    });

    if (!res.data || !res.data.matches) return [];

    return res.data.matches.map(match => ({
      platform: 'ESEA',
      matchId: match.id,
      date: new Date(match.date * 1000).toLocaleDateString(),
      map: match.map || 'Unknown',
      result: match.result || 'Unknown',
      kills: match.kills || 0,
      deaths: match.deaths || 0,
      assists: match.assists || 0,
      kd: ((match.kills || 0) / (match.deaths || 1)).toFixed(2),
      hs: match.hs_percent || '0%',
      demoUrl: match.demo_url || null,
      status: 'completed'
    }));
  } catch (e) {
    return [];
  }
}

export function analyzeDemos(demos) {
  const analysis = {
    totalMatches: 0,
    avgKD: 0,
    avgHS: 0,
    winRate: 0,
    suspiciousMatches: [],
    consistencyScore: 0,
    trends: {}
  };

  const allDemos = [...(demos.faceit || []), ...(demos.esea || [])];
  
  if (allDemos.length === 0) {
    return analysis;
  }

  analysis.totalMatches = allDemos.length;

  // Calculate averages
  let totalKD = 0;
  let totalHS = 0;
  let wins = 0;

  allDemos.forEach(demo => {
    totalKD += parseFloat(demo.kd);
    totalHS += parseFloat(demo.hs);
    if (demo.result === 'won' || demo.result === '1') wins++;
  });

  analysis.avgKD = (totalKD / allDemos.length).toFixed(2);
  analysis.avgHS = (totalHS / allDemos.length).toFixed(1);
  analysis.winRate = ((wins / allDemos.length) * 100).toFixed(1);

  // Find suspicious matches (very high K/D or HS%)
  allDemos.forEach(demo => {
    const kd = parseFloat(demo.kd);
    const hs = parseFloat(demo.hs);

    if (kd > 3.0 || hs > 70) {
      analysis.suspiciousMatches.push({
        date: demo.date,
        map: demo.map,
        kd,
        hs,
        kills: demo.kills,
        deaths: demo.deaths,
        reason: kd > 3.0 ? 'Extremely high K/D' : 'Extremely high HS%'
      });
    }
  });

  // Calculate consistency score (lower variance = higher consistency)
  const kdValues = allDemos.map(d => parseFloat(d.kd));
  const mean = kdValues.reduce((a, b) => a + b) / kdValues.length;
  const variance = kdValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / kdValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Convert std dev to consistency score (0-100)
  analysis.consistencyScore = Math.max(0, 100 - (stdDev * 20));

  // Analyze trends (recent vs older)
  if (allDemos.length >= 5) {
    const recent = allDemos.slice(0, 5);
    const older = allDemos.slice(-5);

    const recentAvgKD = recent.reduce((sum, d) => sum + parseFloat(d.kd), 0) / recent.length;
    const olderAvgKD = older.reduce((sum, d) => sum + parseFloat(d.kd), 0) / older.length;

    analysis.trends.kdTrend = recentAvgKD > olderAvgKD ? 'IMPROVING' : recentAvgKD < olderAvgKD ? 'DECLINING' : 'STABLE';
    analysis.trends.kdChange = (recentAvgKD - olderAvgKD).toFixed(2);
  }

  return analysis;
}

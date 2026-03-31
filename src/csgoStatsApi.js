import axios from 'axios';

// Third-party APIs for CS2 stats
const FACEIT_API = 'https://open.faceit.com/api/v4';
const FACEIT_API_KEY = process.env.FACEIT_API_KEY || null;

export async function fetchCS2Stats(steamId) {
  const stats = {
    faceit: null,
    esea: null,
    mm: null,
    errors: []
  };

  // Try to fetch FaceIt stats
  if (FACEIT_API_KEY) {
    try {
      stats.faceit = await fetchFaceItStats(steamId);
    } catch (e) {
      stats.errors.push(`FaceIt: ${e.message}`);
    }
  }

  return stats;
}

async function fetchFaceItStats(steamId) {
  try {
    // Search for player by Steam ID
    const searchRes = await axios.get(`${FACEIT_API}/players`, {
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
      return null;
    }

    const player = searchRes.data.players[0];
    const playerId = player.player_id;

    // Fetch player stats
    const statsRes = await axios.get(`${FACEIT_API}/players/${playerId}/stats?game=cs2`, {
      headers: {
        'Authorization': `Bearer ${FACEIT_API_KEY}`
      },
      timeout: 5000
    });

    // Fetch recent matches
    const matchesRes = await axios.get(`${FACEIT_API}/players/${playerId}/matches?game=cs2&limit=20`, {
      headers: {
        'Authorization': `Bearer ${FACEIT_API_KEY}`
      },
      timeout: 5000
    });

    return {
      nickname: player.nickname,
      level: player.games?.cs2?.skill_level || 0,
      elo: player.games?.cs2?.faceit_elo || 0,
      stats: statsRes.data.lifetime || {},
      recentMatches: matchesRes.data.items || []
    };
  } catch (e) {
    return null;
  }
}

export function analyzePlayPattern(playerData) {
  const analysis = {
    suspiciousPatterns: [],
    riskFactors: [],
    positiveFactors: []
  };

  if (!playerData.faceit) {
    return analysis;
  }

  const stats = playerData.faceit.stats;
  const kd = parseFloat(stats['K/D Ratio'] || 0);
  const hs = parseFloat(stats['HS %'] || 0);
  const matches = parseFloat(stats['Matches'] || 0);

  // Analyze K/D ratio
  if (kd > 3.0 && matches > 100) {
    analysis.suspiciousPatterns.push('Extremely high K/D ratio (>3.0) with many matches');
    analysis.riskFactors.push('Potential aim hacking');
  } else if (kd > 2.0 && matches > 50) {
    analysis.riskFactors.push('High K/D ratio (>2.0)');
  } else if (kd > 1.5) {
    analysis.positiveFactors.push('Good K/D ratio');
  }

  // Analyze headshot percentage
  if (hs > 65 && matches > 50) {
    analysis.suspiciousPatterns.push('Unusually high headshot percentage (>65%)');
    analysis.riskFactors.push('Potential aim assist/aimbot');
  } else if (hs > 55) {
    analysis.riskFactors.push('High headshot percentage (>55%)');
  } else if (hs > 40) {
    analysis.positiveFactors.push('Good headshot percentage');
  }

  // Analyze consistency
  if (matches > 100) {
    analysis.positiveFactors.push('Consistent player with many matches');
  }

  return analysis;
}

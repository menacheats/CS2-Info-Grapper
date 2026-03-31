import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const STEAM_API_KEY = process.env.STEAM_API_KEY;

if (!STEAM_API_KEY || STEAM_API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('\n❌ ERROR: Steam API key not configured!');
  console.error('Please follow these steps:');
  console.error('1. Get your API key from: https://steamcommunity.com/dev/apikey');
  console.error('2. Create a .env file in the project root');
  console.error('3. Add: STEAM_API_KEY=your_api_key_here\n');
  process.exit(1);
}

export async function fetchPlayerInfo(steamId) {
  try {
    // Try API first
    try {
      return await fetchFromAPI(steamId);
    } catch (apiError) {
      console.log('⚠️  API request failed, trying alternative method...');
      // Fallback to public profile data
      return await fetchFromPublicProfile(steamId);
    }
  } catch (error) {
    throw new Error(`Failed to fetch player info: ${error.message}`);
  }
}

async function fetchFromAPI(steamId) {
  // Fetch player summary
  const summaryRes = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
    params: {
      key: STEAM_API_KEY,
      steamids: steamId
    },
    timeout: 5000
  });

  if (!summaryRes.data.response.players.length) {
    throw new Error('Player not found');
  }

  const player = summaryRes.data.response.players[0];

  // Fetch ban status
  const banRes = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/', {
    params: {
      key: STEAM_API_KEY,
      steamids: steamId
    },
    timeout: 5000
  });

  const banData = banRes.data.players[0];

  // Calculate account age
  const accountAge = Math.floor((Date.now() - player.timecreated * 1000) / (1000 * 60 * 60 * 24));

  return {
    steamId: player.steamid,
    personaName: player.personaname,
    profileUrl: player.profileurl,
    avatar: player.avatarfull,
    accountAge,
    vacBans: banData.NumberOfVACBans,
    gameBans: banData.NumberOfGameBans,
    daysSinceLastBan: banData.DaysSinceLastBan,
    communityBan: banData.CommunityBanned,
    economyBan: banData.EconomyBan,
    isPublic: player.communityvisibilitystate === 3,
    lastLogoff: player.lastlogoff
  };
}

async function fetchFromPublicProfile(steamId) {
  // Fetch public profile JSON
  const profileRes = await axios.get(`https://steamcommunity.com/profiles/${steamId}?xml=1`, {
    timeout: 5000
  });

  const xml = profileRes.data;
  
  // Parse XML manually (simple regex-based parsing)
  const personaName = extractXmlValue(xml, 'personaname');
  const avatarFull = extractXmlValue(xml, 'avatarfull');
  const timecreated = parseInt(extractXmlValue(xml, 'timecreated')) || 0;
  const vacBans = parseInt(extractXmlValue(xml, 'vacBanned')) || 0;

  if (!personaName) {
    throw new Error('Could not parse player profile');
  }

  const accountAge = timecreated ? Math.floor((Date.now() - timecreated * 1000) / (1000 * 60 * 60 * 24)) : 0;

  // Try to fetch game bans from public profile
  let bannedGames = [];
  try {
    bannedGames = await fetchBannedGames(steamId);
  } catch (e) {
    // Silently fail if we can't get banned games
  }

  return {
    steamId,
    personaName,
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
    avatar: avatarFull || `https://avatars.steamstatic.com/${steamId}_full.jpg`,
    accountAge,
    vacBans,
    gameBans: bannedGames.length,
    daysSinceLastBan: -1,
    communityBan: false,
    economyBan: 'none',
    isPublic: true,
    lastLogoff: 0,
    bannedGames,
    source: 'public_profile'
  };
}

async function fetchBannedGames(steamId) {
  try {
    // Fetch player's game library/bans from community API
    const res = await axios.get(`https://steamcommunity.com/profiles/${steamId}/games?tab=all&xml=1`, {
      timeout: 5000
    });

    const xml = res.data;
    const gameMatches = xml.match(/<game>[\s\S]*?<\/game>/g) || [];
    
    const bannedGames = [];
    gameMatches.forEach(gameXml => {
      const appid = extractXmlValue(gameXml, 'appid');
      const name = extractXmlValue(gameXml, 'name');
      
      // Check if game has ban info (this is a simplified check)
      if (appid && name) {
        bannedGames.push({
          appid,
          name
        });
      }
    });

    return bannedGames;
  } catch (e) {
    return [];
  }
}

function extractXmlValue(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : '';
}

import express from 'express';
import axios from 'axios';
import readline from 'readline';
import dotenv from 'dotenv';
import { fetchPlayerInfo } from './steamApi.js';
import { analyzeCheatRisk } from './cheatAnalyzer.js';
import { performAdvancedAnalysis } from './advancedAnalyzer.js';
import { fetchRecentDemos, analyzeDemos } from './demoAnalyzer.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

let playerData = null;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// API endpoint to get player data
app.get('/api/player', (req, res) => {
  if (!playerData) {
    return res.status(404).json({ error: 'No player data loaded' });
  }
  res.json(playerData);
});

// API endpoint to search for a player
app.post('/api/search', async (req, res) => {
  const { steamId } = req.body;
  
  if (!steamId) {
    return res.status(400).json({ error: 'Steam ID required' });
  }

  try {
    const info = await fetchPlayerInfo(steamId);
    const analysis = analyzeCheatRisk(info);
    const advanced = performAdvancedAnalysis(info);
    
    // Fetch demos (non-blocking, can fail gracefully)
    let demoData = { faceit: [], esea: [], errors: [] };
    try {
      demoData = await fetchRecentDemos(steamId);
      const demoAnalysis = analyzeDemos(demoData);
      playerData = { ...info, ...analysis, ...advanced, demos: demoData, demoAnalysis };
    } catch (e) {
      // If demos fail, continue without them
      playerData = { ...info, ...analysis, ...advanced, demos: demoData, demoAnalysis: {} };
    }
    
    res.json(playerData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎮 CS2 Info Grabber running at http://localhost:${PORT}`);
  console.log('Enter Steam ID or profile URL to analyze player\n');
});

// Console interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const promptUser = () => {
  rl.question('Enter Steam ID or profile URL: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }

    try {
      const steamId = extractSteamId(input);
      console.log(`\n⏳ Fetching data for Steam ID: ${steamId}...`);
      
      const info = await fetchPlayerInfo(steamId);
      const analysis = analyzeCheatRisk(info);
      playerData = { ...info, ...analysis };

      displayPlayerInfo(playerData);
      console.log(`\n📊 View full analysis at http://localhost:${PORT}\n`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }

    promptUser();
  });
};

function extractSteamId(input) {
  // Extract from URL like https://steamcommunity.com/profiles/76561198123456789
  const urlMatch = input.match(/\/profiles\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  
  // Direct Steam ID
  if (/^\d+$/.test(input)) return input;
  
  throw new Error('Invalid Steam ID or URL format');
}

function displayPlayerInfo(data) {
  console.log('\n' + '='.repeat(70));
  console.log(`👤 ${data.personaName}`);
  console.log('='.repeat(70));
  console.log(`Steam ID: ${data.steamId}`);
  console.log(`Account Age: ${data.accountAge} days`);
  console.log(`VAC Bans: ${data.vacBans}`);
  console.log(`Game Bans: ${data.gameBans}`);
  console.log(`Community Ban: ${data.communityBan ? 'Yes' : 'No'}`);
  console.log(`\n⚠️  Cheat Risk: ${data.cheatRisk}`);
  console.log(`Risk Score: ${data.riskScore}/100`);
  console.log(`Flags: ${data.flags.join(', ') || 'None'}`);
  
  if (data.accountSecurity) {
    console.log(`\n🔒 Account Security Score: ${data.accountSecurity.score}/100`);
    if (data.accountSecurity.issues.length > 0) {
      console.log(`   Issues: ${data.accountSecurity.issues.join(', ')}`);
    }
  }
  
  if (data.suspicionLevel) {
    console.log(`\n🎯 Suspicion Level: ${data.suspicionLevel.level} (${data.suspicionLevel.score}/100)`);
  }
  
  if (data.demoAnalysis && data.demoAnalysis.totalMatches > 0) {
    console.log(`\n� Recent Demos Analysis:`);
    console.log(`   Total Matches: ${data.demoAnalysis.totalMatches}`);
    console.log(`   Avg K/D: ${data.demoAnalysis.avgKD}`);
    console.log(`   Avg HS%: ${data.demoAnalysis.avgHS}%`);
    console.log(`   Win Rate: ${data.demoAnalysis.winRate}%`);
    console.log(`   Consistency: ${data.demoAnalysis.consistencyScore.toFixed(1)}/100`);
    
    if (data.demoAnalysis.suspiciousMatches.length > 0) {
      console.log(`   ⚠️  Suspicious Matches: ${data.demoAnalysis.suspiciousMatches.length}`);
      data.demoAnalysis.suspiciousMatches.slice(0, 3).forEach(match => {
        console.log(`      - ${match.date} on ${match.map}: ${match.kills}K/${match.deaths}D (${match.kd} K/D, ${match.hs}% HS)`);
      });
    }
    
    if (data.demoAnalysis.trends && data.demoAnalysis.trends.kdTrend) {
      console.log(`   Trend: ${data.demoAnalysis.trends.kdTrend} (${data.demoAnalysis.trends.kdChange})`);
    }
  }
  
  if (data.recommendations && data.recommendations.length > 0) {
    console.log(`\n📋 Recommendations:`);
    data.recommendations.forEach(rec => {
      console.log(`   [${rec.severity}] ${rec.type}: ${rec.message}`);
    });
  }
  
  console.log('='.repeat(70) + '\n');
}

promptUser();

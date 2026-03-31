export function performAdvancedAnalysis(playerData) {
  return {
    accountSecurity: analyzeAccountSecurity(playerData),
    playStyle: analyzePlayStyle(playerData),
    suspicionLevel: calculateSuspicionLevel(playerData),
    recommendations: generateRecommendations(playerData)
  };
}

function analyzeAccountSecurity(playerData) {
  const security = {
    score: 100,
    issues: [],
    details: {}
  };

  // Check account age
  if (playerData.accountAge < 30) {
    security.score -= 30;
    security.issues.push('Very new account');
    security.details.accountAge = 'CRITICAL';
  } else if (playerData.accountAge < 180) {
    security.score -= 15;
    security.issues.push('Relatively new account');
    security.details.accountAge = 'WARNING';
  } else if (playerData.accountAge > 2000) {
    security.details.accountAge = 'GOOD';
  }

  // Check profile visibility
  if (!playerData.isPublic) {
    security.score -= 20;
    security.issues.push('Private profile');
    security.details.profileVisibility = 'HIDDEN';
  } else {
    security.details.profileVisibility = 'PUBLIC';
  }

  // Check VAC bans
  if (playerData.vacBans > 0) {
    security.score -= 50;
    security.issues.push(`${playerData.vacBans} VAC ban(s) on record`);
    security.details.vacBans = 'BANNED';
  } else {
    security.details.vacBans = 'CLEAN';
  }

  // Check game bans
  if (playerData.gameBans > 0) {
    security.score -= 40;
    security.issues.push(`${playerData.gameBans} game ban(s) on record`);
    security.details.gameBans = 'BANNED';
  } else {
    security.details.gameBans = 'CLEAN';
  }

  // Check community ban
  if (playerData.communityBan) {
    security.score -= 25;
    security.issues.push('Community banned');
    security.details.communityBan = 'BANNED';
  } else {
    security.details.communityBan = 'CLEAN';
  }

  // Check economy ban
  if (playerData.economyBan && playerData.economyBan !== 'none') {
    security.score -= 15;
    security.issues.push(`Economy ban: ${playerData.economyBan}`);
    security.details.economyBan = 'BANNED';
  } else {
    security.details.economyBan = 'CLEAN';
  }

  // Check days since last ban
  if (playerData.daysSinceLastBan !== -1) {
    if (playerData.daysSinceLastBan < 30) {
      security.score -= 35;
      security.issues.push(`Recent ban (${playerData.daysSinceLastBan} days ago)`);
      security.details.lastBan = 'RECENT';
    } else if (playerData.daysSinceLastBan < 365) {
      security.score -= 15;
      security.details.lastBan = 'WITHIN_YEAR';
    } else {
      security.details.lastBan = 'OLD';
    }
  }

  security.score = Math.max(0, security.score);
  return security;
}

function analyzePlayStyle(playerData) {
  const style = {
    consistency: 'Unknown',
    activity: 'Unknown',
    riskIndicators: [],
    details: {}
  };

  // Analyze last logoff
  if (playerData.lastLogoff) {
    const daysSinceLogoff = Math.floor((Date.now() - playerData.lastLogoff * 1000) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLogoff < 7) {
      style.activity = 'Very Active';
      style.details.lastSeen = `${daysSinceLogoff} days ago`;
    } else if (daysSinceLogoff < 30) {
      style.activity = 'Active';
      style.details.lastSeen = `${daysSinceLogoff} days ago`;
    } else if (daysSinceLogoff < 90) {
      style.activity = 'Moderate';
      style.details.lastSeen = `${daysSinceLogoff} days ago`;
    } else {
      style.activity = 'Inactive';
      style.details.lastSeen = `${daysSinceLogoff} days ago`;
    }
  }

  // Analyze banned games
  if (playerData.bannedGames && playerData.bannedGames.length > 0) {
    const cs2Related = playerData.bannedGames.filter(g => 
      g.name.toLowerCase().includes('counter') || 
      g.name.toLowerCase().includes('cs2') ||
      g.name.toLowerCase().includes('csgo')
    );
    
    if (cs2Related.length > 0) {
      style.riskIndicators.push('Banned from CS2/CSGO');
      style.details.cs2Bans = cs2Related.length;
    }
  }

  return style;
}

function calculateSuspicionLevel(playerData) {
  let suspicion = 0;
  const factors = [];

  // VAC bans are the strongest indicator
  if (playerData.vacBans > 0) {
    suspicion += 45;
    factors.push({ factor: 'VAC Bans', weight: 45 });
  }

  // Game bans
  if (playerData.gameBans > 0) {
    suspicion += 40;
    factors.push({ factor: 'Game Bans', weight: 40 });
  }

  // Recent bans
  if (playerData.daysSinceLastBan !== -1 && playerData.daysSinceLastBan < 30) {
    suspicion += 30;
    factors.push({ factor: 'Recent Ban', weight: 30 });
  }

  // New account
  if (playerData.accountAge < 30) {
    suspicion += 15;
    factors.push({ factor: 'New Account', weight: 15 });
  }

  // Private profile
  if (!playerData.isPublic) {
    suspicion += 10;
    factors.push({ factor: 'Private Profile', weight: 10 });
  }

  // Community ban
  if (playerData.communityBan) {
    suspicion += 20;
    factors.push({ factor: 'Community Ban', weight: 20 });
  }

  suspicion = Math.min(suspicion, 100);

  let level = 'SAFE';
  if (suspicion >= 80) {
    level = 'CRITICAL';
  } else if (suspicion >= 60) {
    level = 'HIGH';
  } else if (suspicion >= 40) {
    level = 'MEDIUM';
  } else if (suspicion >= 20) {
    level = 'LOW';
  }

  return {
    score: suspicion,
    level,
    factors
  };
}

function generateRecommendations(playerData) {
  const recommendations = [];

  if (playerData.vacBans > 0) {
    recommendations.push({
      type: 'AVOID',
      message: 'Player has VAC bans - avoid playing with them',
      severity: 'CRITICAL'
    });
  }

  if (playerData.gameBans > 0) {
    recommendations.push({
      type: 'CAUTION',
      message: 'Player has game bans - use caution',
      severity: 'HIGH'
    });
  }

  if (playerData.accountAge < 30) {
    recommendations.push({
      type: 'INFO',
      message: 'Very new account - limited history available',
      severity: 'MEDIUM'
    });
  }

  if (!playerData.isPublic) {
    recommendations.push({
      type: 'CAUTION',
      message: 'Private profile - limited information available',
      severity: 'LOW'
    });
  }

  if (playerData.daysSinceLastBan !== -1 && playerData.daysSinceLastBan < 365) {
    recommendations.push({
      type: 'CAUTION',
      message: `Ban within the last year (${playerData.daysSinceLastBan} days ago)`,
      severity: 'MEDIUM'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'SAFE',
      message: 'No major red flags detected',
      severity: 'LOW'
    });
  }

  return recommendations;
}

export function analyzeCheatRisk(playerData) {
  let riskScore = 0;
  const flags = [];

  // VAC Bans (high risk)
  if (playerData.vacBans > 0) {
    riskScore += 40;
    flags.push(`${playerData.vacBans} VAC Ban(s)`);
  }

  // Game Bans (high risk)
  if (playerData.gameBans > 0) {
    riskScore += 35;
    flags.push(`${playerData.gameBans} Game Ban(s)`);
    
    // Add specific banned games
    if (playerData.bannedGames && playerData.bannedGames.length > 0) {
      const gameNames = playerData.bannedGames.map(g => g.name).join(', ');
      flags.push(`Banned in: ${gameNames}`);
    }
  }

  // Community Ban
  if (playerData.communityBan) {
    riskScore += 20;
    flags.push('Community Banned');
  }

  // Economy Ban
  if (playerData.economyBan && playerData.economyBan !== 'none') {
    riskScore += 15;
    flags.push(`Economy Ban: ${playerData.economyBan}`);
  }

  // Recent bans (within 30 days)
  if (playerData.daysSinceLastBan !== -1 && playerData.daysSinceLastBan < 30) {
    riskScore += 25;
    flags.push(`Recent ban (${playerData.daysSinceLastBan} days ago)`);
  }

  // New account (less than 30 days)
  if (playerData.accountAge < 30) {
    riskScore += 10;
    flags.push('Very new account');
  }

  // Low account age (less than 6 months)
  if (playerData.accountAge < 180) {
    riskScore += 5;
    flags.push('Relatively new account');
  }

  // Private profile
  if (!playerData.isPublic) {
    riskScore += 5;
    flags.push('Private profile');
  }

  // Cap score at 100
  riskScore = Math.min(riskScore, 100);

  // Determine risk level
  let cheatRisk = 'LOW';
  if (riskScore >= 70) {
    cheatRisk = 'VERY HIGH';
  } else if (riskScore >= 50) {
    cheatRisk = 'HIGH';
  } else if (riskScore >= 30) {
    cheatRisk = 'MEDIUM';
  } else if (riskScore >= 10) {
    cheatRisk = 'LOW-MEDIUM';
  }

  return {
    riskScore,
    cheatRisk,
    flags
  };
}

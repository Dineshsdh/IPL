const express = require('express');
const fs = require('fs');
const path = require('path');
const Player = require('../models/Player');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Base path to the season HTML files
const PUBLIC_DIR = path.resolve(__dirname, '../../client/public');

/**
 * Parse a team HTML file and extract player data.
 * The HTML structure is consistent:
 *   <div class="player-card">
 *     <div class="player-img-wrap">
 *       <img src="https://documents.iplt20.com/ipl/IPLHeadshot2026/102.png" alt="Ruturaj Gaikwad" />
 *     </div>
 *     <div class="player-info">
 *       <div class="player-name">Ruturaj Gaikwad</div>
 *       <div class="player-role">🏏 Batter (C)</div>
 *       <div class="player-country">🇮🇳</div>
 *     </div>
 *   </div>
 */
function parsePlayersFromHTML(html, season, teamShort) {
  const players = [];

  // Extract all player-card blocks
  const cardRegex = /<div class="player-card">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const block = match[0];

    // Extract image URL
    const imgMatch = block.match(/src="(https:\/\/documents\.iplt20\.com[^"]+)"/);
    const image = imgMatch ? imgMatch[1] : '';

    // Extract player name
    const nameMatch = block.match(/<div class="player-name">([^<]+)<\/div>/);
    const name = nameMatch ? nameMatch[1].trim() : '';

    // Extract role
    const roleMatch = block.match(/<div class="player-role">([^<]+)<\/div>/);
    let roleText = roleMatch ? roleMatch[1].trim() : '';

    // Extract country emoji
    const countryMatch = block.match(/<div class="player-country">([^<]+)<\/div>/);
    const country = countryMatch ? countryMatch[1].trim() : '';

    if (!name) continue;

    // Normalize role - remove emojis and extra text
    const normalizedRole = normalizeRole(roleText);

    // Detect category
    const category = detectCategory(roleText, name);

    // Assign base price in ₹ Cr based on role and category
    const basePrice = getBasePrice(normalizedRole, roleText, category);

    // Detect if player is overseas (non-Indian flag)
    const isOverseas = !country.includes('🇮🇳');

    players.push({
      name,
      role: normalizedRole,
      category,
      basePrice,
      image,
      country,
      season,
      originalTeam: teamShort,
      status: 'unsold'
    });
  }

  return players;
}

function normalizeRole(roleText) {
  const lower = roleText.toLowerCase();
  if (lower.includes('wk') || lower.includes('wicket') || lower.includes('keeper')) {
    return 'Wicketkeeper';
  }
  if (lower.includes('all-rounder') || lower.includes('all rounder') || lower.includes('⭐')) {
    return 'All-rounder';
  }
  if (lower.includes('bowler') || lower.includes('🎯')) {
    return 'Bowler';
  }
  // Batter is default
  return 'Batsman';
}

function detectCategory(roleText, name) {
  const isCaptain = roleText.includes('(C)') || roleText.includes('(VC)');
  // Well-known marquee players (captains, or key players)
  if (isCaptain) return 'marquee';
  return 'capped';
}

function getBasePrice(role, roleText, category) {
  const isCaptain = roleText.includes('(C)');

  // Base prices in ₹ Cr
  if (category === 'marquee') {
    return 2; // ₹2 Cr for marquee
  }

  const base = {
    'Batsman': 1,
    'Bowler': 0.75,
    'All-rounder': 1.5,
    'Wicketkeeper': 1
  };

  let price = base[role] || 1;
  if (isCaptain) price = 2;
  return price;
}

// GET /api/import/seasons — List available seasons
router.get('/seasons', authenticate, requireAdmin, (req, res) => {
  try {
    const entries = fs.readdirSync(PUBLIC_DIR, { withFileTypes: true });
    const seasons = entries
      .filter(e => e.isDirectory() && e.name.startsWith('Season_'))
      .map(e => {
        const year = e.name.replace('Season_', '');
        const seasonDir = path.join(PUBLIC_DIR, e.name);
        const files = fs.readdirSync(seasonDir);
        const teamFiles = files.filter(f => f.endsWith('.html') && f !== 'index.html');
        const teams = teamFiles.map(f => f.replace('.html', ''));
        return { year, folder: e.name, teams, totalTeams: teams.length };
      })
      .sort((a, b) => parseInt(b.year) - parseInt(a.year));

    res.json(seasons);
  } catch (err) {
    res.status(500).json({ message: 'Failed to read seasons', error: err.message });
  }
});

// GET /api/import/preview/:season — Preview players from a season (or specific team)
router.get('/preview/:season', authenticate, requireAdmin, (req, res) => {
  try {
    const { season } = req.params;
    const { team } = req.query; // optional: ?team=CSK
    const seasonDir = path.join(PUBLIC_DIR, `Season_${season}`);

    if (!fs.existsSync(seasonDir)) {
      return res.status(404).json({ message: `Season ${season} not found` });
    }

    const files = fs.readdirSync(seasonDir);
    const teamFiles = files.filter(f => f.endsWith('.html') && f !== 'index.html');

    let allPlayers = [];

    for (const file of teamFiles) {
      const teamShort = file.replace('.html', '');
      if (team && teamShort !== team) continue;

      const html = fs.readFileSync(path.join(seasonDir, file), 'utf-8');
      const players = parsePlayersFromHTML(html, season, teamShort);
      allPlayers = allPlayers.concat(players);
    }

    // Group by team for preview
    const grouped = {};
    for (const p of allPlayers) {
      if (!grouped[p.originalTeam]) {
        grouped[p.originalTeam] = [];
      }
      grouped[p.originalTeam].push(p);
    }

    res.json({
      season,
      totalPlayers: allPlayers.length,
      teams: Object.keys(grouped).length,
      byTeam: grouped,
      players: allPlayers
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to parse season data', error: err.message });
  }
});

// POST /api/import/season — Import players from a season into the database
router.post('/season', authenticate, requireAdmin, async (req, res) => {
  try {
    const { season, team, basePrice: customBasePrice, players: customPlayers } = req.body;

    let playersToImport = [];

    if (customPlayers && customPlayers.length > 0) {
      // Import specific players with custom base prices
      playersToImport = customPlayers.map(p => ({
        name: p.name,
        role: p.role || 'Batsman',
        category: p.category || 'capped',
        basePrice: p.basePrice || 1,
        image: p.image || '',
        country: p.country || '',
        season: p.season || season || '',
        originalTeam: p.originalTeam || '',
        status: 'unsold'
      }));
    } else {
      // Parse from HTML files
      const seasonDir = path.join(PUBLIC_DIR, `Season_${season}`);
      if (!fs.existsSync(seasonDir)) {
        return res.status(404).json({ message: `Season ${season} not found` });
      }

      const files = fs.readdirSync(seasonDir);
      const teamFiles = files.filter(f => f.endsWith('.html') && f !== 'index.html');

      for (const file of teamFiles) {
        const teamShort = file.replace('.html', '');
        if (team && teamShort !== team) continue;

        const html = fs.readFileSync(path.join(seasonDir, file), 'utf-8');
        const parsed = parsePlayersFromHTML(html, season, teamShort);

        // Apply custom base price if provided
        if (customBasePrice) {
          parsed.forEach(p => p.basePrice = customBasePrice);
        }

        playersToImport = playersToImport.concat(parsed);
      }
    }

    if (playersToImport.length === 0) {
      return res.status(400).json({ message: 'No players found to import' });
    }

    // Remove duplicates by name within the same import
    const uniqueNames = new Set();
    playersToImport = playersToImport.filter(p => {
      if (uniqueNames.has(p.name)) return false;
      uniqueNames.add(p.name);
      return true;
    });

    const created = await Player.insertMany(playersToImport);
    res.status(201).json({
      message: `Imported ${created.length} players from Season ${season}`,
      count: created.length,
      players: created
    });
  } catch (err) {
    res.status(500).json({ message: 'Import failed', error: err.message });
  }
});

// DELETE /api/import/season/:season — Remove all players from a season
router.delete('/season/:season', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await Player.deleteMany({ season: req.params.season });
    res.json({ message: `Deleted ${result.deletedCount} players from Season ${req.params.season}` });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
});

module.exports = router;

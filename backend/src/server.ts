import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRoutes from './routes/authRoutes';
import playerRoutes from './routes/playerRoutes';
import gameRoutes from './routes/gameRoutes';
import syncRoutes from './routes/syncRoutes';
// import steplingRoutes from './routes/steplingRoutes'; // Temporarily disabled due to auth issues
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { database } from './config/database';
import { steplingService } from './services/steplingService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MOBILE_PLAYER_ID = '021cb11f-482a-44d2-b289-110400f23562';

// Security middleware - disabled for development
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", "'unsafe-inline'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       imgSrc: ["'self'", "data:", "https:"],
//     },
//   },
// }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://step-scientists.vercel.app',
        'https://step-scientists-*.vercel.app', // Preview deployments
        process.env.CORS_ORIGIN
      ].filter(origin => origin && origin.length > 0)
    : [
        'http://localhost:3000', 
        'http://10.0.2.2:3000', // Android emulator
        /^http:\/\/192\.168\.\d+\.\d+:8080$/, // Local network devices on port 8080
        /^http:\/\/192\.168\.\d+\.\d+:3000$/, // Local network devices on port 3000
        /^http:\/\/10\.\d+\.\d+\.\d+:3000$/, // Alternative local networks
        'null' // For file:// protocol
      ],
  credentials: true,
}));

// Rate limiting - Very generous for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000'), // Very generous for development
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
});

// More generous rate limit for training endpoints
const trainingLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000'), // Extremely generous for training
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many training requests, please wait a moment.',
    },
  },
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Debug endpoint to inspect database state
app.get('/debug/database', async (req, res) => {
  try {
    const playerId = MOBILE_PLAYER_ID;
    
    // Check player exists
    const player = await database('players').where('id', playerId).first();
    
    // Count steplings
    const steplingsCount = await database('steplings').where('player_id', playerId).count('* as count').first();
    
    // Get sample steplings with species data
    const sampleSteplings = await database('steplings')
      .leftJoin('species', 'steplings.species_id', 'species.id')
      .where('steplings.player_id', playerId)
      .select(
        'steplings.id',
        'steplings.level',
        'steplings.fusion_level',
        'steplings.species_id',
        'species.name as species_name',
        'species.rarity_tier as species_rarity'
      )
      .limit(5);
    
    // Count species
    const speciesCount = await database('species').count('* as count').first();
    
    // Get all species
    const allSpecies = await database('species').select('id', 'name', 'rarity_tier').limit(10);
    
    res.json({
      timestamp: new Date().toISOString(),
      database_status: 'connected',
      player: {
        exists: !!player,
        id: player?.id,
        username: player?.username
      },
      steplings: {
        total_count: parseInt(steplingsCount.count),
        sample: sampleSteplings
      },
      species: {
        total_count: parseInt(speciesCount.count),
        all: allSpecies
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database inspection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API base endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Step Monsters API',
    version: '1.0.0',
    endpoints: [
      '/api/species/all',
      '/api/species/discover',
      '/api/steplings',
      '/api/steplings/:id/levelup',
      '/api/steplings/:id/release',
      '/api/steplings/fuse',
      '/api/game/sync'
    ]
  });
});

// Mobile app routes
app.get('/mobile-test', (req, res) => {
  res.sendFile(path.join(__dirname, '../../mobile-test.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../../step-scientists-mobile.html'));
});

app.get('/simple', (req, res) => {
  res.sendFile(path.join(__dirname, '../../step-scientists-simple.html'));
});

app.get('/basic', (req, res) => {
  res.sendFile(path.join(__dirname, '../../basic.html'));
});

app.get('/mobile-friendly', (req, res) => {
  res.sendFile(path.join(__dirname, '../../mobile-friendly.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../../step-scientists-test.html'));
});

app.get('/minimal', (req, res) => {
  res.sendFile(path.join(__dirname, '../../step-scientists-minimal.html'));
});

app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, '../../debug-connection.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../../step-scientists-connected.html'));
});

app.post('/api/species/discover', async (req, res) => {
  try {
    const { playerId, magnifyingGlass } = req.body;
    
    // Implement the CORRECT tier advancement algorithm from Task 4
    let currentTier = 'common';
    const rollHistory = [];
    let advancementRolls = 0;
    const maxRolls = 10;
    
    // Tier advancement: Start at Common, roll with magnifying glass bonuses
    while (advancementRolls < maxRolls) {
      const roll = Math.floor(Math.random() * 100) + 1; // 1-100
      rollHistory.push(roll);
      
      // Calculate advancement chance based on magnifying glass
      let advancementThreshold = 100; // Base 1% chance (roll 100)
      
      if (magnifyingGlass && canUseMagnifyingGlass(currentTier, magnifyingGlass.tier)) {
        // Get the advancement chance based on glass tier and current tier
        advancementThreshold = getAdvancementThreshold(currentTier, magnifyingGlass.tier);
      }
      
      const shouldAdvance = roll >= advancementThreshold;
      
      if (!shouldAdvance) {
        break; // Stay at current tier
      }
      
      // Advance to next tier
      const nextTier = getNextTier(currentTier);
      if (nextTier) {
        currentTier = nextTier;
        advancementRolls++;
      } else {
        break; // Already at legendary
      }
    }
    
    // Select species from final tier
    const species = await getSpeciesFromTier(currentTier);
    
    // Check if this is a new discovery for this player
    const isNewDiscovery = true; // Always create steplings for now - TODO: check if player already has this species
    
    // If it's a new discovery, create a stepling for the player
    let newStepling = null;
    console.log(`🔍 Discovery result: ${species.name}, isNewDiscovery: ${isNewDiscovery}`);
    console.log(`🔍 Species object:`, JSON.stringify(species, null, 2));
    
    if (isNewDiscovery) {
      try {
        console.log(`🔨 Attempting to create stepling for species ${species.id} (${species.name})`);
        const actualPlayerId = (playerId && playerId !== 'mobile_player') ? playerId : MOBILE_PLAYER_ID;
        console.log(`🔨 Using player ID: ${actualPlayerId}`);
        newStepling = await steplingService.createStepling(actualPlayerId, species.id);
        console.log(`🎉 Created new stepling: ${species.name} for player ${actualPlayerId}`);
      } catch (error) {
        console.error('❌ Failed to create stepling:', error);
        // Don't fail the discovery if stepling creation fails
      }
    }
    
    const result = {
      success: true,
      species: species,
      isNewDiscovery: isNewDiscovery,
      rarityTier: currentTier,
      advancementRolls: rollHistory.length,
      rollHistory: rollHistory,
      stepling: newStepling // Include the created stepling if any
    };
    
    console.log(`🔬 Discovery: ${rollHistory.length} rolls, final tier: ${currentTier}, species: ${species.name}${isNewDiscovery ? ' (NEW!)' : ''}`);
    res.json(result);
  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({ error: 'Discovery failed' });
  }
});

function canUseMagnifyingGlass(currentTier: string, glassTier: string): boolean {
  const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const currentIndex = tiers.indexOf(currentTier);
  const glassIndex = tiers.indexOf(glassTier);
  return currentIndex <= glassIndex;
}

function getAdvancementThreshold(currentTier: string, glassTier: string): number {
  const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const currentIndex = tiers.indexOf(currentTier);
  const glassIndex = tiers.indexOf(glassTier);
  
  // Base advancement chances (what you get with that tier's glass)
  const baseChances: { [key: string]: number } = {
    'common': 1,      // 1% base (no glass needed for common)
    'uncommon': 10,   // 10% with uncommon glass
    'rare': 5,        // 5% with rare glass  
    'epic': 5,        // 5% with epic glass
    'legendary': 5    // 5% with legendary glass
  };
  
  // If we can't use the glass for this tier, use base 1%
  if (!canUseMagnifyingGlass(currentTier, glassTier)) {
    return 100; // 1% chance (roll 100)
  }
  
  // Calculate the chance based on glass tier
  let chance = 1; // Start with base 1%
  
  // For each tier below the glass tier, double the chance
  const tierDifference = glassIndex - currentIndex;
  for (let i = 0; i < tierDifference; i++) {
    chance *= 2;
  }
  
  // At the glass tier itself, use the base chance for that tier
  if (currentIndex === glassIndex) {
    chance = baseChances[currentTier] || 5;
  }
  
  // Convert percentage to threshold (higher percentage = lower threshold)
  // 1% = 100, 5% = 96, 10% = 91, 20% = 81, etc.
  return Math.max(1, 101 - chance);
}

function getNextTier(currentTier: string): string | null {
  const tierMap: { [key: string]: string | null } = {
    'common': 'uncommon',
    'uncommon': 'rare', 
    'rare': 'epic',
    'epic': 'legendary',
    'legendary': null
  };
  return tierMap[currentTier] || null;
}

async function getSpeciesFromTier(tier: string): Promise<any> {
  try {
    // Query actual species from database by rarity tier
    const species = await database('species')
      .where('rarity_tier', tier)
      .select('*');
    
    if (species.length === 0) {
      // Fallback to common if no species found for tier
      const commonSpecies = await database('species')
        .where('rarity_tier', 'common')
        .select('*');
      return commonSpecies[Math.floor(Math.random() * commonSpecies.length)];
    }
    
    // Return random species from the tier
    const selectedSpecies = species[Math.floor(Math.random() * species.length)];
    
    // Add emoji for display
    const emojiMap: { [key: string]: string } = {
      'Grasshopper': '🦗',
      'Pebble Turtle': '🐢',
      'Flame Salamander': '🦎',
      'Crystal Beetle': '🪲',
      'Storm Eagle': '🦅'
    };
    
    return {
      id: selectedSpecies.id,
      name: selectedSpecies.name,
      emoji: emojiMap[selectedSpecies.name] || '🐾',
      rarity: selectedSpecies.rarity_tier
    };
  } catch (error) {
    console.error('Error getting species from tier:', error);
    // Fallback to hardcoded data if database fails
    return { id: 'd4a09c90-17ea-4778-85db-3b83c54654ef', name: 'Grasshopper', emoji: '🦗', rarity: 'common' };
  }
}

app.get('/api/species', async (req, res) => {
  // Redirect to /api/species/all for compatibility
  res.redirect('/api/species/all');
});

app.get('/api/species/all', async (req, res) => {
  try {
    // Return actual species from database
    const species = await database('species').select('*');
    
    // Map to the expected format
    const formattedSpecies = species.map(s => ({
      id: s.id,
      name: s.name,
      emoji: getEmojiForSpecies(s.name),
      rarity: s.rarity_tier,
      discovered: false // Would check against player's discoveries
    }));
    
    res.json(formattedSpecies);
  } catch (error) {
    console.error('Error getting species:', error);
    res.status(500).json({ error: 'Failed to get species' });
  }
});

function getEmojiForSpecies(name: string): string {
  const emojiMap: { [key: string]: string } = {
    'Grasshopper': '🦗',
    'Pebble Turtle': '🐢',
    'Flame Salamander': '🦎',
    'Crystal Beetle': '🪲',
    'Storm Eagle': '🦅'
  };
  return emojiMap[name] || '🐾';
}

app.post('/api/game/sync', async (req, res) => {
  try {
    // This would sync with the game service
    const { playerId, steps, cells, experience, mode, discoveredSpecies } = req.body;
    console.log(`Game sync for player ${playerId}: ${steps} steps, ${cells} cells, ${experience} exp`);
    res.json({ success: true, synced: true });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.get('/api/steplings', trainingLimiter, async (req, res) => {
  try {
    const { playerId = MOBILE_PLAYER_ID } = req.query;
    
    console.log(`🔍 [STEPLINGS API] Request for player: ${playerId}`);
    console.log(`🔍 [STEPLINGS API] Default mobile player ID: ${MOBILE_PLAYER_ID}`);
    
    // Use the actual stepling service
    const steplings = await steplingService.getPlayerSteplings(playerId as string);
    
    console.log(`📋 [STEPLINGS API] Service returned ${steplings.length} steplings for player ${playerId}`);
    
    if (steplings.length > 0) {
      console.log(`📋 [STEPLINGS API] First stepling sample:`, {
        id: steplings[0].id,
        species_id: steplings[0].species_id,
        level: steplings[0].level,
        species: steplings[0].species
      });
    } else {
      console.log(`⚠️ [STEPLINGS API] No steplings found - checking database directly...`);
      
      // Direct database check
      const directCount = await database('steplings').where('player_id', playerId).count('* as count').first();
      console.log(`🔍 [STEPLINGS API] Direct DB count: ${directCount.count} steplings`);
      
      const directSteplings = await database('steplings').where('player_id', playerId).select('*').limit(3);
      console.log(`🔍 [STEPLINGS API] Direct DB sample:`, directSteplings.map(s => ({ id: s.id, species_id: s.species_id, level: s.level })));
    }
    
    res.json({ success: true, data: steplings });
  } catch (error) {
    console.error('❌ [STEPLINGS API] Error getting steplings:', error);
    
    // Fallback to mock data if service fails
    const mockSteplings = [
      {
        id: 'step_1',
        speciesId: 'common_001',
        level: 3,
        fusionLevel: 1,
        currentStats: { health: 30, attack: 18, defense: 12, special: 8 },
        species: { name: 'Stepfoot', emoji: '🐛', rarity: 'common' }
      },
      {
        id: 'step_2', 
        speciesId: 'uncommon_001',
        level: 1,
        fusionLevel: 1,
        currentStats: { health: 45, attack: 35, defense: 25, special: 15 },
        species: { name: 'Stridehorn', emoji: '🦄', rarity: 'uncommon' }
      }
    ];
    
    res.json({ success: true, data: mockSteplings });
  }
});

app.put('/api/steplings/:steplingId/levelup', trainingLimiter, async (req, res) => {
  try {
    const { steplingId } = req.params;
    const { experiencePoints } = req.body;
    const playerId = MOBILE_PLAYER_ID; // Use the mobile player ID
    
    console.log(`🎯 Level up request: stepling ${steplingId}, ${experiencePoints} exp`);
    
    if (!experiencePoints || experiencePoints <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid experience points required' 
      });
    }

    const result = await steplingService.levelUpStepling(steplingId, playerId, experiencePoints);
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }

    console.log(`✨ Level up successful: stepling now level ${result.stepling?.level}`);
    res.json({ success: true, data: result.stepling });
  } catch (error) {
    console.error('Error leveling up stepling:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to level up stepling' 
    });
  }
});

app.get('/api/steplings/:steplingId/fusion-candidates', async (req, res) => {
  try {
    const { steplingId } = req.params;
    const playerId = MOBILE_PLAYER_ID; // Use the mobile player ID
    
    console.log(`🔍 Getting fusion candidates for stepling ${steplingId}`);
    
    const candidates = await steplingService.getFusionCandidates(steplingId, playerId);
    console.log(`Found ${candidates.length} fusion candidates`);
    
    res.json({ success: true, data: candidates });
  } catch (error) {
    console.error('Error getting fusion candidates:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get fusion candidates' 
    });
  }
});

app.post('/api/steplings/fuse', async (req, res) => {
  try {
    const { newStepling, removedSteplingIds } = req.body;
    const playerId = MOBILE_PLAYER_ID; // Use the mobile player ID
    
    console.log(`🔗 Fusion request: combining steplings ${removedSteplingIds.join(', ')}`);
    
    if (!newStepling || !removedSteplingIds || removedSteplingIds.length !== 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid fusion data - need newStepling and exactly 2 removedSteplingIds' 
      });
    }

    const result = await steplingService.processFusion(playerId, newStepling, removedSteplingIds);
    console.log(`✨ Fusion successful: created new stepling at fusion level ${result.fusion_level}`);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing fusion:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Fusion failed' 
    });
  }
});

app.delete('/api/steplings/:steplingId/release', async (req, res) => {
  try {
    const { steplingId } = req.params;
    const { experienceValue } = req.body;
    const playerId = MOBILE_PLAYER_ID; // Use the mobile player ID
    
    console.log(`🕊️ Release request: stepling ${steplingId} for ${experienceValue} exp`);
    
    if (!experienceValue || experienceValue <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid experience value required' 
      });
    }

    // Get the stepling first to verify it exists and belongs to the player
    const stepling = await steplingService.getStepling(steplingId, playerId);
    if (!stepling) {
      return res.status(404).json({ 
        success: false, 
        error: 'Stepling not found' 
      });
    }

    // Remove the stepling from database
    await steplingService.deleteStepling(steplingId, playerId);
    
    console.log(`✨ Release successful: stepling ${steplingId} released for ${experienceValue} exp`);
    res.json({ 
      success: true, 
      experienceGained: experienceValue,
      message: `Released stepling for ${experienceValue} experience points`
    });
  } catch (error) {
    console.error('Error releasing stepling:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Release failed' 
    });
  }
});

// Default route redirects to game
app.get('/', (req, res) => {
  res.redirect('/game');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/sync', syncRoutes);
// app.use('/api/steplings', steplingRoutes); // Temporarily disabled due to auth issues

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    await database.raw('SELECT 1');
    console.log('✅ Database connection established');

    // Run migrations
    console.log('🔄 Running database migrations...');
    await database.migrate.latest();
    console.log('✅ Database migrations completed');

    // Run seeds
    console.log('🌱 Running database seeds...');
    await database.seed.run();
    console.log('✅ Database seeds completed');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await database.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await database.destroy();
  process.exit(0);
});

startServer();
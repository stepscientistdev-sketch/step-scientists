// Detect environment and set appropriate API base
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://192.168.1.111:3000'  // Local development
    : 'https://step-scientists-backend.onrender.com'; // Production Render URL

var game = {
    steps: 5000, // Keep for backward compatibility - will become total lifetime steps
    dailySteps: 0, // NEW: Today's steps only (resets daily)
    lastStepDate: null, // NEW: Track when steps were last updated
    mode: 'discovery',
    cells: 5,
    experience: 0,
    experienceBank: 0, // Banked experience for future use
    magnifyingGlass: { uncommon: 0, rare: 0, epic: 0, legendary: 0 }, // Track different tiers
    discoveredSpecies: [],
    milestonesReached: [], // Track which milestones we've already awarded - now stores objects with {milestone, tier, cycle}
    trainingRoster: [], // Array of stepling IDs in training roster (ordered 1-10)
    rosterOrder: {}, // Maps steplingId to order number (1-10)
    fusionSlot1: null, // Selected stepling for fusion slot 1
    fusionSlot2: null, // Selected stepling for fusion slot 2
    activeFusionSlot: 1, // Which slot is currently being selected (1 or 2)
    selectedGlassTier: null // Which magnifying glass tier to use (null = auto-select best)
};

var allSpecies = [];
var playerSteplings = [];
var isConnected = false;
var useMagnifyingGlass = false;

// Daily step management functions
function getTodayDateString() {
    const today = new Date();
    return today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');
}

function checkDailyReset() {
    const today = getTodayDateString();
    
    if (game.lastStepDate !== today) {
        // New day detected - reset daily steps
        if (game.lastStepDate) {
            log('🌅 New day detected! Daily steps reset to 0');
        }
        game.dailySteps = 0;
        game.lastStepDate = today;
        saveGame();
    }
}

function updateDailySteps(totalStepsFromGoogleFit) {
    checkDailyReset();
    
    // For Google Fit, the API already gives us today's steps
    // So we can directly use that value
    const oldDailySteps = game.dailySteps;
    game.dailySteps = totalStepsFromGoogleFit;
    
    // Also update the total lifetime steps for backward compatibility
    if (totalStepsFromGoogleFit > game.steps) {
        game.steps = totalStepsFromGoogleFit;
    }
    
    return game.dailySteps - oldDailySteps; // Return the difference for processing
}

function addManualSteps(stepsToAdd) {
    checkDailyReset();
    
    game.dailySteps += stepsToAdd;
    game.steps += stepsToAdd; // Also update total for backward compatibility
    
    log('➕ Added ' + stepsToAdd + ' steps manually');
    return stepsToAdd;
}

function getDailySteps() {
    checkDailyReset();
    return game.dailySteps;
}

// Initialize
async function init() {
    try {
        log('Initializing Step Scientists...');
        
        log('Step 1: Testing connection...');
        await testConnection();
        
        log('Step 2: Loading game data...');
        loadGame();
        
        log('Step 3: Checking daily reset...');
        checkDailyReset();
        
        log('Step 4: Updating display...');
        updateDisplay();
        
        log('Step 5: Loading species...');
        await loadSpecies();
        
        log('Step 6: Loading steplings...');
        await loadSteplings();
        
        log('Initialization complete!');
    } catch (error) {
        log('Initialization error: ' + error.message);
        console.error('Init error:', error);
    }
}

// Test connection
async function testConnection() {
    var statusEl = document.getElementById('connection-status');
    statusEl.textContent = 'Connecting...';
    statusEl.className = 'connection-status connecting';
    
    try {
        var response = await fetch(API_BASE + '/health');
        var data = await response.json();
        
        if (response.ok) {
            statusEl.textContent = '✅ Connected';
            statusEl.className = 'connection-status connected';
            isConnected = true;
            log('Connected to backend!');
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        statusEl.textContent = '❌ Offline';
        statusEl.className = 'connection-status disconnected';
        isConnected = false;
        log('Offline mode');
    }
}

// Add steps
async function addSteps() {
    const stepsAdded = addManualSteps(100);
    const dailySteps = getDailySteps();
    
    if (game.mode === 'discovery') {
        const oldCells = Math.floor((dailySteps - stepsAdded) / 1000);
        const newCells = Math.floor(dailySteps / 1000);
        const cellsToAdd = newCells - oldCells;
        
        if (cellsToAdd > 0) {
            game.cells += cellsToAdd;
            log('Earned ' + cellsToAdd + ' cells!');
        } else {
            const needed = 1000 - (dailySteps % 1000);
            log(needed + ' more steps for next cell');
        }
    } else {
        const oldExp = Math.floor((dailySteps - stepsAdded) / 10);
        const newExp = Math.floor(dailySteps / 10);
        const expToAdd = newExp - oldExp;
        
        if (expToAdd > 0) {
            game.experience += expToAdd;
            log('Earned ' + expToAdd + ' experience!');
            
            // Distribute experience to training roster
            await distributeExperienceToRoster(expToAdd);
        }
    }
    
    checkMilestones();
    updateDisplay();
    saveGame();
}

// Switch mode
function switchMode() {
    console.log('switchMode called, current mode:', game.mode);
    game.mode = game.mode === 'discovery' ? 'training' : 'discovery';
    console.log('new mode:', game.mode);
    updateDisplay();
    log('Switched to ' + game.mode + ' mode');
    saveGame();
}

// Toggle magnifying glass
function toggleMagnifyingGlass() {
    var totalGlasses = getTotalGlasses();
    console.log('toggleMagnifyingGlass called, total glasses:', totalGlasses);
    if (totalGlasses < 1) {
        log('No magnifying glasses available!');
        return;
    }
    
    useMagnifyingGlass = !useMagnifyingGlass;
    var glassBtn = document.getElementById('glass-btn');
    console.log('useMagnifyingGlass is now:', useMagnifyingGlass);
    
    if (useMagnifyingGlass) {
        var selectedTier = game.selectedGlassTier || getBestGlassTier();
        if (selectedTier && game.magnifyingGlass[selectedTier] > 0) {
            glassBtn.innerHTML = '🔍 Glass ON (' + selectedTier.toUpperCase() + ')';
            glassBtn.className = 'btn btn-warning';
            log('Magnifying glass ready! Will use ' + selectedTier + ' glass on next discovery.');
        } else {
            // Selected tier not available, fall back to best available
            var bestTier = getBestGlassTier();
            if (bestTier) {
                game.selectedGlassTier = bestTier;
                glassBtn.innerHTML = '🔍 Glass ON (' + bestTier.toUpperCase() + ')';
                glassBtn.className = 'btn btn-warning';
                log('Selected tier unavailable, using ' + bestTier + ' glass instead.');
            } else {
                useMagnifyingGlass = false;
                log('No magnifying glasses available!');
            }
        }
    } else {
        glassBtn.innerHTML = 'Use 🔍 Glass (' + totalGlasses + ')';
        glassBtn.className = 'btn';
        log('Magnifying glass deactivated.');
    }
    updateDisplay();
}
// Inspect cell
async function inspectCell() {
    if (game.cells < 1) {
        log('Need at least 1 cell!');
        return;
    }
    
    if (!isConnected) {
        log('Need backend connection!');
        return;
    }
    
    game.cells--;
    
    var magnifyingGlassData = null;
    if (useMagnifyingGlass && getTotalGlasses() > 0) {
        var selectedTier = game.selectedGlassTier || getBestGlassTier();
        
        if (selectedTier && game.magnifyingGlass[selectedTier] > 0) {
            magnifyingGlassData = { tier: selectedTier };
            
            // Consume the glass
            game.magnifyingGlass[selectedTier]--;
            useMagnifyingGlass = false;
            var glassBtn = document.getElementById('glass-btn');
            glassBtn.innerHTML = 'Use 🔍 Glass';
            glassBtn.className = 'btn';
            log('Used ' + selectedTier + ' magnifying glass!');
        } else {
            log('Selected magnifying glass not available!');
            useMagnifyingGlass = false;
        }
    }
    
    updateDisplay();
    
    try {
        var response = await fetch(API_BASE + '/api/species/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: '021cb11f-482a-44d2-b289-110400f23562', // Use correct UUID
                magnifyingGlass: magnifyingGlassData
            })
        });
        
        if (response.ok) {
            var result = await response.json();
            console.log('🔍 Discovery API result:', result);
            
            if (result.success) {
                var species = result.species;
                
                if (result.isNewDiscovery) {
                    game.discoveredSpecies.push(species.id);
                    log('🎉 NEW! ' + species.rarity.toUpperCase() + ' ' + species.name + ' ' + species.emoji);
                    
                    // Check if a stepling was created
                    if (result.stepling) {
                        log('✅ Stepling created: ' + result.stepling.id);
                    } else {
                        log('⚠️ No stepling returned from API');
                    }
                    
                    // Reload steplings to show the newly created stepling
                    log('🔄 Reloading steplings...');
                    await loadSteplings();
                } else {
                    log('Found ' + species.name + ' ' + species.emoji + ' (known)');
                }
                
                updateSpeciesGrid();
                saveGame();
            } else {
                log('Discovery failed: ' + result.error);
            }
        } else {
            throw new Error('Request failed');
        }
    } catch (error) {
        log('Discovery error: ' + error.message);
        game.cells++; // Refund
        if (magnifyingGlassData) {
            // Refund the glass that was used
            game.magnifyingGlass[magnifyingGlassData.tier]++;
        }
        updateDisplay();
    }
}

// Sync steps with Google Fit
async function syncSteps() {
    try {
        if (!googleFitService || !googleFitService.accessToken) {
            log('❌ Google Fit not connected - please connect first');
            return;
        }
        
        log('🔄 Syncing with Google Fit...');
        await loadGoogleFitData();
        
    } catch (error) {
        console.error('Sync error:', error);
        log('❌ Sync failed: ' + error.message);
    }
}

// Distribute experience to training roster with smart leveling and banking
async function distributeExperienceToRoster(totalExp) {
    console.log('=== DISTRIBUTE EXPERIENCE DEBUG ===');
    console.log('totalExp:', totalExp);
    console.log('isConnected:', isConnected);
    console.log('game.trainingRoster:', game.trainingRoster);
    console.log('game.experienceBank:', game.experienceBank);
    
    if (!isConnected || game.trainingRoster.length === 0) {
        // Bank the experience if no roster is set
        game.experienceBank += totalExp;
        log('No training roster set. Banked ' + totalExp + ' experience.');
        updateDisplay();
        return;
    }
    
    // Add any banked experience to the total
    var availableExp = totalExp + game.experienceBank;
    var originalBanked = game.experienceBank;
    game.experienceBank = 0; // Clear the bank
    
    console.log('availableExp:', availableExp);
    console.log('originalBanked:', originalBanked);
    
    if (originalBanked > 0) {
        log('Using ' + originalBanked + ' banked + ' + totalExp + ' new = ' + availableExp + ' total experience');
    } else {
        log('Distributing ' + availableExp + ' experience to roster...');
    }
    
    // Only load steplings if we don't have current data
    if (playerSteplings.length === 0) {
        console.log('Loading steplings first...');
        await loadSteplings();
    }
    console.log('playerSteplings after load:', playerSteplings.length);
    
    // Get steplings in roster order (1-10), filtering out max level ones
    var orderedSteplings = [];
    for (var i = 0; i < game.trainingRoster.length; i++) {
        var steplingId = game.trainingRoster[i];
        var stepling = playerSteplings.find(s => s.id === steplingId);
        console.log('Looking for stepling:', steplingId, 'found:', stepling ? stepling.species.name : 'null');
                   
        if (stepling) {
            var maxLevel = stepling.fusion_level * 10;
            console.log('Stepling:', stepling.species.name, 'Level:', stepling.level, 'MaxLevel:', maxLevel);
            
            if (stepling.level < maxLevel) {
                orderedSteplings.push({
                    stepling: stepling,
                    order: game.rosterOrder[steplingId] || (i + 1)
                });
                console.log('Added to ordered list at position:', game.rosterOrder[steplingId] || (i + 1));
            } else {
                console.log('Stepling is max level, skipping');
            }
        }
    }
    
    console.log('orderedSteplings:', orderedSteplings.length);
    
    // Sort by roster order (1-10)
    orderedSteplings.sort((a, b) => a.order - b.order);
    
    if (orderedSteplings.length === 0) {
        // All steplings are max level, bank the experience
        game.experienceBank = availableExp;
        log('All roster steplings are max level. Banked ' + availableExp + ' experience.');
        updateDisplay();
        return;
    }
    
    // Distribute experience in order, maxing out each stepling before moving to next
    var remainingExp = availableExp;
    var leveledUp = [];
    
    // Add delay between API calls to prevent rate limiting
    for (var i = 0; i < orderedSteplings.length && remainingExp > 0; i++) {
        var steplingData = orderedSteplings[i];
        var stepling = steplingData.stepling;
        var maxLevel = stepling.fusion_level * 10;
        
        console.log('Processing stepling #' + steplingData.order + ':', stepling.species.name);
        console.log('Current level:', stepling.level, 'Max level:', maxLevel);
        console.log('Remaining exp:', remainingExp);
        
        // Calculate how much experience this stepling can use to max out
        var expNeeded = 0;
        var currentLevel = stepling.level;
        var tempExp = remainingExp;
        
        // Calculate total exp needed to max out this stepling
        while (currentLevel < maxLevel && tempExp > 0) {
            var expForNextLevel = currentLevel * 10;
            console.log('Level', currentLevel, 'needs', expForNextLevel, 'exp');
            if (tempExp >= expForNextLevel) {
                expNeeded += expForNextLevel;
                tempExp -= expForNextLevel;
                currentLevel++;
                console.log('Can level up to', currentLevel, 'total exp needed so far:', expNeeded);
            } else {
                console.log('Not enough exp for next level');
                break;
            }
        }
        
        console.log('Final expNeeded for this stepling:', expNeeded);
        
        if (expNeeded > 0) {
            // Level up this stepling
            try {
                console.log('Making API call to level up stepling:', stepling.id);
                var response = await fetch(API_BASE + '/api/steplings/' + stepling.id + '/levelup', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ experiencePoints: expNeeded })
                });
                
                console.log('API response status:', response.status);
                
                if (response.ok) {
                    var result = await response.json();
                    console.log('API result:', result);
                    
                    if (result.success) {
                        var updatedStepling = result.data;
                        var species = stepling.species || { name: 'Unknown' };
                        var levelsGained = updatedStepling.level - stepling.level;
                        log('✨ #' + steplingData.order + ' ' + species.name + ' gained ' + levelsGained + ' levels! (Lv.' + updatedStepling.level + ')');
                        leveledUp.push('#' + steplingData.order + ' ' + species.name);
                        remainingExp -= expNeeded;
                        console.log('Successfully leveled up, remaining exp:', remainingExp);
                    } else {
                        console.log('API returned success=false:', result.error);
                        log('Failed to level up ' + stepling.species.name + ': ' + (result.error || 'Unknown error'));
                    }
                } else {
                    console.log('API response not ok:', response.status);
                    var errorText = await response.text();
                    console.log('Error response:', errorText);
                    log('API error leveling up ' + stepling.species.name);
                }
            } catch (error) {
                console.error('Error leveling up stepling:', error);
                log('Network error leveling up ' + stepling.species.name);
            }
            
            // Add small delay between API calls to prevent rate limiting
            if (i < orderedSteplings.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }
        }
    }
    
    // Bank any leftover experience
    if (remainingExp > 0) {
        game.experienceBank = remainingExp;
        log('Banked ' + remainingExp + ' leftover experience.');
    }
    
    // Show summary
    if (leveledUp.length > 0) {
        log('🎉 Leveled up: ' + leveledUp.join(', '));
    }
    
    // Only refresh steplings if we actually made API calls
    if (leveledUp.length > 0) {
        await loadSteplings();
    }
    updateDisplay();
    console.log('=== END DISTRIBUTE EXPERIENCE DEBUG ===');
}
// Manage training roster
function manageTrainingRoster() {
    console.log('manageTrainingRoster called');
    document.getElementById('species-section').style.display = 'none';
    document.getElementById('steplings-section').style.display = 'none';
    document.getElementById('training-roster-section').style.display = 'block';
    
    log('Managing training roster...');
    loadTrainingRoster();
}

// Hide training roster
function hideTrainingRoster() {
    document.getElementById('training-roster-section').style.display = 'none';
    document.getElementById('species-section').style.display = 'block';
}

// Load training roster
async function loadTrainingRoster() {
    console.log('loadTrainingRoster called');
    if (!isConnected) {
        console.log('Not connected, skipping roster load');
        return;
    }
    
    // Make sure we have steplings loaded
    if (playerSteplings.length === 0) {
        console.log('Loading steplings first...');
        await loadSteplings();
    }
    
    console.log('Updating roster grid and apply button...');
    updateTrainingRosterGrid();
    updateApplyExpButton();
}

// Update the apply banked experience button visibility
function updateApplyExpButton() {
    console.log('updateApplyExpButton called');
    console.log('experienceBank:', game.experienceBank);
    console.log('trainingRoster length:', game.trainingRoster.length);
    
    var applyBtn = document.getElementById('apply-exp-btn');
    if (!applyBtn) {
        console.error('apply-exp-btn element not found!');
        return;
    }
    
    if (game.experienceBank > 0 && game.trainingRoster.length > 0) {
        applyBtn.style.display = 'inline-block';
        applyBtn.innerHTML = 'Apply ' + game.experienceBank + ' Banked XP';
        console.log('Showing apply button');
    } else {
        applyBtn.style.display = 'none';
        console.log('Hiding apply button');
    }
}

// Manually apply banked experience
async function applyBankedExperience() {
    console.log('applyBankedExperience called');
    if (game.experienceBank > 0 && game.trainingRoster.length > 0) {
        log('Manually applying ' + game.experienceBank + ' banked experience...');
        await distributeExperienceToRoster(0); // This will use the banked experience
        updateApplyExpButton();
        saveGame();
    } else {
        log('No banked experience or no training roster set.');
    }
}

// === FUSION SYSTEM ===

// Manage fusion
function manageFusion() {
    console.log('manageFusion called');
    document.getElementById('species-section').style.display = 'none';
    document.getElementById('steplings-section').style.display = 'none';
    document.getElementById('training-roster-section').style.display = 'none';
    document.getElementById('fusion-section').style.display = 'block';
    
    // Reset fusion state
    game.fusionSlot1 = null;
    game.fusionSlot2 = null;
    game.activeFusionSlot = 1;
    
    log('Opening Fusion Lab...');
    loadFusionSteplings();
}

// Hide fusion
function hideFusion() {
    document.getElementById('fusion-section').style.display = 'none';
    document.getElementById('species-section').style.display = 'block';
}

// Load steplings for fusion
async function loadFusionSteplings() {
    console.log('loadFusionSteplings called');
    if (!isConnected) {
        console.log('Not connected, skipping fusion load');
        return;
    }
    
    // Make sure we have steplings loaded
    if (playerSteplings.length === 0) {
        console.log('Loading steplings first...');
        await loadSteplings();
    }
    
    console.log('Updating fusion display...');
    updateFusionSlots();
    updateFusionSteplingsGrid();
}

// Select fusion slot
function selectFusionSlot(slotNumber) {
    console.log('selectFusionSlot called:', slotNumber);
    game.activeFusionSlot = slotNumber;
    updateFusionSlots();
}

// Select stepling for fusion
function selectSteplingForFusion(steplingId) {
    console.log('selectSteplingForFusion called:', steplingId, 'for slot', game.activeFusionSlot);
    
    var stepling = playerSteplings.find(s => s.id === steplingId);
    if (!stepling) {
        log('Stepling not found!');
        return;
    }
    
    // Check if stepling is already selected in other slot
    if (game.fusionSlot1 && game.fusionSlot1.id === steplingId) {
        log('Stepling already in slot 1');
        return;
    }
    if (game.fusionSlot2 && game.fusionSlot2.id === steplingId) {
        log('Stepling already in slot 2');
        return;
    }
    
    // Assign to active slot
    if (game.activeFusionSlot === 1) {
        game.fusionSlot1 = stepling;
        game.activeFusionSlot = 2; // Auto-switch to slot 2
        log('Selected ' + stepling.species.name + ' for slot 1');
    } else {
        game.fusionSlot2 = stepling;
        log('Selected ' + stepling.species.name + ' for slot 2');
    }
    
    updateFusionSlots();
    updateFusionSteplingsGrid();
}

// Update fusion slots display
function updateFusionSlots() {
    console.log('updateFusionSlots called');
    
    // Update slot 1
    var slot1 = document.getElementById('fusion-slot-1');
    if (game.fusionSlot1) {
        slot1.className = 'fusion-slot filled';
        slot1.innerHTML = '<div class="fusion-stepling"><div class="emoji">' + game.fusionSlot1.species.emoji + '</div><div class="name">' + game.fusionSlot1.species.name + '</div><div style="font-size: 8px;">Lv.' + game.fusionSlot1.level + ' F.' + game.fusionSlot1.fusion_level + '</div></div>';
    } else {
        slot1.className = 'fusion-slot' + (game.activeFusionSlot === 1 ? ' active' : '');
        slot1.innerHTML = '<div class="fusion-placeholder">Select Stepling 1</div>';
    }
    
    // Update slot 2
    var slot2 = document.getElementById('fusion-slot-2');
    if (game.fusionSlot2) {
        slot2.className = 'fusion-slot filled';
        slot2.innerHTML = '<div class="fusion-stepling"><div class="emoji">' + game.fusionSlot2.species.emoji + '</div><div class="name">' + game.fusionSlot2.species.name + '</div><div style="font-size: 8px;">Lv.' + game.fusionSlot2.level + ' F.' + game.fusionSlot2.fusion_level + '</div></div>';
    } else {
        slot2.className = 'fusion-slot' + (game.activeFusionSlot === 2 ? ' active' : '');
        slot2.innerHTML = '<div class="fusion-placeholder">Select Stepling 2</div>';
    }
    
    // Update result slot and fusion button
    var resultSlot = document.getElementById('fusion-result');
    var fusionBtn = document.getElementById('fusion-execute-btn');
    
    if (game.fusionSlot1 && game.fusionSlot2) {
        // Check if fusion is valid
        var canFuse = game.fusionSlot1.species_id === game.fusionSlot2.species_id && 
                     game.fusionSlot1.fusion_level === game.fusionSlot2.fusion_level;
        
        if (canFuse) {
            var newFusionLevel = game.fusionSlot1.fusion_level + 1;
            var maxLevel1 = game.fusionSlot1.fusion_level * 10;
            var maxLevel2 = game.fusionSlot2.fusion_level * 10;
            var isSuboptimal = game.fusionSlot1.level < maxLevel1 || game.fusionSlot2.level < maxLevel2;
            
            resultSlot.innerHTML = '<div class="fusion-stepling"><div class="emoji">' + game.fusionSlot1.species.emoji + '</div><div class="name">' + game.fusionSlot1.species.name + '</div><div style="font-size: 8px;">Lv.1 F.' + newFusionLevel + '</div></div>';
            fusionBtn.disabled = false;
            
            if (isSuboptimal) {
                fusionBtn.innerHTML = '⚠️ Fuse (Suboptimal)';
                fusionBtn.className = 'btn btn-warning';
            } else {
                fusionBtn.innerHTML = '✨ Fuse (Optimal)';
                fusionBtn.className = 'btn btn-primary';
            }
        } else {
            resultSlot.innerHTML = '<div class="fusion-placeholder" style="color: #ff6b6b;">Invalid Fusion</div>';
            fusionBtn.disabled = true;
            fusionBtn.innerHTML = 'Cannot Fuse';
            fusionBtn.className = 'btn';
        }
    } else {
        resultSlot.innerHTML = '<div class="fusion-placeholder">Result</div>';
        fusionBtn.disabled = true;
        fusionBtn.innerHTML = 'Select 2 Steplings';
        fusionBtn.className = 'btn';
    }
}

// Update fusion steplings grid
function updateFusionSteplingsGrid() {
    console.log('updateFusionSteplingsGrid called');
    
    var grid = document.getElementById('fusion-steplings-grid');
    if (!grid) {
        console.error('fusion-steplings-grid element not found!');
        return;
    }
    
    var html = '';
    
    if (playerSteplings.length === 0) {
        html = '<div class="card">No steplings yet!</div>';
    } else {
        for (var i = 0; i < playerSteplings.length; i++) {
            var s = playerSteplings[i];
            var species = s.species || { name: 'Unknown', emoji: '❓' };
            var maxLevel = s.fusion_level * 10;
            var isMaxLevel = s.level >= maxLevel;
            var hasSuboptimalFusion = s.has_suboptimal_fusion || false;
            var isSelected = (game.fusionSlot1 && game.fusionSlot1.id === s.id) || 
                           (game.fusionSlot2 && game.fusionSlot2.id === s.id);
            
            var cardClass = 'card';
            if (isSelected) cardClass += ' selected';
            if (isMaxLevel) cardClass += ' max-level';
            
            html += '<div class="' + cardClass + '" onclick="selectSteplingForFusion(\'' + s.id + '\')">';
            html += '<div class="emoji">' + species.emoji + '</div>';
            html += '<div class="name">' + species.name + (hasSuboptimalFusion ? ' ⚠️' : '') + '</div>';
            html += '<div style="font-size: 10px;">Lv.' + s.level + '/' + maxLevel + ' F.' + s.fusion_level + '</div>';
            if (isMaxLevel) {
                html += '<div style="font-size: 9px; color: #ffc107;">MAX LEVEL</div>';
            }
            if (hasSuboptimalFusion) {
                html += '<div style="font-size: 8px; color: #ff9800;">IMPERFECT</div>';
            }
            if (isSelected) {
                html += '<div style="font-size: 12px; margin-top: 2px;">✓</div>';
            }
            html += '</div>';
        }
    }
    
    console.log('Setting fusion grid HTML');
    grid.innerHTML = html;
}
// Perform fusion
async function performFusion() {
    console.log('performFusion called');
    
    if (!game.fusionSlot1 || !game.fusionSlot2) {
        log('Need to select 2 steplings for fusion');
        return;
    }
    
    if (!isConnected) {
        log('Need backend connection for fusion');
        return;
    }
    
    // Validate fusion
    if (game.fusionSlot1.species_id !== game.fusionSlot2.species_id) {
        log('Steplings must be the same species');
        return;
    }
    
    if (game.fusionSlot1.fusion_level !== game.fusionSlot2.fusion_level) {
        log('Steplings must be the same fusion level');
        return;
    }
    
    log('Performing fusion...');
    
    try {
        // Calculate new stepling stats using improved fusion formula
        var newFusionLevel = game.fusionSlot1.fusion_level + 1;
        
        // New formula: 10% of average current stats as bonus
        var avgStats = {
            health: Math.round((game.fusionSlot1.current_stats.health + game.fusionSlot2.current_stats.health) / 2),
            attack: Math.round((game.fusionSlot1.current_stats.attack + game.fusionSlot2.current_stats.attack) / 2),
            defense: Math.round((game.fusionSlot1.current_stats.defense + game.fusionSlot2.current_stats.defense) / 2),
            special: Math.round((game.fusionSlot1.current_stats.special + game.fusionSlot2.current_stats.special) / 2)
        };
        
        var fusionBonus = {
            health: Math.round(avgStats.health * 0.1),
            attack: Math.round(avgStats.attack * 0.1),
            defense: Math.round(avgStats.defense * 0.1),
            special: Math.round(avgStats.special * 0.1)
        };
        
        // Get base stats (Grasshopper base: 20/15/10/5)
        var baseStats = { health: 20, attack: 15, defense: 10, special: 5 }; // TODO: Get from species data
        
        // New base stats = original base + fusion bonus, with minimum of original base
        var newStats = {
            health: Math.max(baseStats.health + fusionBonus.health, baseStats.health),
            attack: Math.max(baseStats.attack + fusionBonus.attack, baseStats.attack),
            defense: Math.max(baseStats.defense + fusionBonus.defense, baseStats.defense),
            special: Math.max(baseStats.special + fusionBonus.special, baseStats.special)
        };
        
        var newStepling = {
            player_id: '021cb11f-482a-44d2-b289-110400f23562',
            species_id: game.fusionSlot1.species_id,
            level: 1,
            fusion_level: newFusionLevel,
            current_stats: newStats
        };
        
        var response = await fetch(API_BASE + '/api/steplings/fuse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newStepling: newStepling,
                removedSteplingIds: [game.fusionSlot1.id, game.fusionSlot2.id]
            })
        });
        
        console.log('Fusion API response status:', response.status);
        
        if (response.ok) {
            var result = await response.json();
            console.log('Fusion API result:', result);
            
            if (result.success) {
                log('🎉 Fusion successful! Created ' + game.fusionSlot1.species.name + ' F.' + newFusionLevel);
                
                // Reset fusion state
                game.fusionSlot1 = null;
                game.fusionSlot2 = null;
                game.activeFusionSlot = 1;
                
                // Refresh steplings
                await loadSteplings();
                await loadFusionSteplings();
            } else {
                log('Fusion failed: ' + (result.error || 'Unknown error'));
            }
        } else {
            var errorText = await response.text();
            console.log('Fusion API error:', errorText);
            log('Fusion failed: Server error');
        }
    } catch (error) {
        console.error('Error performing fusion:', error);
        log('Fusion failed: Network error');
    }
}

// Save training roster and apply banked experience
async function saveTrainingRoster() {
    log('Training roster saved! ' + game.trainingRoster.length + ' steplings selected.');
    
    // If there's banked experience and we have a roster, apply it immediately
    if (game.experienceBank > 0 && game.trainingRoster.length > 0) {
        log('Applying ' + game.experienceBank + ' banked experience to new roster...');
        await distributeExperienceToRoster(0); // This will use the banked experience
    }
    
    saveGame();
    hideTrainingRoster();
}

// Toggle stepling in training roster with ordering (1-10)
function toggleSteplingInRoster(steplingId) {
    console.log('toggleSteplingInRoster called with:', steplingId);
    console.log('Current roster:', game.trainingRoster);
    console.log('Current order:', game.rosterOrder);
    
    var index = game.trainingRoster.indexOf(steplingId);
    if (index === -1) {
        // Add to roster
        if (game.trainingRoster.length >= 10) {
            log('Training roster is full! (Max 10 steplings)');
            return;
        }
        
        var orderNumber = game.trainingRoster.length + 1;
        game.trainingRoster.push(steplingId);
        game.rosterOrder[steplingId] = orderNumber;
        log('Added to training roster at position #' + orderNumber);
    } else {
        // Remove from roster and reorder
        game.trainingRoster.splice(index, 1);
        delete game.rosterOrder[steplingId];
        
        // Reorder remaining steplings
        game.rosterOrder = {}; // Clear and rebuild
        for (var i = 0; i < game.trainingRoster.length; i++) {
            game.rosterOrder[game.trainingRoster[i]] = i + 1;
        }
        
        log('Removed from training roster');
    }
    
    console.log('Updated roster:', game.trainingRoster);
    console.log('Updated order:', game.rosterOrder);
    
    updateTrainingRosterGrid();
    updateApplyExpButton();
}

function viewSteplings() {
    console.log('viewSteplings called');
    var speciesSection = document.getElementById('species-section');
    var steplingsSection = document.getElementById('steplings-section');
    console.log('species section:', speciesSection);
    console.log('steplings section:', steplingsSection);
    
    if (speciesSection) speciesSection.style.display = 'none';
    if (steplingsSection) steplingsSection.style.display = 'block';
    
    log('Viewing steplings...');
    loadSteplings();
}

// Hide steplings
function hideSteplings() {
    document.getElementById('steplings-section').style.display = 'none';
    document.getElementById('species-section').style.display = 'block';
}

// Debug steplings
async function debugSteplings() {
    console.log('=== STEPLINGS DEBUG ===');
    console.log('playerSteplings:', playerSteplings);
    console.log('playerSteplings.length:', playerSteplings.length);
    console.log('isConnected:', isConnected);
    
    var grid = document.getElementById('steplings-grid');
    console.log('steplings-grid element:', grid);
    console.log('steplings-grid innerHTML:', grid ? grid.innerHTML : 'null');
    
    var section = document.getElementById('steplings-section');
    console.log('steplings-section element:', section);
    console.log('steplings-section display:', section ? section.style.display : 'null');
    
    // Test API endpoints
    log('🔧 Starting comprehensive debug tests...');
    let debugSummary = [];
    
    try {
        // Test backend health
        const healthResponse = await fetch(API_BASE + '/health');
        const healthStatus = healthResponse.ok ? '✅ Backend Online' : '❌ Backend Error';
        debugSummary.push(healthStatus);
        console.log('Health check:', healthResponse.status, healthResponse.ok);
        log('🏥 Backend Health: ' + healthResponse.status + ' ' + (healthResponse.ok ? 'OK' : 'FAILED'));
        
        // Test steplings endpoint with detailed logging
        log('📡 Testing steplings API...');
        const steplingsResponse = await fetch(API_BASE + '/api/steplings');
        console.log('📡 Steplings API status:', steplingsResponse.status);
        log('📡 Steplings API Status: ' + steplingsResponse.status);
        
        if (steplingsResponse.ok) {
            const steplingsResult = await steplingsResponse.json();
            const steplingCount = steplingsResult.data ? steplingsResult.data.length : 0;
            debugSummary.push(`📊 ${steplingCount} steplings in DB`);
            console.log('📊 Steplings API result:', steplingsResult);
            console.log('📈 Steplings count:', steplingCount);
            log('📊 Steplings Found: ' + steplingCount);
            
            // Show detailed stepling info
            if (steplingsResult.data && steplingsResult.data.length > 0) {
                log('📋 Steplings Details:');
                for (let i = 0; i < Math.min(3, steplingsResult.data.length); i++) {
                    const s = steplingsResult.data[i];
                    const species = s.species || { name: 'Unknown' };
                    log(`  ${i+1}. ${species.name} Lv.${s.level} F.${s.fusion_level}`);
                }
                if (steplingsResult.data.length > 3) {
                    log(`  ... and ${steplingsResult.data.length - 3} more`);
                }
            } else {
                log('📋 No steplings found in database');
            }
        } else {
            debugSummary.push('❌ Steplings API failed');
            const errorText = await steplingsResponse.text();
            console.log('❌ Steplings API error:', errorText);
            log('❌ Steplings API Error: ' + errorText);
        }
        
        // Test discovery endpoint to see if steplings are being created
        log('🔬 Testing discovery API (creates steplings)...');
        const discoveryResponse = await fetch(API_BASE + '/api/species/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: '021cb11f-482a-44d2-b289-110400f23562',
                magnifyingGlass: null
            })
        });
        
        console.log('🧪 Discovery API status:', discoveryResponse.status);
        log('🧪 Discovery API Status: ' + discoveryResponse.status);
        
        if (discoveryResponse.ok) {
            const discoveryResult = await discoveryResponse.json();
            debugSummary.push('✅ Discovery API works');
            console.log('🎯 Discovery result:', discoveryResult);
            
            if (discoveryResult.stepling) {
                log('🎉 Discovery created stepling: ' + (discoveryResult.species?.name || 'Unknown'));
            } else {
                log('⚠️ Discovery succeeded but no stepling created');
            }
        } else {
            debugSummary.push('❌ Discovery API failed');
            const discoveryError = await discoveryResponse.text();
            console.log('❌ Discovery API error:', discoveryError);
            log('❌ Discovery API Error: ' + discoveryError);
        }
        
        // Test if we can create a stepling directly
        log('🔨 Testing direct stepling creation...');
        try {
            const createResponse = await fetch(API_BASE + '/api/steplings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    speciesId: 'd4a09c90-17ea-4778-85db-3b83c54654ef' // Grasshopper ID
                })
            });
            
            log('🔨 Direct creation status: ' + createResponse.status);
            if (createResponse.ok) {
                const createResult = await createResponse.json();
                log('🔨 Direct creation successful');
                console.log('🔨 Direct creation result:', createResult);
            } else {
                const createError = await createResponse.text();
                log('🔨 Direct creation failed: ' + createError);
                console.log('🔨 Direct creation error:', createError);
            }
        } catch (createError) {
            log('🔨 Direct creation error: ' + createError.message);
        }
        
        // Show summary in game log
        log('🔧 Debug Summary: ' + debugSummary.join(' | '));
        
    } catch (error) {
        console.log('💥 Debug error:', error);
        log('💥 Debug failed: ' + error.message);
    }
    
    // Force refresh steplings after debug
    log('🔄 Refreshing steplings after debug...');
    await loadSteplings();
}

// Load species
async function loadSpecies() {
    if (!isConnected) {
        log('Skipping species load - not connected');
        return;
    }
    
    try {
        log('Fetching species from API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        var response = await fetch(API_BASE + '/api/species/all', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            allSpecies = await response.json();
            log('Loaded ' + allSpecies.length + ' species');
            updateSpeciesGrid();
        } else {
            log('Species API returned error: ' + response.status);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            log('Species load timed out');
        } else {
            log('Species load error: ' + error.message);
        }
    }
}

var isLoadingSteplings = false; // Prevent multiple simultaneous loads

// Load steplings
async function loadSteplings() {
    console.log('=== loadSteplings DEBUG ===');
    console.log('isConnected:', isConnected);
    console.log('isLoadingSteplings:', isLoadingSteplings);
    
    if (isLoadingSteplings) {
        console.log('Already loading steplings, skipping...');
        return;
    }
    
    if (!isConnected) {
        log('Skipping steplings load - not connected');
        return;
    }
    
    isLoadingSteplings = true;
    
    try {
        log('Fetching steplings from API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        var response = await fetch(API_BASE + '/api/steplings', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);
        
        if (response.ok) {
            var result = await response.json();
            console.log('API result:', result);
            console.log('result.data length:', result.data ? result.data.length : 'undefined');
            
            playerSteplings = result.data || [];
            console.log('Set playerSteplings to:', playerSteplings.length, 'items');
            log('Loaded ' + playerSteplings.length + ' steplings');
            
            // Clean up orphaned stepling IDs from training roster
            cleanupTrainingRoster();
            
            console.log('Calling updateSteplingsGrid...');
            updateSteplingsGrid();
        } else {
            log('Steplings API returned error: ' + response.status);
        }
    } catch (error) {
        console.error('loadSteplings error:', error);
        if (error.name === 'AbortError') {
            log('Steplings load timed out');
        } else {
            log('Steplings load error: ' + error.message);
        }
    } finally {
        isLoadingSteplings = false;
    }
    console.log('=== END loadSteplings DEBUG ===');
}

// Clean up orphaned stepling IDs from training roster
function cleanupTrainingRoster() {
    var currentSteplingIds = playerSteplings.map(s => s.id);
    var originalRosterLength = game.trainingRoster.length;
    
    // Remove IDs that don't exist in current steplings
    game.trainingRoster = game.trainingRoster.filter(id => currentSteplingIds.includes(id));
    
    // Clean up roster order mapping
    var newRosterOrder = {};
    for (var i = 0; i < game.trainingRoster.length; i++) {
        var steplingId = game.trainingRoster[i];
        newRosterOrder[steplingId] = i + 1; // Re-number from 1
    }
    game.rosterOrder = newRosterOrder;
    
    if (originalRosterLength !== game.trainingRoster.length) {
        var removedCount = originalRosterLength - game.trainingRoster.length;
        log('Cleaned up ' + removedCount + ' orphaned stepling(s) from training roster');
        console.log('Training roster cleaned:', game.trainingRoster);
        console.log('New roster order:', game.rosterOrder);
    }
}
// Check milestones - independent repeating cycles for each tier
function checkMilestones() {
    var milestones = [
        { interval: 5000, tier: 'uncommon' },
        { interval: 10000, tier: 'rare' },
        { interval: 50000, tier: 'epic' },
        { interval: 100000, tier: 'legendary' }
    ];
    
    for (var i = 0; i < milestones.length; i++) {
        var milestone = milestones[i];
        var interval = milestone.interval;
        var tier = milestone.tier;
        
        // Calculate how many times we've passed this interval
        var timesReached = Math.floor(game.steps / interval);
        
        // Count how many times we've already been awarded this tier
        var alreadyAwarded = game.milestonesReached.filter(m => m.tier === tier).length;
        
        // Award for each time we've reached this interval but haven't been awarded yet
        while (alreadyAwarded < timesReached) {
            game.magnifyingGlass[tier]++;
            game.milestonesReached.push({ 
                interval: interval, 
                tier: tier, 
                cycle: alreadyAwarded + 1,
                stepsWhenAwarded: game.steps
            });
            
            var cycleText = alreadyAwarded > 0 ? ' (x' + (alreadyAwarded + 1) + ')' : '';
            log('🎉 ' + interval + ' steps' + cycleText + '! Earned ' + tier + ' magnifying glass! Total: ' + getTotalGlasses());
            alreadyAwarded++;
        }
    }
}

// Get milestone progress for display
function getMilestoneProgress() {
    var milestones = [
        { interval: 5000, tier: 'uncommon', emoji: '🔍' },
        { interval: 10000, tier: 'rare', emoji: '🔎' },
        { interval: 50000, tier: 'epic', emoji: '🔬' },
        { interval: 100000, tier: 'legendary', emoji: '🌟' }
    ];
    
    var progress = [];
    
    for (var i = 0; i < milestones.length; i++) {
        var milestone = milestones[i];
        var interval = milestone.interval;
        var tier = milestone.tier;
        var emoji = milestone.emoji;
        
        // Calculate progress within current cycle
        var currentCycle = Math.floor(game.steps / interval) + 1;
        var progressInCycle = game.steps % interval;
        var progressPercent = (progressInCycle / interval) * 100;
        var remaining = interval - progressInCycle;
        
        // Count how many we've earned of this tier
        var earned = Math.floor(game.steps / interval);
        
        progress.push({
            tier: tier,
            emoji: emoji,
            interval: interval,
            currentCycle: currentCycle,
            progressInCycle: progressInCycle,
            progressPercent: progressPercent,
            remaining: remaining,
            earned: earned,
            nextTarget: currentCycle * interval
        });
    }
    
    return progress;
}

// Update milestone progress display
function updateMilestoneDisplay() {
    var progress = getMilestoneProgress();
    var container = document.getElementById('milestone-bars');
    if (!container) return;
    
    var html = '';
    
    for (var i = 0; i < progress.length; i++) {
        var p = progress[i];
        var tierColor = {
            'uncommon': '#28a745',
            'rare': '#007bff', 
            'epic': '#6f42c1',
            'legendary': '#ffc107'
        }[p.tier] || '#6c757d';
        
        html += '<div style="margin-bottom: 12px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">';
        html += '<span style="font-size: 12px; font-weight: bold;">' + p.emoji + ' ' + p.tier.toUpperCase() + '</span>';
        html += '<span style="font-size: 11px; opacity: 0.8;">' + p.earned + ' earned | ' + p.remaining.toLocaleString() + ' to go</span>';
        html += '</div>';
        
        html += '<div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 8px; overflow: hidden;">';
        html += '<div style="background: ' + tierColor + '; height: 100%; width: ' + p.progressPercent.toFixed(1) + '%; transition: width 0.3s ease;"></div>';
        html += '</div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// Get total magnifying glasses
function getTotalGlasses() {
    return game.magnifyingGlass.uncommon + game.magnifyingGlass.rare + game.magnifyingGlass.epic + game.magnifyingGlass.legendary;
}

// Get best available magnifying glass tier
function getBestGlassTier() {
    if (game.magnifyingGlass.legendary > 0) return 'legendary';
    if (game.magnifyingGlass.epic > 0) return 'epic';
    if (game.magnifyingGlass.rare > 0) return 'rare';
    if (game.magnifyingGlass.uncommon > 0) return 'uncommon';
    return null;
}

// Show magnifying glass inventory
function showGlassInventory() {
    document.getElementById('species-section').style.display = 'none';
    document.getElementById('steplings-section').style.display = 'none';
    document.getElementById('training-roster-section').style.display = 'none';
    document.getElementById('fusion-section').style.display = 'none';
    document.getElementById('stepling-details-section').style.display = 'none';
    document.getElementById('glass-inventory-section').style.display = 'block';
    
    updateGlassInventoryGrid();
}

// Hide magnifying glass inventory
function hideGlassInventory() {
    document.getElementById('glass-inventory-section').style.display = 'none';
    document.getElementById('species-section').style.display = 'block';
}

// Update glass inventory grid
function updateGlassInventoryGrid() {
    var grid = document.getElementById('glass-inventory-grid');
    if (!grid) return;
    
    var html = '';
    
    var tiers = [
        { name: 'uncommon', emoji: '🔍', color: '#28a745', description: 'Doubles advancement chances' },
        { name: 'rare', emoji: '🔎', color: '#007bff', description: 'Quadruples lower tier chances' },
        { name: 'epic', emoji: '🔬', color: '#6f42c1', description: 'Massive boost to all lower tiers' },
        { name: 'legendary', emoji: '🌟', color: '#ffc107', description: 'Ultimate discovery power' }
    ];
    
    var hasAnyGlass = false;
    
    for (var i = 0; i < tiers.length; i++) {
        var tier = tiers[i];
        var count = game.magnifyingGlass[tier.name] || 0;
        
        if (count > 0) {
            hasAnyGlass = true;
            var isSelected = (game.selectedGlassTier === tier.name);
            
            html += '<div class="card' + (isSelected ? ' selected' : '') + '" onclick="selectGlassTier(\'' + tier.name + '\')" style="border-left: 4px solid ' + tier.color + ';">';
            html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
            html += '<span style="font-size: 20px;">' + tier.emoji + '</span>';
            html += '<span style="font-size: 18px; font-weight: bold; color: ' + tier.color + ';">×' + count + '</span>';
            html += '</div>';
            html += '<div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">' + tier.name.toUpperCase() + '</div>';
            html += '<div style="font-size: 12px; opacity: 0.8;">' + tier.description + '</div>';
            if (isSelected) {
                html += '<div style="font-size: 12px; color: ' + tier.color + '; margin-top: 8px; font-weight: bold;">✓ SELECTED</div>';
            }
            html += '</div>';
        }
    }
    
    if (!hasAnyGlass) {
        html = '<div class="card"><div style="text-align: center; opacity: 0.6;"><div style="font-size: 24px; margin-bottom: 8px;">🔍</div><div>No magnifying glasses yet!</div><div style="font-size: 12px; margin-top: 4px;">Earn them by reaching step milestones</div></div></div>';
    } else {
        // Add option to use no glass
        var isNoneSelected = !game.selectedGlassTier;
        html += '<div class="card' + (isNoneSelected ? ' selected' : '') + '" onclick="selectGlassTier(null)" style="border-left: 4px solid #6c757d;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
        html += '<span style="font-size: 20px;">🚫</span>';
        html += '<span style="font-size: 14px; opacity: 0.8;">1% chance</span>';
        html += '</div>';
        html += '<div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">NO GLASS</div>';
        html += '<div style="font-size: 12px; opacity: 0.8;">Base discovery rates only</div>';
        if (isNoneSelected) {
            html += '<div style="font-size: 12px; color: #6c757d; margin-top: 8px; font-weight: bold;">✓ SELECTED</div>';
        }
        html += '</div>';
    }
    
    grid.innerHTML = html;
}

// Select glass tier for next discovery
function selectGlassTier(tier) {
    game.selectedGlassTier = tier;
    updateGlassInventoryGrid();
    updateDisplay();
    saveGame();
    
    if (tier) {
        log('Selected ' + tier + ' magnifying glass for next discovery');
    } else {
        log('Deselected magnifying glass - using base rates');
    }
}

// Update display
function updateDisplay() {
    // Show daily steps in the main display, with total in parentheses
    const dailySteps = getDailySteps();
    document.getElementById('step-count').innerHTML = dailySteps + ' <small>(today)</small>';
    document.getElementById('cells').innerHTML = game.cells;
    document.getElementById('exp').innerHTML = game.experience;
    document.getElementById('exp-bank').innerHTML = game.experienceBank;
    document.getElementById('glass').innerHTML = getTotalGlasses();
    
    // Update milestone progress
    updateMilestoneDisplay();
    
    if (game.mode === 'discovery') {
        document.getElementById('mode-title').innerHTML = '🔍 Discovery Mode';
        document.getElementById('mode-desc').innerHTML = '1000 steps = 1 cell (daily progress)';
    } else {
        document.getElementById('mode-title').innerHTML = '💪 Training Mode';
        var bankText = game.experienceBank > 0 ? ' (+' + game.experienceBank + ' banked)' : '';
        document.getElementById('mode-desc').innerHTML = '10 steps = 1 experience (' + game.trainingRoster.length + ' in roster' + bankText + ')';
    }
    
    var inspectBtn = document.getElementById('inspect-btn');
    if (game.cells >= 1 && isConnected) {
        inspectBtn.innerHTML = 'Inspect Cell (' + game.cells + ')';
        inspectBtn.disabled = false;
    } else {
        inspectBtn.innerHTML = game.cells < 1 ? 'Need 1 Cell' : 'Need Backend';
        inspectBtn.disabled = true;
    }
    
    var glassBtn = document.getElementById('glass-btn');
    var totalGlasses = getTotalGlasses();
    if (totalGlasses < 1) {
        glassBtn.disabled = true;
        glassBtn.innerHTML = 'No Glass';
    } else {
        glassBtn.disabled = false;
        if (useMagnifyingGlass) {
            glassBtn.innerHTML = '🔍 Glass ON';
            glassBtn.className = 'btn btn-warning';
        } else {
            glassBtn.innerHTML = 'Use 🔍 Glass (' + getTotalGlasses() + ')';
            glassBtn.className = 'btn';
        }
    }
}
// Update species grid
function updateSpeciesGrid() {
    var grid = document.getElementById('species-grid');
    var html = '';
    
    for (var i = 0; i < allSpecies.length; i++) {
        var s = allSpecies[i];
        var discovered = s.discovered || game.discoveredSpecies.indexOf(s.id) !== -1;
        html += '<div class="card">';
        html += '<div class="emoji">' + (discovered ? s.emoji : '❓') + '</div>';
        html += '<div class="name">' + (discovered ? s.name : '???') + '</div>';
        if (discovered) html += '<div style="font-size: 10px; opacity: 0.7;">' + s.rarity + '</div>';
        html += '</div>';
    }
    
    grid.innerHTML = html || '<div class="card">Loading species...</div>';
}

// Update steplings grid
function updateSteplingsGrid() {
    console.log('=== updateSteplingsGrid DEBUG ===');
    console.log('playerSteplings.length:', playerSteplings.length);
    console.log('playerSteplings:', playerSteplings);
    
    var grid = document.getElementById('steplings-grid');
    console.log('steplings-grid element:', grid);
    
    var html = '';
    
    if (playerSteplings.length === 0) {
        html = '<div class="card">No steplings yet!</div>';
        console.log('No steplings found, showing empty message');
    } else {
        console.log('Building HTML for', playerSteplings.length, 'steplings');
        for (var i = 0; i < playerSteplings.length; i++) {
            var s = playerSteplings[i];
            var species = s.species || { name: 'Unknown', emoji: '❓' };
            var maxLevel = s.fusion_level * 10;
            var isMaxLevel = s.level >= maxLevel;
            var hasSuboptimalFusion = s.has_suboptimal_fusion || false;
            
            console.log('Stepling', i, ':', species.name, 'Lv.' + s.level + '/' + maxLevel);
            
            html += '<div class="card' + (isMaxLevel ? ' max-level' : '') + '" onclick="showSteplingDetails(\'' + s.id + '\')">';
            html += '<div class="emoji">' + species.emoji + '</div>';
            html += '<div class="name">' + species.name + (hasSuboptimalFusion ? ' ⚠️' : '') + '</div>';
            html += '<div style="font-size: 10px;">Lv.' + s.level + '/' + maxLevel + ' F.' + s.fusion_level + '</div>';
            if (isMaxLevel) {
                html += '<div style="font-size: 9px; color: #ffc107;">MAX LEVEL</div>';
            }
            if (hasSuboptimalFusion) {
                html += '<div style="font-size: 8px; color: #ff9800;">IMPERFECT</div>';
            }
            html += '</div>';
        }
    }
    
    console.log('Generated HTML length:', html.length);
    console.log('Setting grid innerHTML...');
    grid.innerHTML = html;
    console.log('=== END updateSteplingsGrid DEBUG ===');
}

// Update training roster grid
function updateTrainingRosterGrid() {
    console.log('updateTrainingRosterGrid called');
    console.log('playerSteplings:', playerSteplings.length);
    console.log('game.trainingRoster:', game.trainingRoster);
    console.log('game.rosterOrder:', game.rosterOrder);
    
    var grid = document.getElementById('training-roster-grid');
    if (!grid) {
        console.error('training-roster-grid element not found!');
        return;
    }
    
    var html = '';
    
    if (playerSteplings.length === 0) {
        html = '<div class="card">No steplings yet!</div>';
    } else {
        for (var i = 0; i < playerSteplings.length; i++) {
            var s = playerSteplings[i];
            var species = s.species || { name: 'Unknown', emoji: '❓' };
            var maxLevel = s.fusion_level * 10;
            var isMaxLevel = s.level >= maxLevel;
            var hasSuboptimalFusion = s.has_suboptimal_fusion || false;
            var isSelected = game.trainingRoster.indexOf(s.id) !== -1;
            var orderNumber = game.rosterOrder[s.id] || '';
            
            var cardClass = 'card';
            if (isSelected) cardClass += ' selected';
            if (isMaxLevel) cardClass += ' max-level';
            
            html += '<div class="' + cardClass + '" onclick="toggleSteplingInRoster(\'' + s.id + '\')">';
            html += '<div class="emoji">' + species.emoji + '</div>';
            html += '<div class="name">' + species.name + (hasSuboptimalFusion ? ' ⚠️' : '') + '</div>';
            html += '<div style="font-size: 10px;">Lv.' + s.level + '/' + maxLevel + ' F.' + s.fusion_level + '</div>';
            if (isMaxLevel) {
                html += '<div style="font-size: 9px; color: #ffc107;">MAX LEVEL</div>';
            }
            if (hasSuboptimalFusion) {
                html += '<div style="font-size: 8px; color: #ff9800;">IMPERFECT</div>';
            }
            if (isSelected && orderNumber) {
                html += '<div style="font-size: 14px; margin-top: 2px; font-weight: bold; color: #4CAF50;">#' + orderNumber + '</div>';
            }
            html += '</div>';
        }
    }
    
    console.log('Setting grid HTML:', html.substring(0, 100) + '...');
    grid.innerHTML = html;
}

// Select stepling (show details)
function selectStepling(steplingId) {
    showSteplingDetails(steplingId);
}

// Show stepling details
function showSteplingDetails(steplingId) {
    console.log('showSteplingDetails called:', steplingId);
    
    var stepling = playerSteplings.find(s => s.id === steplingId);
    if (!stepling) {
        log('Stepling not found!');
        return;
    }
    
    currentSteplingId = steplingId; // Track current stepling
    
    // Hide other sections
    document.getElementById('species-section').style.display = 'none';
    document.getElementById('steplings-section').style.display = 'none';
    document.getElementById('training-roster-section').style.display = 'none';
    document.getElementById('fusion-section').style.display = 'none';
    document.getElementById('stepling-details-section').style.display = 'block';
    
    // Update details
    var species = stepling.species || { name: 'Unknown', emoji: '❓', rarity: 'common' };
    var maxLevel = stepling.fusion_level * 10;
    var isMaxLevel = stepling.level >= maxLevel;
    var expNeeded = isMaxLevel ? 0 : (stepling.level * 10);
    var hasSuboptimalFusion = stepling.has_suboptimal_fusion || false;
    
    var titleText = species.emoji + ' ' + species.name + ' Details';
    if (hasSuboptimalFusion) {
        titleText += ' ⚠️ IMPERFECT';
    }
    
    document.getElementById('stepling-details-title').innerHTML = titleText;
    document.getElementById('stepling-emoji').innerHTML = species.emoji;
    document.getElementById('stepling-name').innerHTML = species.name + (hasSuboptimalFusion ? ' ⚠️' : '');
    document.getElementById('stepling-level-info').innerHTML = 'Level ' + stepling.level + '/' + maxLevel + ' • Fusion ' + stepling.fusion_level;
    
    // Stats
    document.getElementById('stat-health').innerHTML = stepling.current_stats.health;
    document.getElementById('stat-attack').innerHTML = stepling.current_stats.attack;
    document.getElementById('stat-defense').innerHTML = stepling.current_stats.defense;
    document.getElementById('stat-special').innerHTML = stepling.current_stats.special;
    
    // Info
    document.getElementById('info-species').innerHTML = species.name;
    document.getElementById('info-rarity').innerHTML = species.rarity.charAt(0).toUpperCase() + species.rarity.slice(1);
    document.getElementById('info-max-level').innerHTML = maxLevel;
    document.getElementById('info-next-level').innerHTML = isMaxLevel ? 'MAX LEVEL' : expNeeded + ' EXP needed';
    
    // Release value
    var releaseValue = calculateReleaseValue(stepling);
    document.getElementById('info-release-value').innerHTML = releaseValue.toLocaleString() + ' EXP';
    
    // Format creation date
    var createdDate = new Date(stepling.created_at);
    var now = new Date();
    var diffMs = now - createdDate;
    var diffMins = Math.floor(diffMs / 60000);
    var timeAgo;
    
    if (diffMins < 1) {
        timeAgo = 'Just now';
    } else if (diffMins < 60) {
        timeAgo = diffMins + ' minutes ago';
    } else if (diffMins < 1440) {
        timeAgo = Math.floor(diffMins / 60) + ' hours ago';
    } else {
        timeAgo = Math.floor(diffMins / 1440) + ' days ago';
    }
    
    document.getElementById('info-created').innerHTML = timeAgo;
    
    log('Viewing details for ' + species.name + ' (Lv.' + stepling.level + ' F.' + stepling.fusion_level + ')');
}

// Calculate release experience value
function calculateReleaseValue(stepling) {
    // Calculate total XP invested in this stepling
    var totalInvested = 0;
    for (var i = 1; i < stepling.level; i++) {
        totalInvested += i * 10; // Each level costs level * 10 XP
    }
    
    // Base return rate (percentage of investment returned)
    var returnRate = 1.0; // 100% return on investment
    
    // Fusion bonus - higher fusion levels get better return rates
    var fusionBonus = 1 + (stepling.fusion_level - 1) * 0.1; // +10% per fusion level
    
    // Rarity bonus - 10x multiplier for each tier to reflect true scarcity
    var rarityBonuses = {
        'common': 1,        // 1x (baseline)
        'uncommon': 10,     // 10x (10x harder to get)
        'rare': 100,        // 100x (100x harder to get)
        'epic': 1000,       // 1000x (1000x harder to get)
        'legendary': 10000  // 10000x (10000x harder to get)
    };
    var rarityBonus = rarityBonuses[stepling.species?.rarity || 'common'] || 1;
    
    var releaseValue = Math.floor(totalInvested * returnRate * fusionBonus * rarityBonus);
    
    // Minimum return of 50 XP for any stepling
    return Math.max(50, releaseValue);
}

// Confirm release stepling
function confirmReleaseStepling() {
    var stepling = playerSteplings.find(s => s.id === currentSteplingId);
    if (!stepling) {
        log('Stepling not found!');
        return;
    }
    
    var releaseValue = calculateReleaseValue(stepling);
    var species = stepling.species || { name: 'Unknown' };
    
    var confirmMessage = 'Release ' + species.name + ' (Level ' + stepling.level + ', Fusion ' + stepling.fusion_level + ')?\n\n';
    confirmMessage += 'You will receive ' + releaseValue.toLocaleString() + ' XP in your XP bank.\n\n';
    confirmMessage += 'This action cannot be undone!';
    
    if (confirm(confirmMessage)) {
        releaseStepling(stepling.id, releaseValue);
    }
}

// Release stepling for experience
async function releaseStepling(steplingId, expValue) {
    try {
        // Call backend to remove stepling from database
        if (isConnected) {
            var response = await fetch(API_BASE + '/api/steplings/' + steplingId + '/release', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ experienceValue: expValue })
            });
            
            if (!response.ok) {
                throw new Error('Backend release failed');
            }
            
            var result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Release failed');
            }
        }
        
        // Remove from local collection
        playerSteplings = playerSteplings.filter(s => s.id !== steplingId);
        
        // Remove from training roster if present
        game.trainingRoster = game.trainingRoster.filter(id => id !== steplingId);
        delete game.rosterOrder[steplingId];
        
        // Add experience to XP bank (not regular experience)
        game.experienceBank += expValue;
        
        log('Released stepling for ' + expValue.toLocaleString() + ' XP! Added to XP bank.');
        
        // Close details and refresh displays
        hideSteplingDetails();
        updateDisplay();
        saveGame();
        
    } catch (error) {
        console.error('Error releasing stepling:', error);
        log('Failed to release stepling: ' + (error.message || 'Unknown error'));
    }
}

var currentSteplingId = null; // Track which stepling details are being shown

// Hide stepling details
function hideSteplingDetails() {
    document.getElementById('stepling-details-section').style.display = 'none';
    document.getElementById('steplings-section').style.display = 'block';
}

// Save/load
function saveGame() {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('stepScientistsMobile', JSON.stringify(game));
    }
}

function loadGame() {
    if (typeof localStorage !== 'undefined') {
        var saved = localStorage.getItem('stepScientistsMobile');
        if (saved) {
            var loadedGame = JSON.parse(saved);
            // Merge with default game object to ensure all properties exist
            game = Object.assign({
                steps: 0,
                mode: 'discovery',
                cells: 0,
                experience: 0,
                experienceBank: 0,
                magnifyingGlass: { uncommon: 0, rare: 0, epic: 0, legendary: 0 },
                discoveredSpecies: [],
                milestonesReached: [],
                trainingRoster: [],
                rosterOrder: {},
                fusionSlot1: null,
                fusionSlot2: null,
                activeFusionSlot: 1
            }, loadedGame);
            
            // Migrate old magnifying glass format (number) to new format (object)
            if (typeof game.magnifyingGlass === 'number') {
                var oldCount = game.magnifyingGlass;
                game.magnifyingGlass = { uncommon: 0, rare: 0, epic: 0, legendary: 0 };
                
                // Give all old glasses as uncommon for simplicity
                if (oldCount > 0) {
                    game.magnifyingGlass.uncommon = oldCount;
                    console.log('Migrated ' + oldCount + ' old magnifying glasses to uncommon tier');
                    saveGame(); // Save the migrated data
                }
            }
            
            // Ensure arrays and objects exist
            if (!Array.isArray(game.milestonesReached)) {
                game.milestonesReached = [];
            }
            if (!Array.isArray(game.trainingRoster)) {
                game.trainingRoster = [];
            }
            if (!game.rosterOrder || typeof game.rosterOrder !== 'object') {
                game.rosterOrder = {};
            }
            
            log('Game loaded!');
        }
    }
}

// Log
function log(message) {
    var logEl = document.getElementById('log');
    var time = new Date().toLocaleTimeString();
    logEl.innerHTML = '[' + time + '] ' + message;
    console.log('[Step Scientists] ' + message);
}

// Start
document.addEventListener('DOMContentLoaded', init);
// Google Fit Integration - Modern Implementation with Token Persistence
let googleFitService = null;

async function initializeGoogleFit() {
    try {
        log('Initializing Google Fit service...');
        
        googleFitService = {
            initialized: false,
            accessToken: null,
            
            async initialize() {
                // Load Google Identity Services
                if (!window.google?.accounts) {
                    await loadScript('https://accounts.google.com/gsi/client');
                }
                if (!window.gapi) {
                    await loadScript('https://apis.google.com/js/api.js');
                }
                
                // Initialize gapi client
                await new Promise((resolve) => {
                    window.gapi.load('client', async () => {
                        await window.gapi.client.init({
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/fitness/v1/rest'],
                        });
                        resolve();
                    });
                });
                
                this.initialized = true;
                
                // Try to restore saved token
                const savedToken = localStorage.getItem('googleFitToken');
                const tokenExpiry = localStorage.getItem('googleFitTokenExpiry');
                
                if (savedToken && tokenExpiry) {
                    const now = Date.now();
                    const expiry = parseInt(tokenExpiry);
                    
                    if (now < expiry) {
                        // Token is still valid
                        this.accessToken = savedToken;
                        log('✅ Restored Google Fit session');
                        updateGoogleFitStatus(true);
                        return true;
                    } else {
                        // Token expired, clear it
                        localStorage.removeItem('googleFitToken');
                        localStorage.removeItem('googleFitTokenExpiry');
                        log('🔄 Google Fit token expired, please reconnect');
                    }
                }
                
                return true;
            },
            
            async requestPermission() {
                if (!this.initialized) {
                    await this.initialize();
                }
                
                const CLIENT_ID = '570511343860-48hgn66bnn5vjdsvb3m62m4qpinbfl9n.apps.googleusercontent.com';
                const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read';
                
                return new Promise((resolve, reject) => {
                    const tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: (tokenResponse) => {
                            if (tokenResponse.access_token) {
                                this.accessToken = tokenResponse.access_token;
                                
                                // Save token with expiry (tokens typically last 1 hour)
                                const expiryTime = Date.now() + (3600 * 1000); // 1 hour from now
                                localStorage.setItem('googleFitToken', tokenResponse.access_token);
                                localStorage.setItem('googleFitTokenExpiry', expiryTime.toString());
                                
                                log('✅ Successfully connected to Google Fit!');
                                updateGoogleFitStatus(true);
                                resolve(true);
                            } else {
                                reject(new Error('No access token received'));
                            }
                        },
                        error_callback: (error) => {
                            log('❌ Failed to connect to Google Fit: ' + error.error);
                            updateGoogleFitStatus(false);
                            reject(error);
                        }
                    });
                    
                    tokenClient.requestAccessToken();
                });
            },
            
            async getCurrentSteps() {
                if (!this.accessToken) {
                    throw new Error('Not authorized - please connect to Google Fit first');
                }
                
                const today = new Date();
                const startOfDay = new Date(today);
                startOfDay.setHours(0, 0, 0, 0);
                
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);

                const request = {
                    aggregateBy: [{
                        dataTypeName: 'com.google.step_count.delta'
                    }],
                    bucketByTime: { durationMillis: 86400000 },
                    startTimeMillis: startOfDay.getTime(),
                    endTimeMillis: endOfDay.getTime()
                };

                try {
                    const response = await window.gapi.client.request({
                        path: 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
                        method: 'POST',
                        body: request,
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    let totalSteps = 0;
                    if (response.result.bucket && response.result.bucket.length > 0) {
                        response.result.bucket.forEach(bucket => {
                            if (bucket.dataset && bucket.dataset.length > 0) {
                                bucket.dataset.forEach(dataset => {
                                    if (dataset.point && dataset.point.length > 0) {
                                        dataset.point.forEach(point => {
                                            if (point.value && point.value.length > 0) {
                                                totalSteps += point.value[0].intVal || 0;
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }

                    return totalSteps;
                } catch (error) {
                    // If token is invalid, clear it and require re-auth
                    if (error.status === 401 || error.status === 403) {
                        this.accessToken = null;
                        localStorage.removeItem('googleFitToken');
                        localStorage.removeItem('googleFitTokenExpiry');
                        updateGoogleFitStatus(false);
                        throw new Error('Google Fit session expired - please reconnect');
                    }
                    throw error;
                }
            },
            
            disconnect() {
                this.accessToken = null;
                localStorage.removeItem('googleFitToken');
                localStorage.removeItem('googleFitTokenExpiry');
                updateGoogleFitStatus(false);
                log('🔌 Disconnected from Google Fit');
            }
        };
        
        await googleFitService.initialize();
        log('✅ Google Fit service initialized successfully!');
        
    } catch (error) {
        console.error('Google Fit initialization error:', error);
        log('❌ Failed to initialize Google Fit: ' + error.message);
    }
}

async function connectGoogleFit() {
    try {
        if (!googleFitService) {
            await initializeGoogleFit();
        }
        
        log('🔗 Connecting to Google Fit...');
        await googleFitService.requestPermission();
        
        // Load initial data after successful connection
        await loadGoogleFitData();
        
    } catch (error) {
        console.error('Google Fit connection error:', error);
        log('❌ Failed to connect to Google Fit: ' + error.message);
        updateGoogleFitStatus(false);
    }
}

async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function updateGoogleFitStatus(connected) {
    var statusEl = document.getElementById('google-fit-status');
    if (statusEl) {
        if (connected) {
            statusEl.textContent = '✅ Google Fit Connected (tap to disconnect)';
            statusEl.className = 'google-fit-status connected';
            statusEl.onclick = function() {
                if (googleFitService) {
                    googleFitService.disconnect();
                }
            };
        } else {
            statusEl.textContent = '🏥 Tap to connect Google Fit';
            statusEl.className = 'google-fit-status disconnected';
            statusEl.onclick = connectGoogleFit;
        }
    }
}

async function loadGoogleFitData() {
    try {
        if (!googleFitService || !googleFitService.accessToken) {
            log('❌ Google Fit not connected');
            return;
        }
        
        log('📊 Loading step data from Google Fit...');
        
        const totalStepsToday = await googleFitService.getCurrentSteps();
        log('📱 Google Fit: ' + totalStepsToday + ' steps today');
        
        // Update daily steps and get the difference for processing
        const oldDailySteps = getDailySteps();
        const stepDifference = updateDailySteps(totalStepsToday);
        
        if (stepDifference > 0) {
            log('🔄 Synced ' + stepDifference + ' new steps from Google Fit!');
            
            // Process the new steps for game mechanics
            if (game.mode === 'discovery') {
                const oldCells = Math.floor(oldDailySteps / 1000);
                const newCells = Math.floor(totalStepsToday / 1000);
                const cellsToAdd = newCells - oldCells;
                if (cellsToAdd > 0) {
                    game.cells += cellsToAdd;
                    log('💎 Earned ' + cellsToAdd + ' cells from sync!');
                }
            } else {
                const oldExp = Math.floor(oldDailySteps / 10);
                const newExp = Math.floor(totalStepsToday / 10);
                const expToAdd = newExp - oldExp;
                if (expToAdd > 0) {
                    game.experience += expToAdd;
                    log('⭐ Earned ' + expToAdd + ' experience from sync!');
                    distributeExperienceToRoster(expToAdd);
                }
            }
            
            checkMilestones();
            updateDisplay();
            saveGame();
        } else if (stepDifference < 0) {
            // Handle case where Google Fit shows fewer steps (shouldn't happen normally)
            log('⚠️ Google Fit shows fewer steps than before - keeping current progress');
        } else {
            log('✅ Steps already up to date');
        }
        
    } catch (error) {
        console.error('Google Fit data error:', error);
        
        if (error.message.includes('session expired') || error.message.includes('reconnect')) {
            log('🔄 ' + error.message);
        } else {
            log('❌ Failed to load Google Fit data: ' + error.message);
            updateGoogleFitStatus(false);
        }
    }
}

// Initialize Google Fit service when the app starts
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Google Fit after a short delay to let the main app load first
    setTimeout(initializeGoogleFit, 1000);
});

// Make debug function globally accessible
window.debugSteplings = debugSteplings;

// Quick debug function accessible from console
window.quickDebug = async function() {
    console.log('=== QUICK DEBUG ===');
    console.log('Backend URL:', API_BASE);
    console.log('Connected:', isConnected);
    console.log('Steplings count:', playerSteplings.length);
    
    // Test backend connection
    try {
        const response = await fetch(API_BASE + '/health');
        console.log('Backend health:', response.status, response.ok);
    } catch (error) {
        console.log('Backend health error:', error.message);
    }
    
    // Run full debug
    await debugSteplings();
};

// Service Worker Management
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
                
                // Check for updates
                registration.addEventListener('updatefound', function() {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            log('New version available! Refreshing...');
                            newWorker.postMessage({type: 'SKIP_WAITING'});
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed: ', error);
            });
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', function(event) {
            if (event.data.type === 'BACKGROUND_SYNC' && event.data.action === 'SYNC_STEPS') {
                syncSteps();
            }
        });
        
        // Handle service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            window.location.reload();
        });
    });
}

// Force cache refresh function
function forceCacheRefresh() {
    if ('caches' in window) {
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        }).then(function() {
            log('Cache cleared! Reloading...');
            window.location.reload(true);
        });
    } else {
        window.location.reload(true);
    }
}
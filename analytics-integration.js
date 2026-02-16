// ============================================================================
// Analytics Integration for BrainMatch - Antonyms Game
// ============================================================================
// This file integrates the JS Analytics Bridge with BrainMatch game
// using a non-invasive monkey-patching approach.
// No modifications to the original game code (script.js) are required.
// ============================================================================

// --- INITIALIZATION ---
const sessionID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const analytics = new AnalyticsManager();
analytics.initialize('BrainMatch_Antonyms', sessionID);

console.log('[Analytics] Integration loaded with Session ID:', sessionID);

// --- STATE TRACKING VARIABLES ---
let levelStartTime = null;
let currentLevelId = null;
let currentGameMode = null;
let taskCounter = 0;

// --- HELPER FUNCTIONS ---

/**
 * Generates a unique task ID for each card match attempt
 */
function generateTaskId() {
  return `task_${++taskCounter}`;
}

/**
 * Gets user-friendly level ID based on game mode and level
 */
function getLevelId(mode, level) {
  if (mode === 'campaign') {
    return `campaign_level_${level}`;
  } else if (mode === 'reflex') {
    return 'reflex_mode';
  }
  return 'unknown_level';
}

// --- HOOK: CAMPAIGN MODE START ---
const originalStartGame = window.startGame;
window.startGame = function(level) {
  try {
    // Initialize tracking variables
    currentGameMode = 'campaign';
    currentLevelId = getLevelId('campaign', level);
    levelStartTime = Date.now();
    taskCounter = 0;
    
    // Track level start
    analytics.startLevel(currentLevelId);
    console.log(`[Analytics] Started Level: ${currentLevelId}`);
  } catch (error) {
    console.error('[Analytics] Error in startGame hook:', error);
  }
  
  // Always call original function
  return originalStartGame.call(this, level);
};

// --- HOOK: REFLEX MODE START ---
const originalStartReflexMode = window.startReflexMode;
window.startReflexMode = function() {
  try {
    // Initialize tracking variables
    currentGameMode = 'reflex';
    currentLevelId = 'reflex_mode';
    levelStartTime = Date.now();
    taskCounter = 0;
    
    // Track level start
    analytics.startLevel(currentLevelId);
    console.log(`[Analytics] Started Reflex Mode`);
  } catch (error) {
    console.error('[Analytics] Error in startReflexMode hook:', error);
  }
  
  // Always call original function
  return originalStartReflexMode.call(this);
};

// --- HOOK: CORRECT MATCH ---
const originalHandleCorrectMatch = window.handleCorrectMatch;
window.handleCorrectMatch = function() {
  try {
    // Capture game state before calling original function
    const flippedCards = gameState.flippedCards || [];
    
    if (flippedCards.length === 2) {
      const card1Text = flippedCards[0]?.textContent || 'Unknown';
      const card2Text = flippedCards[1]?.textContent || 'Unknown';
      
      // Record the successful match
      analytics.recordTask(
        currentLevelId,
        generateTaskId(),
        `Match: ${card1Text} ↔ ${card2Text}`,
        card2Text,
        card2Text,
        0,
        0
      );
      
      console.log(`[Analytics] Task Recorded - Correct Match: ${card1Text} ↔ ${card2Text}`);
    }
  } catch (error) {
    console.error('[Analytics] Error in handleCorrectMatch hook:', error);
  }
  
  // Always call original function
  return originalHandleCorrectMatch.call(this);
};

// --- HOOK: INCORRECT MATCH ---
const originalHandleIncorrectMatch = window.handleIncorrectMatch;
window.handleIncorrectMatch = function() {
  try {
    // Capture game state before calling original function
    const flippedCards = gameState.flippedCards || [];
    
    if (flippedCards.length === 2) {
      const card1Text = flippedCards[0]?.textContent || 'Unknown';
      const card2Text = flippedCards[1]?.textContent || 'Unknown';
      
      // Record the failed match
      analytics.recordTask(
        currentLevelId,
        generateTaskId(),
        `Match: ${card1Text} ↔ ${card2Text}`,
        card1Text, // Expected (first card)
        card2Text, // User selected (second card, incorrect)
        0,
        0
      );
      
      console.log(`[Analytics] Task Recorded - Incorrect Match: ${card1Text} ≠ ${card2Text}`);
    }
  } catch (error) {
    console.error('[Analytics] Error in handleIncorrectMatch hook:', error);
  }
  
  // Always call original function
  return originalHandleIncorrectMatch.call(this);
};

// --- HOOK: CAMPAIGN LEVEL WIN ---
const originalHandleCampaignWin = window.handleCampaignWin;
window.handleCampaignWin = function() {
  try {
    // Capture game state before calling original function
    const level = gameState.currentCampaignLevel;
    const turns = gameState.turns || 0;
    const timeTaken = Date.now() - levelStartTime;
    
    // Calculate XP using game's function
    let xp = 0;
    if (typeof calculateXP === 'function') {
      xp = calculateXP(level, turns);
    }
    
    // Track level completion
    analytics.endLevel(currentLevelId, true, timeTaken, xp);
    
    // Add additional metrics
    analytics.addRawMetric('level', level.toString());
    analytics.addRawMetric('turns', turns.toString());
    analytics.addRawMetric('xp_earned', xp.toString());
    analytics.addRawMetric('game_mode', 'campaign');
    
    // Submit report
    analytics.submitReport();
    
    console.log(`[Analytics] Campaign Level ${level} Completed - Success: true, Time: ${timeTaken}ms, XP: ${xp}, Turns: ${turns}`);
  } catch (error) {
    console.error('[Analytics] Error in handleCampaignWin hook:', error);
  }
  
  // Always call original function
  return originalHandleCampaignWin.call(this);
};

// --- HOOK: REFLEX MODE END ---
const originalHandleReflexModeEnd = window.handleReflexModeEnd;
window.handleReflexModeEnd = function() {
  try {
    // Capture game state before calling original function
    const turns = gameState.turns || 0;
    const timeTaken = Date.now() - levelStartTime;
    const score = gameState.reflexScore || 0;
    
    // Track reflex mode completion
    analytics.endLevel(currentLevelId, true, timeTaken, score);
    
    // Add additional metrics
    analytics.addRawMetric('turns', turns.toString());
    analytics.addRawMetric('score', score.toString());
    analytics.addRawMetric('game_mode', 'reflex');
    
    // Submit report
    analytics.submitReport();
    
    console.log(`[Analytics] Reflex Mode Completed - Success: true, Time: ${timeTaken}ms, Score: ${score}, Turns: ${turns}`);
  } catch (error) {
    console.error('[Analytics] Error in handleReflexModeEnd hook:', error);
  }
  
  // Always call original function
  return originalHandleReflexModeEnd.call(this);
};

// --- HOOK: TIMER FAILURE (TIME'S UP) ---
const originalStartTimer = window.startTimer;
window.startTimer = function(duration) {
  try {
    // Call original function first
    const result = originalStartTimer.call(this, duration);
    
    // Intercept the timer's end condition
    // We need to track when time runs out (level failure)
    const originalTimerId = gameState.timerId;
    
    // Store reference to check for time-up condition
    const checkInterval = setInterval(() => {
      if (gameState.timeRemaining !== undefined && gameState.timeRemaining <= 0) {
        try {
          const timeTaken = Date.now() - levelStartTime;
          const turns = gameState.turns || 0;
          
          // Track level failure
          analytics.endLevel(currentLevelId, false, timeTaken, 0);
          analytics.addRawMetric('failure_reason', 'timeout');
          analytics.addRawMetric('turns', turns.toString());
          analytics.submitReport();
          
          console.log(`[Analytics] Level Failed - Timeout at ${timeTaken}ms, Turns: ${turns}`);
        } catch (error) {
          console.error('[Analytics] Error tracking timeout:', error);
        }
        
        clearInterval(checkInterval);
      }
    }, 1000);
    
    return result;
  } catch (error) {
    console.error('[Analytics] Error in startTimer hook:', error);
    return originalStartTimer.call(this, duration);
  }
};

// --- HOOK: RETURN TO MAIN MENU (SESSION END) ---
const originalShowStartScreen = window.showStartScreen;
window.showStartScreen = function() {
  try {
    // If there's an active level, consider it abandoned
    if (currentLevelId && levelStartTime) {
      const timeTaken = Date.now() - levelStartTime;
      const turns = gameState.turns || 0;
      
      analytics.endLevel(currentLevelId, false, timeTaken, 0);
      analytics.addRawMetric('failure_reason', 'abandoned');
      analytics.addRawMetric('turns', turns.toString());
      analytics.submitReport();
      
      console.log(`[Analytics] Level Abandoned - ${currentLevelId} at ${timeTaken}ms, Turns: ${turns}`);
    }
    
    // Reset tracking variables
    currentLevelId = null;
    levelStartTime = null;
    currentGameMode = null;
  } catch (error) {
    console.error('[Analytics] Error in showStartScreen hook:', error);
  }
  
  // Always call original function
  return originalShowStartScreen.call(this);
};

// --- FINAL SCORE TRACKING (CAMPAIGN COMPLETE) ---
const originalShowFinalScoreScreen = window.showFinalScoreScreen;
window.showFinalScoreScreen = function() {
  try {
    // Track campaign completion
    const totalTurns = window.totalCampaignTurns || 0;
    const totalXP = window.totalCampaignXP || 0;
    
    // Calculate final stars
    let finalStars = 1;
    if (totalXP >= 150) finalStars = 3;
    else if (totalXP >= 70) finalStars = 2;
    
    // Record campaign completion metrics
    analytics.addRawMetric('campaign_complete', 'true');
    analytics.addRawMetric('total_turns', totalTurns.toString());
    analytics.addRawMetric('total_xp', totalXP.toString());
    analytics.addRawMetric('final_stars', finalStars.toString());
    
    console.log(`[Analytics] Campaign Completed - Total Turns: ${totalTurns}, Total XP: ${totalXP}, Stars: ${finalStars}`);
  } catch (error) {
    console.error('[Analytics] Error in showFinalScoreScreen hook:', error);
  }
  
  // Always call original function
  return originalShowFinalScoreScreen.call(this);
};

// --- INITIALIZATION COMPLETE ---
console.log('[Analytics] All hooks successfully installed');
console.log('[Analytics] Tracking: Level Start, Level End, Matches (Correct/Incorrect), Timeouts, Abandonment');

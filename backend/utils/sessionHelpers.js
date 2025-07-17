const mongoose = require('mongoose');
const Session = require('../models/Session');
const aiBotService = require('../services/aiBotService');

// Helper function to update session participants with actual bot names
async function updateSessionWithBotNames(sessionId) {
  try {
    const session = await Session.findById(sessionId);
    if (!session) return;
    
    const sessionBots = aiBotService.getSessionBots(sessionId);
    if (sessionBots.length === 0) return;
    
    // Update AI participants in the session with actual bot names
    let aiParticipantIndex = 0;
    const updatedParticipants = session.participants.map(p => {
      if (p.isAI && aiParticipantIndex < sessionBots.length) {
        const bot = sessionBots[aiParticipantIndex];
        aiParticipantIndex++;
        return {
          ...p.toObject(),
          userName: bot.name
        };
      }
      return p;
    });
    
    session.participants = updatedParticipants;
    await session.save();
    
    console.log(`Updated session ${sessionId} with bot names:`, 
      sessionBots.map(b => b.name));
    
  } catch (error) {
    console.error('Error updating session with bot names:', error);
  }
}

module.exports = { updateSessionWithBotNames };

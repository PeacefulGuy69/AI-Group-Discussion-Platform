const express = require('express');
const router = express.Router();
const aiBotService = require('../services/aiBotService');

// Initialize AI bots for a session
router.post('/initialize/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { topic, sessionType, numBots = 4 } = req.body;

    if (!topic || !sessionType) {
      return res.status(400).json({ error: 'Topic and session type are required' });
    }

    const bots = aiBotService.initializeBotsForSession(sessionId, topic, sessionType, numBots);
    
    // Start periodic bot activity
    aiBotService.startBotActivity(sessionId);

    res.json({
      success: true,
      sessionId,
      bots: bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        personality: bot.personality
      }))
    });
  } catch (error) {
    console.error('Error initializing AI bots:', error);
    res.status(500).json({ error: 'Failed to initialize AI bots' });
  }
});

// Send message to AI bots
router.post('/message/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sender, content } = req.body;

    if (!sender || !content) {
      return res.status(400).json({ error: 'Sender and content are required' });
    }

    const userMessage = {
      sender,
      content,
      timestamp: Date.now()
    };

    await aiBotService.handleUserMessage(sessionId, userMessage);

    res.json({
      success: true,
      message: 'Message processed by AI bots'
    });
  } catch (error) {
    console.error('Error processing user message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get specific bot response
router.post('/response/:sessionId/:botId', async (req, res) => {
  try {
    const { sessionId, botId } = req.params;
    const { userMessage } = req.body;

    const response = await aiBotService.generateBotResponse(sessionId, botId, userMessage);

    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('Error generating bot response:', error);
    res.status(500).json({ error: 'Failed to generate bot response' });
  }
});

// Get session bots
router.get('/bots/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const bots = aiBotService.getSessionBots(sessionId);

    res.json({
      success: true,
      bots: bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        personality: bot.personality,
        traits: bot.traits
      }))
    });
  } catch (error) {
    console.error('Error getting session bots:', error);
    res.status(500).json({ error: 'Failed to get session bots' });
  }
});

// Get session statistics
router.get('/stats/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = aiBotService.getSessionStats(sessionId);

    if (!stats) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
});

// End AI bot session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    aiBotService.endSession(sessionId);

    res.json({
      success: true,
      message: 'AI bot session ended'
    });
  } catch (error) {
    console.error('Error ending AI bot session:', error);
    res.status(500).json({ error: 'Failed to end AI bot session' });
  }
});

module.exports = router;

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper function to fully deduplicate a session's participants
function deduplicateSessionParticipants(session) {
  if (!session) return session;
  
  // Step 1: Create a map for real participants by userId
  const userMap = new Map();
  const aiMap = new Map();
  
  // First collect real users
  session.participants.forEach(p => {
    if (p.user) {
      // Convert ObjectId to string if needed
      const userId = typeof p.user === 'object' ? p.user._id.toString() : p.user.toString();
      if (!userMap.has(userId)) {
        userMap.set(userId, p);
      }
    } 
    // Note: we don't collect AI participants here, we'll regenerate them
  });
  
  // Step 2: Replace participants with only unique real users
  session.participants = Array.from(userMap.values());
  
  return session;
}

// Helper function to ensure AI participants are unique and properly added
function ensureUniqueAIParticipants(session) {
  if (!session || !session.aiParticipants) return session;
  
  // First remove ALL existing AI participants
  session.participants = session.participants.filter(p => p.user);
  
  // Create fresh AI participants based on the count
  for (let i = 1; i <= session.aiParticipants; i++) {
    const aiName = `AI Participant ${i}`;
    
    // Each AI participant gets a unique entry with proper fields
    session.participants.push({
      userName: aiName,
      isAI: true,
      joinedAt: new Date()
    });
  }
  
  return session;
}

const router = express.Router();

// Test route to check if API is working
router.get('/test', (req, res) => {
  res.json({ message: 'Sessions API is working!' });
});

// Create new session
router.post('/create', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      scheduledTime,
      duration,
      type,
      topic,
      maxParticipants,
      aiParticipants,
      realParticipants
    } = req.body;

    const shareLink = uuidv4();

    const session = new Session({
      title,
      description,
      scheduledTime,
      duration,
      type,
      topic,
      maxParticipants,
      aiParticipants,
      realParticipants,
      createdBy: req.user.userId,
      shareLink
    });

    await session.save();

    res.status(201).json({
      message: 'Session created successfully',
      session,
      shareLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${shareLink}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's sessions
router.get('/my-sessions', auth, async (req, res) => {
  try {
    console.log('Fetching sessions for user:', req.user.userId);
    const sessions = await Session.find({ createdBy: req.user.userId })
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    console.log('Found sessions:', sessions.length);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get session by share link
router.get('/join/:shareLink', async (req, res) => {
  try {
    const { shareLink } = req.params;
    
    let session = await Session.findOne({ shareLink })
      .populate('createdBy', 'username email')
      .populate('participants.user', 'username email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Create a clean session object with deduplicated participants
    // We don't save this back to DB - just for the response
    const sessionObj = session.toObject();
    
    // Completely new arrays for real and AI participants
    const realParticipants = [];
    const aiParticipants = [];
    
    // Deduplicate real participants
    const userIds = new Set();
    sessionObj.participants.forEach(p => {
      if (p.user && p.user._id) {
        const userId = p.user._id.toString();
        if (!userIds.has(userId)) {
          userIds.add(userId);
          realParticipants.push(p);
        }
      }
    });
    
    // Generate clean AI participants
    for (let i = 1; i <= sessionObj.aiParticipants; i++) {
      aiParticipants.push({
        userName: `AI Participant ${i}`,
        isAI: true,
        joinedAt: new Date()
      });
    }
    
    // Combine real and AI participants
    sessionObj.participants = [...realParticipants, ...aiParticipants];
    
    // Send clean data
    res.json(sessionObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join session
router.post('/join/:shareLink', auth, async (req, res) => {
  try {
    const { shareLink } = req.params;
    
    const session = await Session.findOne({ shareLink });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // First deduplicate existing participants
    deduplicateSessionParticipants(session);
    
    // Check if user already joined and remove if they exist
    const userIdStr = req.user.userId.toString();
    session.participants = session.participants.filter(p => 
      !p.user || p.user.toString() !== userIdStr
    );
    
    // Now add the user once
    session.participants.push({
      user: req.user.userId,
      joinedAt: new Date()
    });
    
    // Re-add AI participants cleanly
    ensureUniqueAIParticipants(session);
    
    await session.save();

    // Return populated session data
    const updatedSession = await Session.findById(session._id)
      .populate('createdBy', 'username email')
      .populate('participants.user', 'username email');

    res.json({ message: 'Joined session successfully', session: updatedSession });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start session
router.post('/:id/start', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // First deduplicate real participants completely
    deduplicateSessionParticipants(session);
    
    // Then ensure we have the right AI participants
    ensureUniqueAIParticipants(session);
    
    session.status = 'active';
    await session.save();
    
    // Return populated session data
    const updatedSession = await Session.findById(session._id)
      .populate('createdBy', 'username email')
      .populate('participants.user', 'username email');

    res.json({ message: 'Session started', session: updatedSession });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// End session
router.post('/:id/end', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    session.status = 'completed';
    await session.save();

    res.json({ message: 'Session ended', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get session by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching session with ID:', id);
    
    const session = await Session.findById(id)
      .populate('createdBy', 'username email')
      .populate('participants.user', 'username email');

    if (!session) {
      console.log('Session not found for ID:', id);
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Create a clean session object with deduplicated participants
    // We don't save this back to DB - just for the response
    const sessionObj = session.toObject();
    
    // Completely new arrays for real and AI participants
    const realParticipants = [];
    const aiParticipants = [];
    
    // Deduplicate real participants
    const userIds = new Set();
    sessionObj.participants.forEach(p => {
      if (p.user && p.user._id) {
        const userId = p.user._id.toString();
        if (!userIds.has(userId)) {
          userIds.add(userId);
          realParticipants.push(p);
        }
      }
    });
    
    // Generate clean AI participants based on aiParticipants count
    for (let i = 1; i <= sessionObj.aiParticipants; i++) {
      aiParticipants.push({
        userName: `AI Participant ${i}`,
        isAI: true,
        joinedAt: new Date()
      });
    }
    
    // Combine real and AI participants
    sessionObj.participants = [...realParticipants, ...aiParticipants];
    
    console.log('Session found:', session.title, 'with', sessionObj.participants.length, 'unique participants');
    res.json(sessionObj);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Utility route to fix existing sessions with duplicate participants
router.post('/:id/fix', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Fix the session by removing all duplicate participants
    deduplicateSessionParticipants(session);
    
    // Then ensure we have the right AI participants
    ensureUniqueAIParticipants(session);
    
    await session.save();
    
    // Return populated session data
    const updatedSession = await Session.findById(session._id)
      .populate('createdBy', 'username email')
      .populate('participants.user', 'username email');

    res.json({ message: 'Session fixed successfully', session: updatedSession });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

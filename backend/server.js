const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (for uploaded audio)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const analysisRoutes = require('./routes/analysis');
const audioRoutes = require('./routes/audio');
const testRoutes = require('./routes/test');
const aiBotsRoutes = require('./routes/aiBots');

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/test', testRoutes);
app.use('/api/ai-bots', aiBotsRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aigd')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Socket.io for real-time communication
const activeRooms = new Map();
const aiParticipants = new Map();
const aiService = require('./services/aiService');
const aiBotService = require('./services/aiBotService');
const Session = require('./models/Session');
const { updateSessionWithBotNames } = require('./utils/sessionHelpers');

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId, userName) => {
    console.log(`User ${userName} (${userId}) joining room ${roomId}`);
    socket.join(roomId);
    
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Set());
    }
    
    // Remove any existing entries for this user to avoid duplicates
    const existingParticipants = Array.from(activeRooms.get(roomId));
    const filteredParticipants = existingParticipants.filter(p => p.userId !== userId);
    
    // Add the new participant
    const newParticipant = { socketId: socket.id, userId, userName };
    filteredParticipants.push(newParticipant);
    
    activeRooms.set(roomId, new Set(filteredParticipants));
    
    // Notify others about the new user
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName });
    
    // Send current participants to all users in the room (including the new joiner)
    const participants = Array.from(activeRooms.get(roomId));
    console.log(`Room ${roomId} now has ${participants.length} participants`);
    io.to(roomId).emit('room-participants', participants);
  });

  socket.on('audio-message', async (data) => {
    console.log('🎙️ Audio message received from:', data.userName);
    console.log('📝 Audio message transcript:', data.transcript || '[No transcript]');
    console.log('🎵 Audio URL:', data.audioUrl);
    
    // Broadcast to all participants including sender
    io.to(data.roomId).emit('audio-message', data);
    
    // Add message to AI bot service with transcript for better context
    aiBotService.addMessageToSession(data.roomId, {
      sender: data.userName,
      content: data.transcript || '[Audio Message]',
      timestamp: Date.now(),
      isBot: false,
      isAudio: true
    });
    
    console.log('📨 Audio message broadcasted to room:', data.roomId);
    console.log('📝 Content stored for AI bots:', data.transcript || '[Audio Message]');
    
    // Trigger AI bot responses for audio messages
    try {
      const session = await Session.findById(data.roomId);
      if (session && session.aiParticipants > 0) {
        // Initialize bots if not already done
        let bots = aiBotService.getSessionBots(data.roomId);
        if (bots.length === 0) {
          bots = aiBotService.initializeBotsForSession(data.roomId, session.topic, session.type, session.aiParticipants);
          // Start periodic bot activity with socket.io instance
          aiBotService.startBotActivity(data.roomId, io);
          // Update session with actual bot names
          await updateSessionWithBotNames(data.roomId);
        }
        
        // Generate AI responses with a slight delay
        setTimeout(async () => {
          // Increase response rate to 95% to match text messages
          if (Math.random() < 0.95) {
            const availableBot = aiBotService.getAvailableBotForResponse(data.roomId);
            
            if (availableBot) {
              try {
                console.log('🤖 Generating AI response from bot:', availableBot.name);
                console.log('📝 AI bot will use transcript:', data.transcript || '[No transcript]');
                
                const aiResponse = await aiBotService.generateBotResponse(
                  data.roomId, 
                  availableBot.id, 
                  { 
                    trigger: 'audio_message',
                    audioMessage: true,
                    sender: data.userName,
                    transcript: data.transcript || null
                  }
                );
                
                console.log('✅ AI response generated:', aiResponse);
                
                const aiMessage = {
                  roomId: data.roomId,
                  userId: availableBot.id,
                  userName: availableBot.name,
                  content: aiResponse,
                  timestamp: new Date(),
                  isAI: true
                };
                
                io.to(data.roomId).emit('text-message', aiMessage);
            } catch (error) {
              console.error('AI bot response error:', error);
            }
          }
        }
        }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds (reduced from 2-5)
      }
    } catch (error) {
      console.error('Error triggering AI bot responses for audio:', error);
    }
  });

  socket.on('text-message', async (data) => {
    console.log('Text message received:', data);
    // Broadcast to all participants in the room (including sender)
    io.to(data.roomId).emit('text-message', data);
    
    // Add message to AI bot service
    aiBotService.addMessageToSession(data.roomId, {
      sender: data.userName,
      content: data.content,
      timestamp: Date.now(),
      isBot: false
    });
    
    // Trigger AI bot responses
    try {
      console.log('Looking up session:', data.roomId);
      const session = await Session.findById(data.roomId);
      if (session) {
        console.log('Session found:', session.title, 'AI participants:', session.aiParticipants);
        if (session.aiParticipants > 0) {
          // Initialize bots if not already done
          let bots = aiBotService.getSessionBots(data.roomId);
          console.log('Existing bots:', bots.length);
          if (bots.length === 0) {
            console.log('Initializing bots for session...');
            bots = aiBotService.initializeBotsForSession(data.roomId, session.topic, session.type, session.aiParticipants);
            // Start periodic bot activity with socket.io instance
            aiBotService.startBotActivity(data.roomId, io);
            // Update session with actual bot names
            await updateSessionWithBotNames(data.roomId);
          }
          
        // Generate AI responses with a slight delay
        setTimeout(async () => {
          console.log('🤖 Attempting to generate AI response...');
          // Increase response rate to 95% for better interaction
          if (Math.random() < 0.95) {
            console.log('🎯 Random check passed, looking for available bot...');
            const availableBot = aiBotService.getAvailableBotForResponse(data.roomId);
            
            if (availableBot) {
              console.log('✅ Found available bot:', availableBot.name);
              try {
                console.log('Generating response from bot:', availableBot.name);
                const aiResponse = await aiBotService.generateBotResponse(
                  data.roomId, 
                  availableBot.id, 
                  { 
                    trigger: 'user_message',
                    userMessage: data.content,
                    sender: data.userName
                  }
                );
                
                console.log('Bot response generated:', aiResponse);
                
                const aiMessage = {
                  roomId: data.roomId,
                  userId: availableBot.id,
                  userName: availableBot.name,
                  content: aiResponse,
                  timestamp: new Date(),
                  isAI: true
                };
                
                console.log('Emitting AI message to room:', data.roomId);
                io.to(data.roomId).emit('text-message', aiMessage);
              } catch (error) {
                console.error('AI bot response error:', error);
              }
            } else {
              console.log('❌ No available bot found');
            }
          } else {
            console.log('🎲 Random check failed, skipping AI response');
          }
        }, 500 + Math.random() * 1500); // Random delay between 0.5-2 seconds (reduced from 1-3)
        } else {
          console.log('No AI participants configured for this session');
        }
      } else {
        console.log('Session not found:', data.roomId);
      }
    } catch (error) {
      console.error('Error triggering AI bot responses:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from active rooms
    for (const [roomId, participants] of activeRooms.entries()) {
      const updatedParticipants = Array.from(participants).filter(p => p.socketId !== socket.id);
      if (updatedParticipants.length === 0) {
        activeRooms.delete(roomId);
      } else {
        activeRooms.set(roomId, new Set(updatedParticipants));
        io.to(roomId).emit('user-left', socket.id);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };

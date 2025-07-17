const aiService = require('./aiService');

class AIBotService {
  constructor() {
    this.activeSessions = new Map(); // sessionId -> session data
    this.activeTimeouts = new Map(); // sessionId -> array of timeout IDs
    this.botPersonalities = [
      {
        name: 'Alex',
        personality: 'analytical and detail-oriented',
        traits: ['logical', 'methodical', 'likes to ask clarifying questions'],
        interviewStyle: 'asks technical deep-dive questions',
        gdStyle: 'breaks down complex topics into manageable parts',
        specialties: ['problem-solving', 'data analysis', 'systematic thinking']
      },
      {
        name: 'Sam',
        personality: 'creative and enthusiastic',
        traits: ['innovative', 'energetic', 'thinks outside the box'],
        interviewStyle: 'explores creative problem-solving approaches',
        gdStyle: 'brings fresh perspectives and innovative ideas',
        specialties: ['creativity', 'innovation', 'brainstorming', 'design thinking']
      },
      {
        name: 'Jordan',
        personality: 'diplomatic and balanced',
        traits: ['mediator', 'consensus-builder', 'fair-minded'],
        interviewStyle: 'focuses on teamwork and collaboration scenarios',
        gdStyle: 'moderates discussions and finds common ground',
        specialties: ['communication', 'conflict resolution', 'team management']
      },
      {
        name: 'Taylor',
        personality: 'practical and results-focused',
        traits: ['goal-oriented', 'pragmatic', 'action-focused'],
        interviewStyle: 'emphasizes practical applications and outcomes',
        gdStyle: 'drives towards actionable solutions and decisions',
        specialties: ['project management', 'execution', 'strategic planning']
      },
      {
        name: 'Riley',
        personality: 'collaborative and supportive',
        traits: ['team-player', 'encouraging', 'builds on others\' ideas'],
        interviewStyle: 'explores interpersonal and soft skill scenarios',
        gdStyle: 'supports and amplifies others\' contributions',
        specialties: ['empathy', 'mentoring', 'team building', 'emotional intelligence']
      },
      {
        name: 'Morgan',
        personality: 'challenging and critical thinker',
        traits: ['devil\'s advocate', 'analytical', 'questions assumptions'],
        interviewStyle: 'poses challenging scenarios and edge cases',
        gdStyle: 'identifies potential issues and alternative viewpoints',
        specialties: ['critical thinking', 'risk assessment', 'quality assurance']
      }
    ];
    
    // Common interview and GD topics with contextual knowledge
    this.topicKnowledge = {
      'technology': {
        keywords: ['AI', 'software', 'development', 'programming', 'digital', 'automation', 'innovation'],
        insights: ['industry trends', 'technical challenges', 'future implications', 'best practices']
      },
      'leadership': {
        keywords: ['management', 'team', 'leadership', 'motivation', 'decision-making', 'delegation'],
        insights: ['leadership styles', 'team dynamics', 'conflict resolution', 'performance management']
      },
      'business': {
        keywords: ['strategy', 'market', 'customer', 'revenue', 'growth', 'competition', 'efficiency'],
        insights: ['market analysis', 'business models', 'competitive advantage', 'scalability']
      },
      'communication': {
        keywords: ['presentation', 'networking', 'collaboration', 'feedback', 'negotiation'],
        insights: ['communication styles', 'active listening', 'persuasion', 'cultural sensitivity']
      },
      'problem-solving': {
        keywords: ['analysis', 'solution', 'challenge', 'innovation', 'methodology', 'evaluation'],
        insights: ['structured approaches', 'creative thinking', 'root cause analysis', 'implementation']
      }
    };
  }

  // Helper method to identify topic category and provide contextual insights
  identifyTopicCategory(topic, recentMessages = []) {
    const topicLower = topic.toLowerCase();
    const messagesText = recentMessages.map(msg => msg.content).join(' ').toLowerCase();
    const combinedText = `${topicLower} ${messagesText}`;
    
    let bestMatch = null;
    let maxScore = 0;
    
    for (const [category, data] of Object.entries(this.topicKnowledge)) {
      const score = data.keywords.reduce((count, keyword) => {
        return count + (combinedText.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = { category, ...data };
      }
    }
    
    return bestMatch || { category: 'general', keywords: [], insights: [] };
  }

  // Generate contextually relevant prompts based on session type
  generateContextualPrompt(sessionType, topic, bot, context, recentMessages) {
    const topicCategory = this.identifyTopicCategory(topic, recentMessages);
    
    let basePrompt = `You are ${bot.name}, participating in a ${sessionType} about "${topic}".

Your personality: ${bot.personality}
Your key traits: ${bot.traits.join(', ')}
Your specialties: ${bot.specialties.join(', ')}`;

    // Add session-specific context
    if (sessionType === 'interview') {
      basePrompt += `\nYour interview style: ${bot.interviewStyle}
      
As an interview participant, you should:
- Ask insightful follow-up questions
- Share relevant professional experiences (hypothetical but realistic)
- Demonstrate knowledge in your specialty areas
- Show genuine interest in the candidate's responses
- Provide constructive feedback when appropriate`;
    } else if (sessionType === 'group-discussion') {
      basePrompt += `\nYour GD style: ${bot.gdStyle}
      
As a group discussion participant, you should:
- Build on others' ideas constructively
- Share different perspectives and viewpoints
- Ask thought-provoking questions
- Provide real-world examples or scenarios
- Help move the discussion forward
- Ensure all voices are heard`;
    }

    // Add topic-specific context
    if (topicCategory.category !== 'general') {
      basePrompt += `\n\nTopic category: ${topicCategory.category}
Relevant insights you can contribute: ${topicCategory.insights.join(', ')}`;
    }

    return basePrompt;
  }

  initializeBotsForSession(sessionId, topic, sessionType, numBots = 4) {
    if (this.activeSessions.has(sessionId)) {
      console.log(`Session ${sessionId} already has bots initialized`);
      return this.activeSessions.get(sessionId).bots;
    }

    // Select random bot personalities
    const selectedPersonalities = this.botPersonalities
      .sort(() => 0.5 - Math.random())
      .slice(0, numBots);

    const bots = selectedPersonalities.map((personality, index) => ({
      id: `bot-${sessionId}-${index}`,
      name: personality.name,
      personality: personality.personality,
      traits: personality.traits,
      interviewStyle: personality.interviewStyle,
      gdStyle: personality.gdStyle,
      specialties: personality.specialties,
      sessionId,
      topic,
      sessionType,
      messageHistory: [],
      lastActivity: 0 // Set to 0 so bots are immediately available
    }));

    const sessionData = {
      sessionId,
      topic,
      sessionType,
      bots,
      messageHistory: [],
      startTime: Date.now(),
      isActive: true
    };

    this.activeSessions.set(sessionId, sessionData);
    this.activeTimeouts.set(sessionId, []); // Initialize timeouts array
    console.log(`Initialized ${numBots} bots for session ${sessionId}`);
    return bots;
  }

  async generateBotResponse(sessionId, botId, context) {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const bot = sessionData.bots.find(b => b.id === botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found in session ${sessionId}`);
    }

    // Build context for the bot
    const recentMessages = sessionData.messageHistory.slice(-10); // Last 10 messages
    const topicCategory = this.identifyTopicCategory(sessionData.topic, recentMessages);
    
    // Generate contextual base prompt
    const basePrompt = this.generateContextualPrompt(
      sessionData.sessionType, 
      sessionData.topic, 
      bot, 
      context, 
      recentMessages
    );

    try {
      const prompt = `${basePrompt}

Recent conversation context:
${recentMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}

${context.transcript ? `\nLatest audio message: "${context.transcript}"` : ''}

Current situation: ${this.getContextualSituation(context, sessionData.sessionType)}

Instructions for your response:
- Stay focused on the topic: "${sessionData.topic}"
- Respond naturally as ${bot.name} with your personality: ${bot.personality}
- Keep response conversational and engaging (1-2 sentences maximum)
- Add genuine value to the discussion based on your specialties
- If responding to audio, acknowledge and build meaningfully on the content
- Use your ${sessionData.sessionType === 'interview' ? 'interview' : 'GD'} style: ${sessionData.sessionType === 'interview' ? bot.interviewStyle : bot.gdStyle}
- Avoid repetitive or generic responses
- Ask follow-up questions or provide insights when appropriate
- Don't dominate the conversation
- Use plain text only - no asterisks (*), markdown, or special formatting
- Write as if you're having a natural professional conversation
- Reference relevant ${topicCategory.category} concepts if applicable

Your response (plain text only):`;

      const response = await aiService.generateContentWithFallback(prompt);
      
      // Clean up any formatting that might have slipped through
      const cleanedResponse = response
        .replace(/\*([^*]+)\*/g, '$1') // Remove asterisks used for emphasis
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove double asterisks
        .replace(/\*/g, '') // Remove any remaining asterisks
        .replace(/#{1,6}\s/g, '') // Remove markdown headers
        .replace(/`([^`]+)`/g, '$1') // Remove backticks
        .trim();
      
      // Store the bot's response in message history
      const botMessage = {
        sender: bot.name,
        content: cleanedResponse,
        timestamp: Date.now(),
        isBot: true,
        botId: bot.id
      };

      sessionData.messageHistory.push(botMessage);
      bot.messageHistory.push(botMessage);
      bot.lastActivity = Date.now();

      return cleanedResponse;
    } catch (error) {
      console.error(`Failed to generate response for bot ${botId}:`, error);
      
      // Enhanced fallback responses based on personality and session type
      return this.generateFallbackResponse(bot, sessionData, context);
    }
  }

  // Helper method to describe the current conversation situation
  getContextualSituation(context, sessionType) {
    if (context.trigger === 'audio_message') {
      return `Someone just shared an audio message${context.transcript ? ' with the transcript provided' : ''}. Respond naturally and build on their contribution.`;
    } else if (context.trigger === 'periodic_activity') {
      return `The conversation needs a boost. Share a relevant insight, ask a thought-provoking question, or introduce a new perspective.`;
    } else if (sessionType === 'interview') {
      return `You are in an interview setting. Ask insightful questions, share professional insights, or provide constructive feedback.`;
    } else {
      return `You are in a group discussion. Build on ideas, share perspectives, or help move the conversation forward.`;
    }
  }

  // Enhanced fallback response generation
  generateFallbackResponse(bot, sessionData, context) {
    const { sessionType, topic } = sessionData;
    
    // Personality-based fallback responses for different session types
    const fallbacksByPersonality = {
      'analytical and detail-oriented': {
        'interview': [`I'd like to understand the methodology behind that approach. Can you walk me through your thought process?`],
        'group-discussion': [`Let's break this down systematically. What are the key components we should consider?`]
      },
      'creative and enthusiastic': {
        'interview': [`That's fascinating! Have you considered any alternative approaches to this challenge?`],
        'group-discussion': [`What if we approached this from a completely different angle? I'm thinking about...`]
      },
      'diplomatic and balanced': {
        'interview': [`I appreciate that perspective. How do you typically handle conflicting viewpoints in your work?`],
        'group-discussion': [`I can see merit in both sides of this. What do others think about finding a middle ground?`]
      },
      'practical and results-focused': {
        'interview': [`Let's focus on the practical implementation. What specific steps would you take to achieve this?`],
        'group-discussion': [`That's a good point. How can we translate this into actionable next steps?`]
      },
      'collaborative and supportive': {
        'interview': [`I really like how you approached that. Can you share more about your collaboration style?`],
        'group-discussion': [`Great insight! Building on what you said, I think we could also consider...`]
      },
      'challenging and critical thinker': {
        'interview': [`That's interesting. What potential challenges or risks do you see with this approach?`],
        'group-discussion': [`Before we move forward, shouldn't we consider the potential downsides of this direction?`]
      }
    };

    const responses = fallbacksByPersonality[bot.personality]?.[sessionType] || 
                     [`That's an interesting perspective on ${topic}. Can you elaborate further?`];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  addMessageToSession(sessionId, message) {
    const sessionData = this.activeSessions.get(sessionId);
    if (sessionData && sessionData.isActive) {
      sessionData.messageHistory.push(message);
    }
  }

  startBotActivity(sessionId, socketIo = null) {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      console.error(`Cannot start bot activity: Session ${sessionId} not found`);
      return;
    }

    // Store socket.io instance if provided
    if (socketIo) {
      sessionData.socketIo = socketIo;
    }

    // Set up periodic bot activity (every 15-30 seconds)
    sessionData.activityInterval = setInterval(async () => {
      const currentSessionData = this.activeSessions.get(sessionId);
      if (!currentSessionData || !currentSessionData.isActive) {
        clearInterval(sessionData.activityInterval);
        console.log(`Stopping periodic activity for session ${sessionId}`);
        return;
      }

      // Randomly select a bot to respond
      const activeBots = currentSessionData.bots.filter(bot => 
        Date.now() - bot.lastActivity > 15000 // Bot hasn't responded in last 15 seconds (reduced from 20)
      );

      if (activeBots.length > 0 && Math.random() < 0.15) { // 15% chance of bot activity (reduced from 30%)
        const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
        
        try {
          const response = await this.generateBotResponse(sessionId, randomBot.id, {
            trigger: 'periodic_activity',
            recentActivity: currentSessionData.messageHistory.slice(-5)
          });
          
          console.log(`Bot ${randomBot.name} generated periodic response: ${response}`);
          
          // Emit to socket clients if socket.io is available
          if (currentSessionData.socketIo) {
            const aiMessage = {
              roomId: sessionId,
              userId: randomBot.id,
              userName: randomBot.name,
              content: response,
              timestamp: new Date(),
              isAI: true
            };
            
            currentSessionData.socketIo.to(sessionId).emit('text-message', aiMessage);
          }
        } catch (error) {
          console.error(`Failed to generate periodic response for bot ${randomBot.id}:`, error);
        }
      }
    }, 30000 + Math.random() * 30000); // Random interval between 30-60 seconds (increased from 15-30)
  }

  // Helper method to add a timeout and track it
  addTimeout(sessionId, timeoutId) {
    const timeouts = this.activeTimeouts.get(sessionId);
    if (timeouts) {
      timeouts.push(timeoutId);
    }
  }

  // Helper method to clear all timeouts for a session
  clearAllTimeouts(sessionId) {
    const timeouts = this.activeTimeouts.get(sessionId);
    if (timeouts) {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
      timeouts.length = 0; // Clear the array
    }
  }

  stopBotActivity(sessionId) {
    const sessionData = this.activeSessions.get(sessionId);
    if (sessionData && sessionData.activityInterval) {
      clearInterval(sessionData.activityInterval);
      sessionData.activityInterval = null;
      sessionData.isActive = false;
      console.log(`Stopped bot activity for session ${sessionId}`);
    }
    
    // Clear all pending timeouts for this session
    this.clearAllTimeouts(sessionId);
  }

  endSession(sessionId) {
    const sessionData = this.activeSessions.get(sessionId);
    if (sessionData) {
      this.stopBotActivity(sessionId);
      this.activeSessions.delete(sessionId);
      this.activeTimeouts.delete(sessionId);
      console.log(`Ended session ${sessionId} and cleared all timers`);
    }
  }

  getSessionBots(sessionId) {
    const sessionData = this.activeSessions.get(sessionId);
    return sessionData ? sessionData.bots : [];
  }

  getSessionData(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  getAllActiveSessions() {
    return Array.from(this.activeSessions.keys());
  }

  // Debug method to check active timeouts
  getActiveTimeoutsCount(sessionId) {
    const timeouts = this.activeTimeouts.get(sessionId);
    return timeouts ? timeouts.length : 0;
  }

  // Debug method to get all sessions with active timeouts
  getSessionsWithActiveTimeouts() {
    const sessionsWithTimeouts = [];
    for (const [sessionId, timeouts] of this.activeTimeouts.entries()) {
      if (timeouts.length > 0) {
        sessionsWithTimeouts.push({
          sessionId,
          timeoutCount: timeouts.length,
          isActive: this.activeSessions.has(sessionId)
        });
      }
    }
    return sessionsWithTimeouts;
  }

  cleanupInactiveSessions() {
    const now = Date.now();
    const maxSessionDuration = 4 * 60 * 60 * 1000; // 4 hours

    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (now - sessionData.startTime > maxSessionDuration) {
        console.log(`Cleaning up inactive session: ${sessionId}`);
        this.endSession(sessionId);
      }
    }
  }

  // Get a bot that hasn't responded recently to avoid repetition
  getAvailableBotForResponse(sessionId) {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData || !sessionData.isActive) {
      console.log(`No active session data found for ${sessionId}`);
      return null;
    }

    const now = Date.now();
    const availableBots = sessionData.bots.filter(bot => {
      const timeSinceLastActivity = now - bot.lastActivity;
      console.log(`Bot ${bot.name}: last activity ${timeSinceLastActivity}ms ago`);
      return timeSinceLastActivity > 2000; // Reduced from 3000 to 2000 (2 seconds)
    });

    console.log(`Found ${availableBots.length} available bots out of ${sessionData.bots.length}`);

    if (availableBots.length === 0) {
      // If no bots are available, find the bot that has been inactive the longest
      const oldestBot = sessionData.bots.reduce((oldest, bot) => {
        return (bot.lastActivity < oldest.lastActivity) ? bot : oldest;
      });
      
      const timeSinceOldestActivity = now - oldestBot.lastActivity;
      console.log(`No available bots, using oldest: ${oldestBot.name} (${timeSinceOldestActivity}ms ago)`);
      return oldestBot;
    }

    // Return a random available bot
    const selectedBot = availableBots[Math.floor(Math.random() * availableBots.length)];
    console.log(`Selected bot: ${selectedBot.name}`);
    return selectedBot;
  }

  // Handle user messages - add to session context
  async handleUserMessage(sessionId, userMessage) {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add user message to session history
    sessionData.messageHistory.push({
      sender: userMessage.sender,
      content: userMessage.content,
      timestamp: userMessage.timestamp || Date.now(),
      isBot: false
    });

    // Trigger bot response based on message content and context
    const timeoutId = setTimeout(async () => {
      // Check if session is still active before proceeding
      if (!sessionData.isActive) {
        return;
      }
      
      if (Math.random() < 0.7) { // 70% chance of bot response
        const availableBot = this.getAvailableBotForResponse(sessionId);
        if (availableBot) {
          try {
            const response = await this.generateBotResponse(sessionId, availableBot.id, {
              trigger: 'user_message',
              userMessage: userMessage.content,
              sender: userMessage.sender
            });
            
            // If socket.io is available, emit the response
            if (sessionData.socketIo) {
              const aiMessage = {
                roomId: sessionId,
                userId: availableBot.id,
                userName: availableBot.name,
                content: response,
                timestamp: new Date(),
                isAI: true
              };
              
              sessionData.socketIo.to(sessionId).emit('text-message', aiMessage);
            }
          } catch (error) {
            console.error('Failed to generate bot response to user message:', error);
          }
        }
      }
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
    
    // Track this timeout so it can be cleared if session ends
    this.addTimeout(sessionId, timeoutId);
  }

  // Get session statistics
  getSessionStats(sessionId) {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      return null;
    }

    const totalMessages = sessionData.messageHistory.length;
    const botMessages = sessionData.messageHistory.filter(msg => msg.isBot).length;
    const userMessages = totalMessages - botMessages;
    
    const participantStats = {};
    sessionData.messageHistory.forEach(msg => {
      if (!participantStats[msg.sender]) {
        participantStats[msg.sender] = {
          messageCount: 0,
          isBot: msg.isBot || false
        };
      }
      participantStats[msg.sender].messageCount++;
    });

    return {
      sessionId,
      topic: sessionData.topic,
      sessionType: sessionData.sessionType,
      duration: Date.now() - sessionData.startTime,
      totalMessages,
      botMessages,
      userMessages,
      participantStats,
      activeBots: sessionData.bots.length,
      isActive: sessionData.isActive
    };
  }
}

// Create and export singleton instance
const aiBotService = new AIBotService();

// Set up periodic cleanup of inactive sessions
setInterval(() => {
  aiBotService.cleanupInactiveSessions();
}, 60 * 60 * 1000); // Every hour

module.exports = aiBotService;

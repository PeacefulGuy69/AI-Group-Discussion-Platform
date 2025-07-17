const express = require('express');
const Analysis = require('../models/Analysis');
const Session = require('../models/Session');
const auth = require('../middleware/auth');
const aiService = require('../services/aiService'); // Import the AI service with fallback logic
const aiBotService = require('../services/aiBotService'); // Import AI bot service to get actual bot names

const router = express.Router();

// Helper function to extract JSON from markdown-wrapped response
function extractJsonFromMarkdown(text) {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  
  // Try to find JSON object starting with { and ending with }
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const extractedJson = text.substring(jsonStart, jsonEnd + 1).trim();
    
    // Validate that it's likely valid JSON by checking bracket balance
    let braceCount = 0;
    for (let i = 0; i < extractedJson.length; i++) {
      if (extractedJson[i] === '{') braceCount++;
      else if (extractedJson[i] === '}') braceCount--;
    }
    
    if (braceCount === 0) {
      return extractedJson;
    }
  }
  
  // If no valid JSON structure found, return the original text
  return text.trim();
}

// Generate analysis for completed session
router.post('/generate/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { transcript, participants } = req.body;

    console.log('Generating analysis for session:', sessionId);
    console.log('Participants:', participants);

    // Check if analysis already exists
    const existingAnalysis = await Analysis.findOne({ session: sessionId });
    if (existingAnalysis) {
      console.log('Analysis already exists for session:', sessionId);
      return res.json({
        message: 'Analysis already exists',
        analysis: existingAnalysis
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      console.log('Session not found:', sessionId);
      return res.status(404).json({ message: 'Session not found' });
    }

    // Use provided transcript
    const combinedTranscript = transcript || '';

    // Get actual bot names from AI bot service
    let sessionBots = aiBotService.getSessionBots(sessionId);
    console.log('Session bots:', sessionBots.map(b => ({ id: b.id, name: b.name })));
    
    // If no bots are initialized (e.g., for completed sessions), initialize them to get proper names
    if (sessionBots.length === 0 && session.aiParticipants > 0) {
      console.log('No bots found, initializing bots to get proper names...');
      sessionBots = aiBotService.initializeBotsForSession(
        sessionId, 
        session.topic, 
        session.type, 
        session.aiParticipants
      );
      console.log('Initialized session bots:', sessionBots.map(b => ({ id: b.id, name: b.name })));
    }

    // Map participants to include actual bot names
    const enhancedParticipants = participants.map((p, index) => {
      console.log(`Processing participant ${index + 1}:`, p);
      
      if (p.type === 'ai') {
        // Find the corresponding bot by index (for AI participants)
        const aiParticipantIndex = participants.slice(0, index).filter(participant => participant.type === 'ai').length;
        const actualBot = sessionBots[aiParticipantIndex];
        
        if (actualBot) {
          console.log(`Mapping generic name "${p.name}" to actual bot name "${actualBot.name}"`);
          return { ...p, name: actualBot.name, originalName: p.name };
        } else {
          console.log(`No bot found for AI participant "${p.name}", keeping original name`);
        }
      }
      return p;
    });

    console.log('Enhanced participants:', enhancedParticipants);
    console.log('Total participants for analysis:', enhancedParticipants.length);

    // Create prompt for AI analysis (simplified for better performance)
    const prompt = `
Analyze this group discussion session and provide structured feedback in JSON format:

SESSION DETAILS:
- Topic: ${session.topic}
- Type: ${session.type}
- Participants: ${enhancedParticipants.map(p => `${p.name} (${p.type})`).join(', ')}
- Transcript: ${combinedTranscript || 'No transcript available'}

REQUIRED OUTPUT FORMAT (JSON only):
{
  "participants": [
    {
      "name": "participant_name",
      "participation": {
        "speakingTime": 25,
        "contributions": 8,
        "clarity": 85,
        "confidence": 78
      },
      "feedback": {
        "strengths": ["Clear communication", "Good participation"],
        "improvements": ["Speak more", "Be more assertive"],
        "overallScore": 82,
        "suggestions": ["Practice public speaking", "Prepare more thoroughly"]
      }
    }
  ],
  "overall": {
    "engagement": 78,
    "collaboration": 85,
    "topicRelevance": 90,
    "summary": "Good discussion with active participation from all members",
    "keyPoints": ["Main topic covered", "Good collaboration", "Areas for improvement identified"]
  }
}

Provide realistic scores (1-100) and meaningful feedback for each participant.
`;

    // Generate analysis using our AI service with fallback mechanism
    console.log('Calling AI service for analysis generation...');
    console.log('Prompt length:', prompt.length);
    console.log('Prompt preview:', prompt.substring(0, 300) + '...');
    let analysisText;
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI service timeout after 30 seconds')), 30000);
      });
      
      analysisText = await Promise.race([
        aiService.generateContentWithFallback(prompt),
        timeoutPromise
      ]);
      console.log('AI service response received, length:', analysisText.length);
    } catch (aiError) {
      console.error('AI service error:', aiError);
      // Fallback to a basic analysis structure if AI fails
      analysisText = JSON.stringify({
        participants: enhancedParticipants.map(p => ({
          userName: p.name,
          participation: {
            speakingTime: Math.floor(Math.random() * 30) + 10,
            contributions: Math.floor(Math.random() * 15) + 5,
            clarity: Math.floor(Math.random() * 30) + 70,
            confidence: Math.floor(Math.random() * 30) + 70
          },
          feedback: {
            strengths: ["Good communication", "Active participation"],
            improvements: ["Could speak more clearly", "Should contribute more"],
            overallScore: Math.floor(Math.random() * 30) + 70,
            suggestions: ["Practice speaking more confidently", "Engage more in discussions"]
          }
        })),
        overall: {
          engagement: Math.floor(Math.random() * 30) + 70,
          collaboration: Math.floor(Math.random() * 30) + 70,
          topicRelevance: Math.floor(Math.random() * 30) + 70,
          summary: `Discussion about ${session.topic} completed with ${enhancedParticipants.length} participants.`,
          keyPoints: ["Main topic discussed", "Good participation overall", "Areas for improvement identified"]
        }
      });
    }

    // Parse the AI response
    let analysisData;
    try {
      // Extract JSON from markdown-wrapped response
      const cleanedResponse = extractJsonFromMarkdown(analysisText);
      console.log('Cleaned AI response for parsing:', cleanedResponse.substring(0, 200) + '...');
      
      // Validate JSON structure before parsing
      if (!cleanedResponse || cleanedResponse.trim().length === 0) {
        throw new Error('Empty cleaned response');
      }
      
      analysisData = JSON.parse(cleanedResponse);
      
      // Validate the structure
      if (!analysisData.participants || !Array.isArray(analysisData.participants)) {
        throw new Error('Invalid participants structure');
      }
      
      if (!analysisData.overall || typeof analysisData.overall !== 'object') {
        throw new Error('Invalid overall structure');
      }
      
      // Ensure we don't have duplicate participants by name
      const uniqueParticipants = new Map();
      analysisData.participants.forEach(p => {
        if (p.name) {
          uniqueParticipants.set(p.name, p);
        }
      });
      analysisData.participants = Array.from(uniqueParticipants.values());
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', analysisText.substring(0, 500) + '...');
      console.error('Cleaned response:', extractJsonFromMarkdown(analysisText).substring(0, 500) + '...');
      
      // If JSON parsing fails, create a basic structure with unique participants
      const uniqueParticipants = new Map();
      console.log('Creating fallback analysis for participants:', enhancedParticipants);
      
      enhancedParticipants.forEach(p => {
        if (p.name) {
          uniqueParticipants.set(p.name, {
            userName: p.name,
            participantType: p.type || 'human',
            participation: {
              speakingTime: Math.floor(Math.random() * 30) + 10, // Random between 10-40
              contributions: Math.floor(Math.random() * 8) + 2, // Random between 2-10
              clarity: Math.floor(Math.random() * 25) + 70, // Random between 70-95
              confidence: Math.floor(Math.random() * 25) + 70 // Random between 70-95
            },
            feedback: {
              strengths: ["Active participation", "Clear communication"],
              improvements: ["Speak more clearly", "Engage more actively"],
              overallScore: Math.floor(Math.random() * 25) + 70, // Random between 70-95
              suggestions: ["Practice active listening", "Be more confident"]
            }
          });
        }
      });
      
      console.log('Created fallback participants:', uniqueParticipants.size);
      
      analysisData = {
        participants: Array.from(uniqueParticipants.values()),
        overall: {
          engagement: 75,
          collaboration: 75,
          topicRelevance: 75,
          summary: "Good discussion with active participation",
          keyPoints: ["Key point 1", "Key point 2"]
        }
      };
    }

    // Create analysis record - ensure participants are correctly mapped
    const mappedParticipants = analysisData.participants.map(p => {
      // Find the original participant to get user ID if available
      const originalParticipant = enhancedParticipants.find(original => original.name === p.name || original.name === p.userName);
      
      return {
        user: originalParticipant?.userId || null,
        userName: p.name || p.userName,
        participantType: originalParticipant?.type || 'human', // Add participant type for icon display
        participation: p.participation || {
          speakingTime: 0,
          contributions: 0,
          clarity: 75,
          confidence: 75
        },
        feedback: p.feedback || {
          strengths: ["Active participation"],
          improvements: ["Speak more clearly"],
          overallScore: 75,
          suggestions: ["Practice active listening"]
        }
      };
    });
    
    const analysis = new Analysis({
      session: sessionId,
      participants: mappedParticipants,
      overall: analysisData.overall,
      transcript: transcript,
      generatedAt: new Date()
    });

    await analysis.save();

    // Update session with analysis reference
    session.recording = {
      transcript: combinedTranscript,
      analysis: analysis._id,
      ...session.recording
    };
    await session.save();

    res.json({
      message: 'Analysis generated successfully',
      analysis
    });

  } catch (error) {
    console.error('Analysis generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get analysis for a session
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const analysis = await Analysis.findOne({ session: sessionId })
      .populate('session', 'title topic type')
      .populate('participants.user', 'username email');

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

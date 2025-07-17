const express = require('express');
const aiService = require('../services/aiService');

const router = express.Router();

// Test AI service connection and functionality
router.get('/ai', async (req, res) => {
  try {
    console.log('Testing AI service...');
    
    // Test 1: Simple AI response generation
    const testTopic = 'The impact of technology on modern workplace';
    const testContext = { 
      type: 'group-discussion', 
      discussion: 'Let\'s discuss how technology is changing the way we work' 
    };
    
    const aiResponse = await aiService.generateAIResponse(testTopic, testContext, 'AI Bot');
    
    // Test 2: Topic generation
    const generatedTopics = await aiService.generateDiscussionTopics('group-discussion');
    
    // Test 3: Interview questions
    const interviewQuestions = await aiService.generateInterviewQuestions('Software Engineer', 'mid-level');
    
    res.json({
      success: true,
      message: 'AI service is working correctly!',
      tests: {
        aiResponse: {
          topic: testTopic,
          response: aiResponse,
          length: aiResponse.length
        },
        topicGeneration: {
          count: generatedTopics.length,
          topics: generatedTopics.slice(0, 3) // Show first 3 topics
        },
        interviewQuestions: {
          count: interviewQuestions.length,
          sampleQuestions: interviewQuestions.slice(0, 3) // Show first 3 questions
        }
      },
      currentModel: aiService.workingModel,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI service test failed:', error);
    res.status(500).json({
      success: false,
      message: 'AI service test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test AI response with custom prompt
router.post('/ai/custom', async (req, res) => {
  try {
    const { topic, context, participantName } = req.body;
    
    if (!topic || !context || !participantName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: topic, context, participantName'
      });
    }
    
    console.log('Testing AI with custom prompt...');
    
    const aiResponse = await aiService.generateAIResponse(topic, context, participantName);
    
    res.json({
      success: true,
      message: 'AI response generated successfully',
      result: {
        topic,
        context,
        participantName,
        response: aiResponse,
        length: aiResponse.length
      },
      currentModel: aiService.workingModel,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Custom AI test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Custom AI test failed',
      error: error.message
    });
  }
});

// Test model availability
router.get('/ai/models', async (req, res) => {
  try {
    console.log('Testing AI model availability...');
    
    // Test the current working model
    const testPrompt = 'Hello, are you available?';
    const response = await aiService.generateContentWithFallback(testPrompt);
    
    res.json({
      success: true,
      message: 'AI model test completed',
      currentModel: aiService.workingModel,
      testResponse: response,
      availableModels: aiService.modelConfigs.map(m => m.name),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI model test failed:', error);
    res.status(500).json({
      success: false,
      message: 'AI model test failed',
      error: error.message,
      currentModel: aiService.workingModel
    });
  }
});

module.exports = router;

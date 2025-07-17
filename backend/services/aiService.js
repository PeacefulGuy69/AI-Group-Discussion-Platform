const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    return text.substring(jsonStart, jsonEnd + 1).trim();
  }
  
  // If no JSON structure found, return the original text
  return text.trim();
}

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.workingModel = null;
    this.modelHierarchy = [
  // Latest Gemini 2.5 models (highest priority)
  'gemini-2.5-flash',                   // Latest stable 2.5 flash model
  'gemini-2.5-pro',                     // Latest 2.5 pro model for complex tasks
  'gemini-2.5-flash-lite-preview-06-17', // Latest lite preview
  
  // Latest Gemini 2.0 models
  'gemini-2.0-flash',                   // Latest 2.0 flash model
  'gemini-2.0-flash-001',               // Latest 2.0 flash version
  'gemini-2.0-flash-lite',              // Latest 2.0 lite model
  'gemini-2.0-flash-lite-001',          // Latest 2.0 lite version
  
  // Latest Gemini 1.5 models (fallback)
  'gemini-1.5-flash',                   // Latest 1.5 flash model
  'gemini-1.5-flash-8b-latest',         // Latest 1.5 8b model
  'gemini-1.5-flash-8b',                // 1.5 8b baseline
];
    
    this.initializeAI();
  }

  initializeAI() {
    if (!this.apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      console.log('Google Generative AI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Generative AI:', error);
    }
  }

  async findWorkingModel() {
    if (!this.genAI) {
      throw new Error('AI service not initialized');
    }

    // If we already have a working model, return it
    if (this.workingModel) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.workingModel });
        return model;
      } catch (error) {
        console.log(`Previous working model ${this.workingModel} failed, finding new one...`);
        this.workingModel = null;
      }
    }

    for (const modelName of this.modelHierarchy) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        
        // Test the model with a simple prompt
        const testPrompt = 'Say "Hello" in one word.';
        const result = await model.generateContent(testPrompt);
        const response = await result.response;
        const text = response.text();
        
        if (text && text.trim().length > 0) {
          this.workingModel = modelName;
          console.log(`Working model found: ${modelName}`);
          return model;
        }
      } catch (error) {
        // Only log if we're debugging
        // console.log(`Model ${modelName} failed, trying next...`);
        continue;
      }
    }
    
    throw new Error('No working Gemini model found');
  }

  async generateContentWithFallback(prompt, maxRetries = 3) {
    if (!this.genAI) {
      throw new Error('AI service not initialized');
    }

    let model;
    try {
      model = await this.findWorkingModel();
    } catch (error) {
      console.error('Failed to find working model:', error);
      throw error;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Only log first attempt to reduce console noise
        if (attempt === 1) {
          console.log(`AI generating response using model: ${this.workingModel}`);
        }
        
        // Add timeout to the generate request
        const generatePromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Generate content timeout')), 25000);
        });
        
        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();
        
        if (text && text.trim().length > 0) {
          // Only log success on first attempt or after retries
          if (attempt === 1) {
            console.log('AI response generated successfully');
          } else {
            console.log(`AI response generated on attempt ${attempt}`);
          }
          return text.trim();
        } else {
          throw new Error('Empty response from AI model');
        }
      } catch (error) {
        console.error(`AI generation attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to generate content after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async generateAIResponse(topic, context, botName) {
    const sessionType = context.type || 'group-discussion';
    const isInterview = sessionType.includes('interview');
    
    const prompt = `
You are ${botName}, an AI participant in a ${sessionType}.

Topic: ${topic}
Context: ${JSON.stringify(context)}

${isInterview ? 
  `As an interview participant, you should:
- Ask insightful, relevant questions about the topic
- Share professional experiences and examples
- Demonstrate knowledge and expertise
- Show genuine interest in the conversation
- Provide constructive feedback when appropriate
- Be engaging and professional` 
  : 
  `As a group discussion participant, you should:
- Build on others' ideas constructively
- Share different perspectives and viewpoints
- Ask thought-provoking questions
- Provide real-world examples or scenarios
- Help move the discussion forward
- Ensure balanced participation`
}

Generate a response that:
- Is conversational and engaging
- Directly relevant to the topic "${topic}"
- Shows expertise and insight
- Is 2-3 sentences maximum
- Has a natural, professional tone
- Asks follow-up questions or provides insights when appropriate
- Avoids generic or repetitive responses

Your response:
`;

    try {
      const response = await this.generateContentWithFallback(prompt);
      return response;
    } catch (error) {
      console.error('Failed to generate AI response:', error);
      
      // Enhanced fallback responses
      const fallbacks = isInterview ? [
        `I'd like to explore this topic further. What specific aspects of ${topic} are most important to you?`,
        `That's a great question about ${topic}. Can you share your approach to this?`,
        `I'm curious about your experience with ${topic}. What challenges have you encountered?`
      ] : [
        `I think ${topic} is fascinating. What perspectives do others bring to this?`,
        `Building on this discussion about ${topic}, I wonder if we've considered...`,
        `This is an important topic. How do you think ${topic} will evolve in the future?`
      ];
      
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  }

  async generateAudioResponse(topic, context, botName) {
    const sessionType = context.type || 'group-discussion';
    const isInterview = sessionType.includes('interview');
    
    const prompt = `
You are ${botName}, an AI participant in a ${sessionType}.

Topic: ${topic}
Context: ${JSON.stringify(context)}

Someone just shared an audio message. You need to respond naturally and professionally.

${isInterview ? 
  `As an interview participant responding to audio:
- Acknowledge the speaker's points respectfully
- Ask clarifying questions about their experience
- Share relevant professional insights
- Demonstrate active listening
- Provide constructive feedback
- Keep the conversation flowing professionally` 
  : 
  `As a group discussion participant responding to audio:
- Build on the speaker's ideas constructively
- Add your perspective or alternative viewpoint
- Ask follow-up questions to deepen the discussion
- Reference specific points they made
- Keep the group dynamic engaging
- Encourage further participation`
}

Generate a response that:
- Acknowledges the audio message appropriately
- Is conversational and engaging
- Directly relevant to the topic "${topic}"
- Shows you were actively listening
- Is 2-3 sentences maximum
- Has a natural, professional tone
- Moves the conversation forward constructively

Your response:
`;

    try {
      const response = await this.generateContentWithFallback(prompt);
      return response;
    } catch (error) {
      console.error('Failed to generate AI audio response:', error);
      
      // Enhanced fallback responses
      const fallbacks = isInterview ? [
        `Thank you for sharing that insight about ${topic}. I'd love to hear more about your experience with this.`,
        `That's a valuable perspective on ${topic}. How did you develop that approach?`,
        `I appreciate you bringing up those points about ${topic}. What results have you seen?`
      ] : [
        `That's a great point about ${topic}. I think we should also consider...`,
        `Thanks for sharing that perspective on ${topic}. What do others think about this approach?`,
        `I found your comments about ${topic} really insightful. Building on that idea...`
      ];
      
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  }

  async generateDiscussionTopics(type = 'group-discussion', count = 10) {
    const prompt = `
Generate ${count} engaging ${type} topics that are:
- Relevant to current industry trends and professional development
- Suitable for meaningful professional discussions
- Thought-provoking and engaging for participants
- Balanced between technical and soft skills
- Appropriate for practicing communication skills
- Cover diverse areas like technology, leadership, innovation, teamwork, problem-solving

Include topics that encourage:
- Different perspectives and viewpoints
- Real-world application and examples
- Critical thinking and analysis
- Collaborative problem-solving
- Professional growth insights

Return only the topics, one per line, without numbers or bullets.
Make them specific enough to generate substantive discussion but broad enough for diverse participation.
`;

    try {
      const response = await this.generateContentWithFallback(prompt);
      return response.split('\n').filter(topic => topic.trim().length > 0).slice(0, count);
    } catch (error) {
      console.error('Failed to generate discussion topics:', error);
      // Enhanced fallback topics
      return [
        'The impact of artificial intelligence on the future of work and skill requirements',
        'Balancing innovation with sustainability in technology development',
        'Remote work vs hybrid models: Creating effective team collaboration',
        'Leadership in the digital age: Adapting management styles for modern teams',
        'Building inclusive workplaces: Strategies for diversity and belonging',
        'The role of continuous learning in career advancement',
        'Ethical considerations in data privacy and technology use',
        'Effective communication strategies in multicultural teams',
        'The future of education and professional development',
        'Innovation in healthcare technology: Opportunities and challenges',
        'Sustainable business practices and environmental responsibility',
        'The evolution of customer experience in digital transformation',
        'Cybersecurity awareness: Individual and organizational responsibility',
        'Entrepreneurship and startup culture: Lessons from success and failure',
        'Mental health and well-being in high-pressure work environments'
      ].slice(0, count);
    }
  }

  async generateInterviewQuestions(jobRole, level = 'mid-level', count = 10) {
    const prompt = `
Generate ${count} comprehensive interview questions for a ${level} ${jobRole} position.

Include a balanced mix of:
- Technical questions (30%): Role-specific technical knowledge and skills
- Behavioral questions (40%): Past experiences, soft skills, and situational responses
- Situational questions (20%): Hypothetical scenarios and problem-solving
- Culture fit questions (10%): Values, motivation, and team collaboration

Questions should be:
- Appropriate for ${level} level (adjust complexity accordingly)
- Relevant to ${jobRole} responsibilities
- Open-ended to encourage detailed responses
- Designed to assess both technical competence and soft skills
- Professional and engaging

For ${level} level, ensure questions match these expectations:
- Entry-level: Focus on fundamentals, learning ability, and potential
- Mid-level: Balance of technical depth and leadership/collaboration skills
- Senior-level: Strategic thinking, mentoring, and complex problem-solving

Return only the questions, one per line, without numbers or bullets.
`;

    try {
      const response = await this.generateContentWithFallback(prompt);
      return response.split('\n').filter(question => question.trim().length > 0).slice(0, count);
    } catch (error) {
      console.error('Failed to generate interview questions:', error);
      // Enhanced fallback questions based on level and role
      const baseQuestions = [
        'Tell me about yourself and what draws you to this role',
        'Describe a challenging project you worked on and how you handled it',
        'How do you approach problem-solving when faced with a complex issue?',
        'Tell me about a time when you had to learn something new quickly',
        'How do you handle constructive feedback and criticism?',
        'Describe your experience working in a team environment',
        'What motivates you in your professional work?',
        'How do you prioritize tasks when managing multiple deadlines?',
        'Tell me about a time when you had to adapt to significant change',
        'What are your career goals and how does this role align with them?'
      ];
      
      const levelSpecificQuestions = {
        'entry-level': [
          'What interests you most about starting your career in this field?',
          'How do you stay updated with industry trends and developments?',
          'Describe a time when you overcame a significant learning challenge',
          'What skills do you hope to develop in your first year?'
        ],
        'mid-level': [
          'How do you mentor or guide junior team members?',
          'Describe a time when you had to make a difficult decision with limited information',
          'How do you balance technical excellence with business requirements?',
          'Tell me about a time when you had to influence others without authority'
        ],
        'senior-level': [
          'How do you approach strategic planning and long-term vision?',
          'Describe your experience leading cross-functional teams',
          'How do you handle conflicts between team members or stakeholders?',
          'What is your approach to building and scaling technical teams?'
        ]
      };
      
      const specificQuestions = levelSpecificQuestions[level] || [];
      return [...baseQuestions, ...specificQuestions].slice(0, count);
    }
  }

  async generateSessionAnalysis(sessionData) {
    const prompt = `
Analyze this session and provide detailed insights:

Session Data: ${JSON.stringify(sessionData)}

Provide analysis including:
- Participation patterns
- Communication effectiveness
- Areas for improvement
- Overall session quality
- Specific recommendations

Return as structured JSON.
`;

    try {
      const response = await this.generateContentWithFallback(prompt);
      // Extract JSON from markdown-wrapped response
      const cleanedResponse = extractJsonFromMarkdown(response);
      console.log('Cleaned AI response for session analysis:', cleanedResponse.substring(0, 200) + '...');
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to generate session analysis:', error);
      // Additional error logging for debugging
      if (error.name === 'SyntaxError') {
        console.error('JSON parsing error occurred during session analysis');
      }
      // Fallback analysis
      return {
        overall: {
          engagement: 75,
          collaboration: 70,
          topicRelevance: 80,
          summary: 'Good session with active participation',
          keyPoints: ['Active discussion', 'Good engagement', 'Areas for improvement identified']
        },
        participants: [],
        recommendations: ['Continue practicing', 'Focus on clarity', 'Encourage more participation']
      };
    }
  }
}

// Create and export singleton instance
const aiService = new AIService();
module.exports = aiService;

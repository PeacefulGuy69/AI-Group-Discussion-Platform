const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    participantType: {
      type: String,
      enum: ['human', 'ai'],
      default: 'human'
    },
    participation: {
      speakingTime: Number, // in seconds
      contributions: Number,
      interruptions: Number,
      positiveLanguage: Number, // score out of 100
      clarity: Number, // score out of 100
      confidence: Number // score out of 100
    },
    feedback: {
      strengths: [String],
      improvements: [String],
      overallScore: Number, // out of 100
      suggestions: [String]
    }
  }],
  overall: {
    engagement: Number, // score out of 100
    collaboration: Number, // score out of 100
    topicRelevance: Number, // score out of 100
    summary: String,
    keyPoints: [String]
  },
  transcript: String,
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Analysis', analysisSchema);

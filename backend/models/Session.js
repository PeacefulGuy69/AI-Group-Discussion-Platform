const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  type: {
    type: String,
    enum: ['group-discussion', 'interview'],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 6
  },
  aiParticipants: {
    type: Number,
    default: 2
  },
  realParticipants: {
    type: Number,
    default: 2
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: {
      type: String
    },
    isAI: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  shareLink: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  recording: {
    transcript: String,
    audioUrl: String,
    audioFiles: [{
      filename: String,
      url: String,
      userId: String,
      timestamp: Date
    }],
    analysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}.webm`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Upload audio file
router.post('/upload', auth, upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const audioUrl = `http://localhost:${process.env.PORT || 5000}/api/audio/file/${req.file.filename}`;
    
    res.json({
      message: 'Audio uploaded successfully',
      audioUrl: audioUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ message: 'Failed to upload audio', error: error.message });
  }
});

// Serve audio files
router.get('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/audio', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Audio file not found' });
    }
    
    // Set appropriate headers for audio files
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Audio file serve error:', error);
    res.status(500).json({ message: 'Failed to serve audio file' });
  }
});

// Transcribe audio file
router.post('/transcribe', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    // For now, we'll use a simple placeholder transcription
    // In a real implementation, you would use Google Speech-to-Text API or similar
    const transcript = 'Audio transcription not yet implemented. Please use Web Speech API on frontend.';
    
    // Clean up the uploaded file since we don't need to keep it for transcription
    const filePath = path.join(__dirname, '../uploads/audio', req.file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({
      message: 'Audio transcribed successfully',
      transcript: transcript
    });
  } catch (error) {
    console.error('Audio transcription error:', error);
    res.status(500).json({ message: 'Failed to transcribe audio', error: error.message });
  }
});

// Delete audio file
router.delete('/file/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/audio', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Audio file deleted successfully' });
    } else {
      res.status(404).json({ message: 'Audio file not found' });
    }
  } catch (error) {
    console.error('Audio file deletion error:', error);
    res.status(500).json({ message: 'Failed to delete audio file' });
  }
});

module.exports = router;

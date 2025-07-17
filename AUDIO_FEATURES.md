# Audio Feature Documentation

## Overview
The AI-Powered Group Discussion Platform now supports full audio functionality including recording, uploading, and playing audio messages in real-time during sessions.

## Features Implemented

### 1. Audio Recording
- **Web Audio API Integration**: Uses MediaRecorder API for high-quality audio recording
- **Browser Support**: Compatible with modern browsers (Chrome, Firefox, Safari, Edge)
- **Audio Format**: Records in WebM format with Opus codec for optimal quality and compression
- **Audio Enhancement**: Includes echo cancellation and noise suppression

### 2. Audio Upload & Storage
- **File Upload**: Secure multipart form upload with authentication
- **File Storage**: Server-side storage in `/backend/uploads/audio/` directory
- **File Naming**: UUID-based naming to prevent conflicts
- **File Limits**: 10MB maximum file size
- **File Types**: Supports audio/* MIME types

### 3. Audio Playback
- **Custom Audio Player**: React component with play/pause controls
- **Progress Bar**: Visual progress indicator with seek functionality
- **Time Display**: Shows current time and total duration
- **Visual Feedback**: Different styling for own vs. other participants' audio

### 4. Real-time Communication
- **Socket.io Integration**: Real-time audio message broadcasting
- **Message Types**: Support for both text and audio message types
- **Audio URLs**: Secure audio file serving with authentication

## API Endpoints

### Audio Upload
```
POST /api/audio/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'audio' field containing audio blob
```

### Audio File Access
```
GET /api/audio/file/:filename
```

### Audio File Deletion
```
DELETE /api/audio/file/:filename
Authorization: Bearer <token>
```

## Frontend Components

### useAudioRecording Hook
- Handles microphone permissions
- Manages recording state
- Provides audio blob for upload
- Error handling for recording issues

### AudioPlayer Component
- Displays audio waveform placeholder
- Play/pause functionality
- Progress bar with seek capability
- Time display and duration

### AudioService
- Handles API calls for audio upload
- Provides audio URL generation
- Manages audio file deletion

## Socket Events

### Client to Server
- `audio-message`: Send audio message with metadata

### Server to Client
- `audio-message`: Receive audio message from other participants

## Usage Flow

1. **Recording**: User clicks record button → requests microphone permission → starts recording
2. **Stop Recording**: User clicks stop → MediaRecorder stops → audio blob created
3. **Upload**: Audio blob automatically uploaded to server → receives audio URL
4. **Broadcast**: Audio message sent via Socket.io to all participants
5. **Playback**: Recipients see audio player component → can play/pause audio

## Security Features

- **Authentication**: All audio uploads require valid JWT token
- **File Validation**: Server validates file types and sizes
- **Secure Storage**: Audio files stored in protected server directory
- **Access Control**: Only authenticated users can access audio files

## Browser Permissions

Users must grant microphone permission for audio recording functionality. The app gracefully handles permission denial with appropriate error messages.

## File Structure

```
backend/
├── routes/audio.js          # Audio API routes
├── uploads/audio/           # Audio file storage
│   ├── .gitignore          # Ignore audio files in git
│   └── .gitkeep           # Keep directory in git
└── models/Session.js       # Updated with audio support

frontend/
├── hooks/useAudioRecording.ts    # Audio recording hook
├── services/audioService.ts      # Audio API service
├── components/
│   ├── AudioPlayer.tsx          # Audio playback component
│   └── AudioPlayer.css          # Audio player styles
└── pages/SessionRoom.tsx        # Updated with audio features
```

## Environment Variables

No additional environment variables required. Audio files are stored locally on the server.

## Future Enhancements

- [ ] Audio transcription for better accessibility
- [ ] Audio compression for bandwidth optimization
- [ ] Multiple audio format support
- [ ] Audio message encryption
- [ ] Voice activity detection
- [ ] Audio quality indicators
- [ ] Background noise reduction
- [ ] Audio message editing/deletion

# AI-Powered Group Discussion Platform

A comprehensive platform that allows users to practice group discussions and interview simulations using a combination of real participants and AI-powered bots.

## Features

- **🤖 AI Participants**: Practice with intelligent AI bots powered by Google Gemini 2.5 Pro
- **👥 Real Participants**: Connect with real people for authentic discussion experience
- **🎯 Personalized Analysis**: Get detailed feedback on your performance and improvement areas
- **🔗 Easy Sharing**: Share session links with participants for easy access
- **📊 Performance Tracking**: Track your progress over time with detailed analytics
- **🎙️ Audio Support**: Natural voice-based interactions for realistic experience
- **💬 Real-time Chat**: Text-based communication during sessions
- ** User Authentication**: Secure login and registration system

## Technology Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **AI**: Google Gemini 2.5 Pro API
- **Real-time**: Socket.io for real-time communication
- **Authentication**: JWT tokens
- **Styling**: Custom CSS with responsive design

## Project Structure

```
AIGD/
├── backend/                 # Node.js Express server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   ├── services/           # AI service integration
│   └── server.js           # Main server file
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── App.tsx         # Main app component
│   └── public/             # Static assets
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Git

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aigd
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=AIzaSyBYHL_oZMqp-92oe4pELFr1DcVA08ATdOg
```

4. Start the development server:
```bash
npm run dev
```

The backend will be running on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be running on `http://localhost:3000`

## Usage

### Creating a Session

1. **Register/Login**: Create an account or login to existing account
2. **Create Session**: Click "Create Session" and fill in the details:
   - Session title and description
   - Session type (Group Discussion or Interview)
   - Topic selection
   - Scheduled time
   - Participant configuration (AI + Real participants)
3. **Share Link**: Copy the generated link to share with participants
4. **Start Session**: Begin the session at the scheduled time

### Joining a Session

1. **Access Link**: Click on the shared session link
2. **Login**: Login to your account (or create one)
3. **Join**: Click "Join Session" to enter the discussion room
4. **Participate**: Engage in text-based or voice-based discussion

### Session Features

- **Real-time Chat**: Send and receive messages instantly
- **AI Participants**: AI bots will automatically participate in discussions
- **Voice Recording**: Record and send voice messages
- **Participant List**: View all current participants
- **Session Controls**: Start/end sessions as the creator

### Post-Session Analysis

After completing a session:

1. **Automatic Analysis**: AI generates detailed performance analysis
2. **Individual Feedback**: Personal scores and suggestions for each participant
3. **Overall Metrics**: Session-wide engagement and collaboration scores
4. **Export Options**: Download analysis reports

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Sessions
- `POST /api/sessions/create` - Create new session
- `GET /api/sessions/my-sessions` - Get user's sessions
- `GET /api/sessions/join/:shareLink` - Get session by share link
- `POST /api/sessions/join/:shareLink` - Join session
- `POST /api/sessions/:id/start` - Start session
- `POST /api/sessions/:id/end` - End session

### Analysis
- `POST /api/analysis/generate/:sessionId` - Generate analysis
- `GET /api/analysis/:sessionId` - Get session analysis

## Socket.io Events

### Client to Server
- `join-room` - Join a session room
- `text-message` - Send text message
- `audio-message` - Send audio message

### Server to Client
- `user-joined` - User joined the room
- `user-left` - User left the room
- `text-message` - Receive text message
- `audio-message` - Receive audio message
- `room-participants` - Current room participants

## AI Integration

The platform uses Google Gemini 2.5 Pro for:

1. **AI Participants**: Generate contextual responses during discussions
2. **Performance Analysis**: Analyze user participation and provide feedback
3. **Content Generation**: Create discussion topics and interview questions

## Deployment

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Install dependencies: `npm install`
3. Start the server: `npm start`

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy the `build` folder to your hosting platform

### Environment Variables for Production
```
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-strong-secret-key
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=your-frontend-url
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact: support@nexorainfotech.tech

## Future Enhancements

- [ ] Video conferencing integration
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Multi-language support
- [ ] Screen sharing capabilities
- [ ] Automated scheduling
- [ ] Integration with calendar apps
- [ ] Advanced AI personas
- [ ] Whiteboard collaboration
- [ ] Session recording and playback

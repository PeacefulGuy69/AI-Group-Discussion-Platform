# Deployment Guide - AI-Powered Group Discussion Platform

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd AIGD
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/aigd
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=AIzaSyBYHL_oZMqp-92oe4pELFr1DcVA08ATdOg
```

Start backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## Production Deployment

### Environment Variables
```env
# Backend (.env)
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aigd
JWT_SECRET=your-super-secret-jwt-key
GEMINI_API_KEY=AIzaSyBYHL_oZMqp-92oe4pELFr1DcVA08ATdOg
FRONTEND_URL=https://yourdomain.com
```

### Backend Deployment (Example: Heroku)
1. Install Heroku CLI
2. Login and create app:
```bash
heroku create your-app-name-backend
```

3. Set environment variables:
```bash
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set GEMINI_API_KEY=your-gemini-key
```

4. Deploy:
```bash
git subtree push --prefix backend heroku main
```

### Frontend Deployment (Example: Netlify)
1. Build the project:
```bash
cd frontend
npm run build
```

2. Update API endpoints in code to use production backend URL
3. Deploy `build` folder to Netlify

### Database Setup (MongoDB Atlas)
1. Create MongoDB Atlas account
2. Create new cluster
3. Add database user
4. Get connection string
5. Update MONGODB_URI in backend

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Session Endpoints
- `POST /api/sessions/create` - Create new session
- `GET /api/sessions/my-sessions` - Get user's sessions
- `GET /api/sessions/join/:shareLink` - Get session by link
- `POST /api/sessions/join/:shareLink` - Join session

### Analysis Endpoints
- `POST /api/analysis/generate/:sessionId` - Generate analysis
- `GET /api/analysis/:sessionId` - Get analysis

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing processes on port

2. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string
   - Verify network access

3. **Frontend Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

4. **API Cors Errors**
   - Verify frontend URL in backend cors configuration
   - Check environment variables

### Development Tips
- Use VS Code with extensions for React and Node.js
- Enable ESLint for code quality
- Use MongoDB Compass for database management
- Test API endpoints with Postman

## Monitoring

### Logs
- Backend: Check server logs for errors
- Frontend: Use browser developer tools
- Database: Monitor MongoDB Atlas metrics

### Performance
- Monitor API response times
- Check database query performance
- Optimize large file uploads

## Security

### Best Practices
- Use strong JWT secrets
- Implement rate limiting
- Validate all inputs
- Use HTTPS in production
- Regular security updates

### Environment Security
- Never commit .env files
- Use environment variables for secrets
- Implement proper user authentication
- Regular security audits

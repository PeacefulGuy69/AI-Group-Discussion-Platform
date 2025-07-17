import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home">
      <div className="hero">
        <h1>AI-Powered Group Discussion Platform</h1>
        <p>Practice group discussions and interviews with AI participants and real people</p>
        
        <div className="hero-buttons">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
              <Link to="/create-session" className="btn btn-secondary">
                Create Session
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Login
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="features">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>🤖 AI Participants</h3>
            <p>Practice with intelligent AI bots that provide natural conversation</p>
          </div>
          <div className="feature-card">
            <h3>👥 Real Participants</h3>
            <p>Connect with real people for authentic discussion experience</p>
          </div>
          <div className="feature-card">
            <h3>🎯 Personalized Analysis</h3>
            <p>Get detailed feedback on your performance and improvement areas</p>
          </div>
          <div className="feature-card">
            <h3>🔗 Easy Sharing</h3>
            <p>Share session links with participants for easy access</p>
          </div>
          <div className="feature-card">
            <h3>📊 Performance Tracking</h3>
            <p>Track your progress over time with detailed analytics</p>
          </div>
          <div className="feature-card">
            <h3>🎙️ Audio Support</h3>
            <p>Natural voice-based interactions for realistic experience</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

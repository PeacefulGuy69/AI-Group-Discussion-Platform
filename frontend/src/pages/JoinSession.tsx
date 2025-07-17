import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './JoinSession.css';

interface Session {
  _id: string;
  title: string;
  description: string;
  scheduledTime: string;
  type: string;
  topic: string;
  status: string;
  participants: any[];
  aiParticipants: number;
  realParticipants: number;
  createdBy: {
    username: string;
    email: string;
  };
}

const JoinSession: React.FC = () => {
  const { shareLink } = useParams<{ shareLink: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (shareLink) {
      fetchSession();
    }
  }, [shareLink]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/sessions/join/${shareLink}`);
      setSession(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Session not found');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setJoining(true);
    setError('');

    try {
      await axios.post(`http://localhost:5000/api/sessions/join/${shareLink}`);
      navigate(`/session/${session?._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join session');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div className="loading">Loading session...</div>;
  if (error && !session) return <div className="error-page">Error: {error}</div>;
  if (!session) return <div className="error-page">Session not found</div>;

  return (
    <div className="join-session">
      <div className="join-session-container">
        <div className="session-info">
          <h1>{session.title}</h1>
          <p className="session-description">{session.description}</p>
          
          <div className="session-details">
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{session.type}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Topic:</span>
              <span className="detail-value">{session.topic}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Scheduled:</span>
              <span className="detail-value">{formatDate(session.scheduledTime)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created by:</span>
              <span className="detail-value">{session.createdBy.username}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Participants:</span>
              <span className="detail-value">
                {session.aiParticipants} AI + {session.realParticipants} Real
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className={`detail-value status-${session.status}`}>
                {session.status}
              </span>
            </div>
          </div>

          <div className="participants-list">
            <h3>Current Participants ({session.participants.length})</h3>
            {session.participants.length === 0 ? (
              <p>No participants yet. Be the first to join!</p>
            ) : (
              <div className="participants">
                {session.participants.map((participant, index) => (
                  <div key={index} className="participant">
                    {participant.user?.username || 'Anonymous'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          <div className="join-actions">
            {!isAuthenticated ? (
              <div className="auth-required">
                <p>You need to be logged in to join this session.</p>
                <button onClick={() => navigate('/login')} className="btn btn-primary">
                  Login to Join
                </button>
                <button onClick={() => navigate('/register')} className="btn btn-secondary">
                  Register
                </button>
              </div>
            ) : (
              <div className="join-buttons">
                {session.status === 'scheduled' ? (
                  <button 
                    onClick={handleJoin} 
                    disabled={joining}
                    className="btn btn-primary"
                  >
                    {joining ? 'Joining...' : 'Join Session'}
                  </button>
                ) : session.status === 'active' ? (
                  <button 
                    onClick={handleJoin} 
                    disabled={joining}
                    className="btn btn-primary"
                  >
                    {joining ? 'Joining...' : 'Join Active Session'}
                  </button>
                ) : (
                  <p>This session is no longer active.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSession;

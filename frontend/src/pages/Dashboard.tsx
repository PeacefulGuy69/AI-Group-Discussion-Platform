import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

interface Session {
  _id: string;
  title: string;
  description: string;
  scheduledTime: string;
  type: string;
  topic: string;
  status: string;
  shareLink: string;
  participants: any[];
  aiParticipants: number;
  realParticipants: number;
}

const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.baseURL}/api/sessions/my-sessions`);
      setSessions(response.data);
    } catch (err: any) {
      setError('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#007bff';
      case 'active': return '#28a745';
      case 'completed': return '#6c757d';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.username}!</h1>
        <Link to="/create-session" className="btn btn-primary">
          Create New Session
        </Link>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="sessions-section">
        <h2>Your Sessions</h2>
        
        {sessions.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any sessions yet.</p>
            <Link to="/create-session" className="btn btn-primary">
              Create Your First Session
            </Link>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map((session) => (
              <div key={session._id} className="session-card">
                <div className="session-header">
                  <h3>{session.title}</h3>
                  <span 
                    className="status" 
                    style={{ backgroundColor: getStatusColor(session.status) }}
                  >
                    {session.status}
                  </span>
                </div>
                
                <p className="session-description">{session.description}</p>
                
                <div className="session-details">
                  <div className="detail-item">
                    <strong>Type:</strong> {session.type}
                  </div>
                  <div className="detail-item">
                    <strong>Topic:</strong> {session.topic}
                  </div>
                  <div className="detail-item">
                    <strong>Scheduled:</strong> {formatDate(session.scheduledTime)}
                  </div>
                  <div className="detail-item">
                    <strong>Participants:</strong> {session.aiParticipants} AI + {session.realParticipants} Real
                  </div>
                </div>
                
                <div className="session-actions">
                  {session.status === 'scheduled' && (
                    <Link 
                      to={`/session/${session._id}`}
                      className="btn btn-primary"
                    >
                      Start Session
                    </Link>
                  )}
                  
                  {session.status === 'completed' && (
                    <Link 
                      to={`/analysis/${session._id}`}
                      className="btn btn-secondary"
                    >
                      View Analysis
                    </Link>
                  )}
                  
                  <button 
                    onClick={() => navigator.clipboard.writeText(
                      `${window.location.origin}/join/${session.shareLink}`
                    )}
                    className="btn btn-outline"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

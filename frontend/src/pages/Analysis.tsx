import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './Analysis.css';

interface AnalysisData {
  _id: string;
  session: {
    title: string;
    topic: string;
    type: string;
  };
  participants: {
    userName: string;
    participantType: 'human' | 'ai';
    participation: {
      speakingTime: number;
      contributions: number;
      clarity: number;
      confidence: number;
    };
    feedback: {
      strengths: string[];
      improvements: string[];
      overallScore: number;
      suggestions: string[];
    };
  }[];
  overall: {
    engagement: number;
    collaboration: number;
    topicRelevance: number;
    summary: string;
    keyPoints: string[];
  };
  transcript: string;
  generatedAt: string;
}

const Analysis: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionId) {
      fetchAnalysis();
    }
  }, [sessionId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_CONFIG.baseURL}/api/analysis/${sessionId}`);
      setAnalysis(response.data);
      setLoading(false);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Analysis doesn't exist, generate it
        await generateAnalysis();
      } else {
        setError(err.response?.data?.message || 'Failed to load analysis');
        setLoading(false);
      }
    }
  };

  const generateAnalysis = async () => {
    try {
      setLoading(true);
      
      // First, fetch session data
      const sessionResponse = await axios.get(`${API_CONFIG.baseURL}/api/sessions/${sessionId}`);
      const session = sessionResponse.data;
      
      // Prepare participants data from session - handle both real and AI participants
      const participants = session.participants
        .filter((p: any) => p) // Remove any null/undefined participants
        .map((p: any) => {
          // Handle real participants (have user object)
          if (p.user) {
            return {
              name: p.user.username || p.user.email || 'Unknown User',
              type: 'human',
              userId: p.user._id
            };
          }
          // Handle AI participants (have userName and isAI flag)
          else if (p.isAI || p.userName) {
            return {
              name: p.userName || 'AI Participant',
              type: 'ai',
              userId: null
            };
          }
          // Fallback for any other participant format
          else {
            return {
              name: p.userName || p.name || 'Unknown',
              type: 'human',
              userId: p._id || null
            };
          }
        })
        .filter((p: any) => p.name !== 'Unknown'); // Remove participants with no identifiable name
      
      console.log('Session participants:', session.participants);
      console.log('Processed participants for analysis:', participants);
      
      // For now, use a placeholder transcript
      // In a real implementation, this would be generated from audio recordings
      const transcript = `Discussion about ${session.topic} with ${participants.length} participants. This is a placeholder transcript that would normally be generated from audio recordings during the session.`;
      
      const analysisData = {
        transcript,
        participants
      };

      const response = await axios.post(
        `${API_CONFIG.baseURL}/api/analysis/generate/${sessionId}`,
        analysisData
      );
      
      setAnalysis(response.data.analysis);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  };

  if (loading) return <div className="loading">Loading analysis...</div>;
  if (error) return (
    <div className="error-page">
      <h2>Error Loading Analysis</h2>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="btn btn-primary">
        Retry
      </button>
    </div>
  );
  if (!analysis) return (
    <div className="error-page">
      <h2>Analysis Not Found</h2>
      <p>The analysis for this session could not be found or generated.</p>
      <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="analysis">
      <div className="analysis-header">
        <h1>Session Analysis</h1>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
          Back to Dashboard
        </button>
      </div>

      <div className="analysis-content">
        <div className="session-info">
          <h2>{analysis.session.title}</h2>
          <p><strong>Topic:</strong> {analysis.session.topic}</p>
          <p><strong>Type:</strong> {analysis.session.type}</p>
          <p><strong>Generated:</strong> {new Date(analysis.generatedAt).toLocaleString()}</p>
        </div>

        <div className="overall-analysis">
          <h3>Overall Performance</h3>
          <div className="score-grid">
            <div className="score-card">
              <div className="score-value" style={{ color: getScoreColor(analysis.overall.engagement) }}>
                {analysis.overall.engagement}%
              </div>
              <div className="score-label">Engagement</div>
            </div>
            <div className="score-card">
              <div className="score-value" style={{ color: getScoreColor(analysis.overall.collaboration) }}>
                {analysis.overall.collaboration}%
              </div>
              <div className="score-label">Collaboration</div>
            </div>
            <div className="score-card">
              <div className="score-value" style={{ color: getScoreColor(analysis.overall.topicRelevance) }}>
                {analysis.overall.topicRelevance}%
              </div>
              <div className="score-label">Topic Relevance</div>
            </div>
          </div>
          
          <div className="overall-summary">
            <h4>Summary</h4>
            <p>{analysis.overall.summary}</p>
          </div>

          <div className="key-points">
            <h4>Key Discussion Points</h4>
            <ul>
              {analysis.overall.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="participants-analysis">
          <h3>Individual Participant Analysis</h3>
          {analysis.participants.map((participant, index) => (
            <div key={index} className="participant-card">
              <div className="participant-header">
                <div className="participant-name-with-icon">
                  <span className={`participant-icon ${(participant.participantType || 'human') === 'ai' ? 'ai-icon' : 'human-icon'}`}>
                    {(participant.participantType || 'human') === 'ai' ? '🤖' : '👤'}
                  </span>
                  <h4>{participant.userName}</h4>
                </div>
                <div className="overall-score" style={{ color: getScoreColor(participant.feedback.overallScore) }}>
                  {participant.feedback.overallScore}%
                </div>
              </div>

              <div className="participant-metrics">
                <div className="metric">
                  <span className="metric-label">Speaking Time:</span>
                  <span className="metric-value">{participant.participation.speakingTime}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Contributions:</span>
                  <span className="metric-value">{participant.participation.contributions}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Clarity:</span>
                  <span className="metric-value" style={{ color: getScoreColor(participant.participation.clarity) }}>
                    {participant.participation.clarity}%
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Confidence:</span>
                  <span className="metric-value" style={{ color: getScoreColor(participant.participation.confidence) }}>
                    {participant.participation.confidence}%
                  </span>
                </div>
              </div>

              <div className="feedback-section">
                <div className="strengths">
                  <h5>Strengths</h5>
                  <ul>
                    {participant.feedback.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className="improvements">
                  <h5>Areas for Improvement</h5>
                  <ul>
                    {participant.feedback.improvements.map((improvement, i) => (
                      <li key={i}>{improvement}</li>
                    ))}
                  </ul>
                </div>

                <div className="suggestions">
                  <h5>Suggestions</h5>
                  <ul>
                    {participant.feedback.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="transcript-section">
          <h3>Session Transcript</h3>
          <div className="transcript">
            <p>{analysis.transcript}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;

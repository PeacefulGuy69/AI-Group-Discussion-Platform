import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './CreateSession.css';

const CreateSession: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledTime: '',
    duration: 60,
    type: 'group-discussion',
    topic: '',
    maxParticipants: 6,
    aiParticipants: 2,
    realParticipants: 2
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'maxParticipants' || name === 'aiParticipants' || name === 'realParticipants'
        ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/sessions/create`, formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const suggestedTopics = {
    'group-discussion': [
      'Impact of AI on Future Jobs',
      'Remote Work vs Office Culture',
      'Sustainable Business Practices',
      'Digital Transformation in Education',
      'Social Media and Communication'
    ],
    'interview': [
      'Software Engineer Position',
      'Marketing Manager Role',
      'Data Scientist Interview',
      'Product Manager Position',
      'General Interview Practice'
    ]
  };

  return (
    <div className="create-session">
      <div className="create-session-container">
        <h1>Create New Session</h1>
        
        <form onSubmit={handleSubmit} className="session-form">
          <div className="form-group">
            <label htmlFor="title">Session Title</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter session title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Describe what this session is about"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Session Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="group-discussion">Group Discussion</option>
                <option value="interview">Interview</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration (minutes)</label>
              <input
                id="duration"
                name="duration"
                type="number"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                max="180"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="topic">Topic</label>
            <input
              id="topic"
              name="topic"
              type="text"
              value={formData.topic}
              onChange={handleChange}
              required
              placeholder="Enter discussion topic"
            />
            <div className="suggested-topics">
              <p>Suggested topics:</p>
              <div className="topic-chips">
                {suggestedTopics[formData.type as keyof typeof suggestedTopics].map((topic, index) => (
                  <button
                    key={index}
                    type="button"
                    className="topic-chip"
                    onClick={() => setFormData(prev => ({ ...prev, topic }))}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="scheduledTime">Scheduled Time</label>
            <input
              id="scheduledTime"
              name="scheduledTime"
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={handleChange}
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="participants-section">
            <h3>Participants Configuration</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="aiParticipants">AI Participants</label>
                <input
                  id="aiParticipants"
                  name="aiParticipants"
                  type="number"
                  value={formData.aiParticipants}
                  onChange={handleChange}
                  min="0"
                  max="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="realParticipants">Real Participants</label>
                <input
                  id="realParticipants"
                  name="realParticipants"
                  type="number"
                  value={formData.realParticipants}
                  onChange={handleChange}
                  min="1"
                  max="8"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxParticipants">Max Total Participants</label>
                <input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min="2"
                  max="10"
                  required
                />
              </div>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSession;

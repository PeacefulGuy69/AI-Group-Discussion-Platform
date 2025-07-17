import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useAudioTranscription } from '../hooks/useAudioTranscription';
import { audioService } from '../services/audioService';
import AudioPlayer from '../components/AudioPlayer';
import './SessionRoom.css';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'audio';
  audioUrl?: string;
  transcript?: string;
}

interface Participant {
  socketId: string;
  userId: string;
  userName: string;
  isAI?: boolean;
}

const SessionRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [shouldUploadAudio, setShouldUploadAudio] = useState(false);
  const [liveTranscriptForUpload, setLiveTranscriptForUpload] = useState('');
  const [endingSession, setEndingSession] = useState(false);
  const { user } = useAuth();
  const { socket } = useSocket();
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudioBlob, error: audioError } = useAudioRecording();
  const { transcribeAudio, startLiveTranscription, stopLiveTranscription, isTranscribing, currentTranscript } = useAudioTranscription();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to remove duplicate participants
  const removeDuplicateParticipants = useCallback((participantsList: Participant[]) => {
    // First, ensure we don't have duplicate entries for the same userId
    const uniqueMap = new Map<string, Participant>();
    
    // Process real participants first
    const realParticipants = participantsList.filter(p => !p.isAI);
    realParticipants.forEach(p => {
      uniqueMap.set(p.userId, p);
    });
    
    // Then handle AI participants, with a separate naming scheme
    const aiParticipants = participantsList.filter(p => p.isAI);
    const aiNames = new Set<string>();
    
    // Make sure AI names are unique
    aiParticipants.forEach(p => {
      if (!aiNames.has(p.userName)) {
        aiNames.add(p.userName);
        // Use userName as the key for AI participants
        uniqueMap.set(`ai-${p.userName}`, p);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, []);
  
  // We don't need a separate effect for removeDuplicateParticipants
  // as we'll call it directly in the state setters

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, removeDuplicateParticipants]);

  useEffect(() => {
    if (socket && sessionId && user) {
      // Join the room
      console.log('Joining room:', sessionId, 'as user:', user.username);
      socket.emit('join-room', sessionId, user.id, user.username);

      // Listen for messages
      socket.on('text-message', (data: any) => {
        console.log('Received text message:', data);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          userId: data.userId,
          userName: data.userName,
          content: data.content,
          timestamp: new Date(data.timestamp),
          type: 'text'
        }]);
        
        // If this is an AI message, update the participant list with the correct name
        if (data.isAI) {
          setParticipants(prev => {
            const updated = prev.map(p => {
              if (p.isAI && p.userId === data.userId) {
                return { ...p, userName: data.userName };
              }
              return p;
            });
            return removeDuplicateParticipants(updated);
          });
        }
      });

      socket.on('audio-message', (data: any) => {
        console.log('📨 Received audio message:', data);
        console.log('📝 Received transcript:', data.transcript);
        console.log('🎵 Audio URL:', data.audioUrl);
        console.log('👤 From user:', data.userName);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          userId: data.userId,
          userName: data.userName,
          content: data.transcript || '[Audio Message]',
          timestamp: new Date(data.timestamp),
          type: 'audio',
          audioUrl: data.audioUrl,
          transcript: data.transcript
        }]);
        
        console.log('✅ Audio message added to chat with transcript:', data.transcript || '[No transcript]');
        
        // If this is an AI message, update the participant list with the correct name
        if (data.isAI) {
          setParticipants(prev => {
            const updated = prev.map(p => {
              if (p.isAI && p.userId === data.userId) {
                return { ...p, userName: data.userName };
              }
              return p;
            });
            return removeDuplicateParticipants(updated);
          });
        }
      });

      socket.on('user-joined', (data: any) => {
        // Check if user already exists before adding
        setParticipants(prev => {
          const exists = prev.some(p => p.userId === data.userId);
          if (exists) return prev;
          const newList = [...prev, {
            socketId: data.socketId,
            userId: data.userId,
            userName: data.userName
          }];
          return removeDuplicateParticipants(newList);
        });
      });

      socket.on('user-left', (socketId: string) => {
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      });

      socket.on('room-participants', (roomParticipants: Participant[]) => {
        console.log('Received room participants:', roomParticipants);
        // Keep AI participants and add real participants from socket
        setParticipants(prev => {
          const aiParticipants = prev.filter(p => p.isAI);
          const realParticipants = roomParticipants.filter(p => !p.isAI);
          return removeDuplicateParticipants([...realParticipants, ...aiParticipants]);
        });
      });

      return () => {
        socket.off('text-message');
        socket.off('audio-message');
        socket.off('user-joined');
        socket.off('user-left');
        socket.off('room-participants');
      };
    }
  }, [socket, sessionId, user, removeDuplicateParticipants]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSession = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/sessions/${sessionId}`);
      setSession(response.data);
      
      // Always set up AI participants when session loads
      const aiParticipants: Participant[] = [];
      
      // First, try to get the actual bot names from the backend
      if (response.data.aiParticipants > 0) {
        try {
          const botsResponse = await axios.get(`http://localhost:5000/api/ai-bots/bots/${sessionId}`);
          if (botsResponse.data.success && botsResponse.data.bots.length > 0) {
            // Use actual bot names from backend
            botsResponse.data.bots.forEach((bot: any, index: number) => {
              aiParticipants.push({
                socketId: `ai-${bot.id}`,
                userId: bot.id,
                userName: bot.name,
                isAI: true
              });
            });
          } else {
            // Fallback to generic names if bots haven't been initialized yet
            for (let i = 0; i < response.data.aiParticipants; i++) {
              aiParticipants.push({
                socketId: `ai-${i}`,
                userId: `ai-${i}`,
                userName: `AI Participant ${i + 1}`,
                isAI: true
              });
            }
          }
        } catch (botError) {
          console.log('Bots not initialized yet, using generic names');
          // Fallback to generic names if API call fails
          for (let i = 0; i < response.data.aiParticipants; i++) {
            aiParticipants.push({
              socketId: `ai-${i}`,
              userId: `ai-${i}`,
              userName: `AI Participant ${i + 1}`,
              isAI: true
            });
          }
        }
      }
      
      // Set initial participants with AI participants
      // Real participants will come from socket events
      setParticipants(prev => {
        // Keep any real participants we might already have
        const realParticipants = prev.filter(p => !p.isAI);
        return removeDuplicateParticipants([...realParticipants, ...aiParticipants]);
      });
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket && user) {
      const messageData = {
        roomId: sessionId,
        userId: user.id,
        userName: user.username,
        content: newMessage,
        timestamp: new Date()
      };

      socket.emit('text-message', messageData);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStartRecording = useCallback(async () => {
    clearAudioBlob();
    setShouldUploadAudio(false);
    startLiveTranscription();
    await startRecording();
  }, [startRecording, clearAudioBlob, startLiveTranscription]);

  const handleStopRecording = useCallback(() => {
    console.log('handleStopRecording called');
    stopRecording();
    const liveTranscript = stopLiveTranscription();
    console.log('Live transcript captured:', liveTranscript);
    setLiveTranscriptForUpload(liveTranscript);
    setShouldUploadAudio(true);
    console.log('shouldUploadAudio set to true');
  }, [stopRecording, stopLiveTranscription]);

  const handleAudioUpload = useCallback(async () => {
    console.log('handleAudioUpload called:', { audioBlob: !!audioBlob, uploadingAudio, shouldUploadAudio });
    
    if (!audioBlob || !socket || !user || !shouldUploadAudio) {
      console.log('Upload skipped - missing requirements');
      return;
    }

    try {
      console.log('Starting audio upload...');
      setUploadingAudio(true);
      
      // Upload audio
      const uploadResult = await audioService.uploadAudio(audioBlob);
      console.log('✅ Audio uploaded, URL:', uploadResult.audioUrl);
      
      // Use the live transcript captured during recording
      const transcript = liveTranscriptForUpload || '[Audio Message]';
      console.log('✅ Using live transcript:', transcript);
      console.log('📝 Transcript length:', transcript.length, 'characters');
      
      const audioMessage = {
        roomId: sessionId,
        userId: user.id,
        userName: user.username,
        content: transcript,
        audioUrl: uploadResult.audioUrl,
        transcript: transcript,
        timestamp: new Date()
      };

      console.log('📨 Sending audio message with transcript:', audioMessage);
      console.log('📝 Message content:', audioMessage.content);
      console.log('🎵 Audio URL:', audioMessage.audioUrl);
      console.log('📄 Transcript:', audioMessage.transcript);
      socket.emit('audio-message', audioMessage);
      
      console.log('Audio upload successful');
      
      // Clear the flag, blob, and transcript to prevent re-upload
      setShouldUploadAudio(false);
      setLiveTranscriptForUpload('');
      clearAudioBlob();
      
    } catch (error) {
      console.error('Audio upload failed:', error);
      setError('Failed to send audio message');
      setShouldUploadAudio(false);
    } finally {
      setUploadingAudio(false);
    }
  }, [audioBlob, socket, user, sessionId, shouldUploadAudio, clearAudioBlob, uploadingAudio, liveTranscriptForUpload]);

  // Handle audio recording completion
  useEffect(() => {
    if (audioBlob && !uploadingAudio && shouldUploadAudio) {
      handleAudioUpload();
    }
  }, [audioBlob, uploadingAudio, shouldUploadAudio, handleAudioUpload]);

  const endSession = async () => {
    if (endingSession) return; // Prevent multiple clicks
    
    try {
      setEndingSession(true);
      // End the session
      await axios.post(`http://localhost:5000/api/sessions/${sessionId}/end`);
      
      // Navigate to analysis page (it will handle generation if needed)
      navigate(`/analysis/${sessionId}`);
    } catch (err: any) {
      setError('Failed to end session');
      setEndingSession(false);
    }
  };

  if (loading) return <div className="loading">Loading session...</div>;
  if (error && !session) return <div className="error-page">Error: {error}</div>;
  if (!session) return <div className="error-page">Session not found</div>;

  return (
    <div className="session-room">
      <div className="session-header">
        <div className="session-info">
          <h1>{session.title}</h1>
          <p>{session.topic}</p>
        </div>
        <div className="session-controls">
          <button 
            onClick={endSession} 
            className="btn btn-danger"
            disabled={endingSession}
          >
            {endingSession ? 'Ending Session...' : 'End Session'}
          </button>
        </div>
      </div>

      <div className="session-content">
        {(error || audioError) && (
          <div className="error-message">
            {error || audioError}
          </div>
        )}
        
        <div className="participants-sidebar">
          <h3>Participants ({participants.length})</h3>
          <div className="participants-list">
            {[...participants]
              // Sort participants: real users first, then AI participants
              .sort((a, b) => {
                // First sort by AI status (real users first)
                if (a.isAI && !b.isAI) return 1;
                if (!a.isAI && b.isAI) return -1;
                // For AI participants, sort by name number
                if (a.isAI && b.isAI) {
                  const aNum = parseInt(a.userName.split(' ').pop() || '0');
                  const bNum = parseInt(b.userName.split(' ').pop() || '0');
                  return aNum - bNum;
                }
                // For real users, sort by name
                return a.userName.localeCompare(b.userName);
              })
              .map((participant, index) => (
                <div 
                  key={`${participant.isAI ? 'ai' : 'user'}-${participant.userId}-${index}`} 
                  className={`participant ${participant.isAI ? 'ai-participant' : ''}`}
                >
                  <div className="participant-avatar">
                    {participant.isAI ? '🤖' : '👤'}
                  </div>
                  <span className="participant-name">{participant.userName}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="chat-area">
          <div className="messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.userId === user?.id ? 'own-message' : ''}`}
              >
                <div className="message-header">
                  <span className="message-author">{message.userName}</span>
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">
                  {message.type === 'audio' && message.audioUrl ? (
                    <div className="audio-message">
                      <AudioPlayer 
                        audioUrl={message.audioUrl} 
                        isOwn={message.userId === user?.id}
                      />
                      {message.transcript && (
                        <div className="transcript">
                          <small>💬 "{message.transcript}"</small>
                        </div>
                      )}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="message-input">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={2}
            />
            {isRecording && currentTranscript && (
              <div className="live-transcript">
                <small>🎙️ Live Transcript: "{currentTranscript}"</small>
              </div>
            )}
            <div className="input-controls">
              <button 
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                disabled={uploadingAudio}
              >
                {uploadingAudio ? '📤 Processing...' : isRecording ? '🛑 Stop' : '🎤 Record'}
              </button>
              <button onClick={sendMessage} className="btn btn-primary">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionRoom;

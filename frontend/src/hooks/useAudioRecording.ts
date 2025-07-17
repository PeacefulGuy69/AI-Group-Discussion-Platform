import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioHookReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearAudioBlob: () => void;
  playAudio: (audioUrl: string) => Promise<void>;
  error: string | null;
}

export const useAudioRecording = (): AudioHookReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Clean up any existing recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, creating blob...');
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        setAudioBlob(audioBlob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setIsRecording(false);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      console.log('Recording started successfully');
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('stopRecording called, isRecording:', isRecording);
    console.log('mediaRecorderRef.current:', mediaRecorderRef.current);
    console.log('mediaRecorder state:', mediaRecorderRef.current?.state);
    
    try {
      // Force stop recording regardless of current state
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          console.log('Recording stopped successfully');
        } else if (mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume();
          setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }, 100);
        }
      }
      
      // Force stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      }
      
      // Reset state
      setIsRecording(false);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setError('Failed to stop recording');
      
      // Force cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.error('Error stopping track:', e);
          }
        });
      }
    }
  }, [isRecording]);

  const playAudio = useCallback(async (audioUrl: string) => {
    try {
      const audio = new Audio(audioUrl);
      audio.controls = true;
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
    }
  }, []);

  const clearAudioBlob = useCallback(() => {
    setAudioBlob(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearAudioBlob,
    playAudio,
    error
  };
};

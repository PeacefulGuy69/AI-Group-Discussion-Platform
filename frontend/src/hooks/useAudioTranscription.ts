import { useCallback, useRef, useState } from 'react';

interface TranscriptionHookReturn {
  transcribeAudio: (audioBlob: Blob) => Promise<string>;
  startLiveTranscription: () => void;
  stopLiveTranscription: () => string;
  isTranscribing: boolean;
  currentTranscript: string;
}

export const useAudioTranscription = (): TranscriptionHookReturn => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const startLiveTranscription = useCallback(() => {
    console.log('🎙️ Starting live transcription');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('⚠️ Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('🎯 Speech recognition started');
      setIsTranscribing(true);
      finalTranscriptRef.current = '';
      setCurrentTranscript('');
    };

    recognition.onresult = (event: any) => {
      console.log('📝 Speech recognition result received');
      let interimTranscript = '';
      let finalTranscript = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      finalTranscriptRef.current = finalTranscript;
      setCurrentTranscript(finalTranscript + interimTranscript);
      console.log('📝 Current transcript:', finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsTranscribing(false);
    };

    recognition.onend = () => {
      console.log('🔚 Speech recognition ended');
      setIsTranscribing(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopLiveTranscription = useCallback(() => {
    console.log('🛑 Stopping live transcription');
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsTranscribing(false);
    const finalTranscript = finalTranscriptRef.current;
    console.log('✅ Final transcript:', finalTranscript);
    
    return finalTranscript;
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    console.log('🎵 Transcribing audio blob:', audioBlob.size, 'bytes');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('⚠️ Speech recognition not supported in this browser');
      return '';
    }

    try {
      // Create audio element to play the blob
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      console.log('🎧 Audio created, starting playback for transcription');
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      return new Promise((resolve, reject) => {
        let transcript = '';
        
        recognition.onresult = (event: any) => {
          console.log('📝 Recognition result received');
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript;
            }
          }
          console.log('📝 Transcript so far:', transcript);
        };
        
        recognition.onerror = (event: any) => {
          console.error('❌ Recognition error:', event.error);
          URL.revokeObjectURL(audioUrl);
          reject(new Error(event.error));
        };
        
        recognition.onend = () => {
          console.log('✅ Recognition ended, final transcript:', transcript);
          URL.revokeObjectURL(audioUrl);
          resolve(transcript);
        };
        
        audio.onloadedmetadata = () => {
          console.log('🎵 Audio metadata loaded, duration:', audio.duration);
          recognition.start();
          audio.play();
          
          // Stop recognition after audio ends
          setTimeout(() => {
            recognition.stop();
          }, audio.duration * 1000 + 1000); // Add 1 second buffer
        };
        
        audio.onerror = (error) => {
          console.error('❌ Audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
      });
    } catch (error) {
      console.error('❌ Transcription error:', error);
      return '';
    }
  }, []);

  return {
    transcribeAudio,
    startLiveTranscription,
    stopLiveTranscription,
    isTranscribing,
    currentTranscript
  };
};

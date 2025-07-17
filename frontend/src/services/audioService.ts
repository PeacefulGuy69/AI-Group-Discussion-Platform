import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class AudioService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    };
  }

  async uploadAudio(audioBlob: Blob): Promise<{ audioUrl: string; filename: string; transcript?: string }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await axios.post(
        `${API_BASE_URL}/api/audio/upload`,
        formData,
        this.getAuthHeaders()
      );

      return response.data;
    } catch (error) {
      console.error('Audio upload error:', error);
      throw new Error('Failed to upload audio');
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await axios.post(
        `${API_BASE_URL}/api/audio/transcribe`,
        formData,
        this.getAuthHeaders()
      );

      return response.data.transcript || '';
    } catch (error) {
      console.error('Audio transcription error:', error);
      return ''; // Return empty string if transcription fails
    }
  }

  async deleteAudio(filename: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/api/audio/file/${filename}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
    } catch (error) {
      console.error('Audio deletion error:', error);
      throw new Error('Failed to delete audio');
    }
  }

  getAudioUrl(filename: string): string {
    return `${API_BASE_URL}/api/audio/file/${filename}`;
  }
}

export const audioService = new AudioService();

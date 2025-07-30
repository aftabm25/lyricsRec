import React, { useState, useRef, useEffect } from 'react';
import { ACRCLOUD_CONFIG, isAcrCloudConfigured, getAcrCloudConfig } from '../config/api';
import './SongRecognition.css';

const SongRecognition = ({ onSongDetected }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionProgress, setRecognitionProgress] = useState(0);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const recognizerRef = useRef(null);

  useEffect(() => {
    // Check if Web Audio API is supported
    if (!window.AudioContext && !window.webkitAudioContext) {
      setIsSupported(false);
      setError('Web Audio API is not supported in this browser');
      return;
    }

    // Check if ACRCloud SDK is loaded
    if (!window.ACRCloudRecognizer) {
      setIsSupported(false);
      setError('ACRCloud SDK not loaded. Please check your internet connection.');
      return;
    }

    // Check if ACRCloud is configured
    if (!isAcrCloudConfigured()) {
      setError('ACRCloud not configured. Please add your credentials in src/config/api.js');
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
      if (recognizerRef.current) {
        recognizerRef.current.stopRecognize();
      }
    };
  }, [mediaStream, audioContext]);

  const startListening = async () => {
    try {
      setError(null);
      setIsListening(true);
      setIsRecognizing(false);
      setRecognitionProgress(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      setMediaStream(stream);

      // Create audio context for visualization
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      setAudioContext(context);

      // Create analyser for visualization
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 2048;
      setAnalyser(analyserNode);

      // Connect audio source to analyser
      const source = context.createMediaStreamSource(stream);
      source.connect(analyserNode);

      // Start visualization
      visualize();

      // Start ACRCloud recognition
      startAcrCloudRecognition();

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  const startAcrCloudRecognition = () => {
    try {
      if (!isAcrCloudConfigured()) {
        throw new Error('ACRCloud not configured');
      }

      const config = getAcrCloudConfig();
      recognizerRef.current = new window.ACRCloudRecognizer(config);

      recognizerRef.current.startRecognize((result) => {
        setIsRecognizing(false);
        setIsListening(false);
        setRecognitionProgress(100);

        try {
          const data = JSON.parse(result);
          
          if (data.status && data.status.code === 0 && 
              data.metadata && data.metadata.music && 
              data.metadata.music.length > 0) {
            
            const song = data.metadata.music[0];
            onSongDetected({
              title: song.title || 'Unknown Title',
              artist: song.artists ? song.artists.map(a => a.name).join(', ') : 'Unknown Artist',
              album: song.album ? song.album.name : 'Unknown Album',
              confidence: song.score || 1,
              acrcloud_id: song.acrid
            });
          } else {
            setError('No song recognized. Please try again.');
            simulateSongDetection();
          }
        } catch (e) {
          console.error('Error parsing ACRCloud result:', e);
          setError('Recognition failed. Using demo mode.');
          simulateSongDetection();
        }
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setRecognitionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      setIsRecognizing(true);

    } catch (err) {
      console.error('Error starting ACRCloud recognition:', err);
      setError('ACRCloud recognition failed. Using demo mode.');
      simulateSongDetection();
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsRecognizing(false);
    setRecognitionProgress(0);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    if (recognizerRef.current) {
      recognizerRef.current.stopRecognize();
    }
    
    setAnalyser(null);
    setAudioData(null);
  };

  const visualize = () => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Calculate audio characteristics for song recognition
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const dominantFrequencies = getDominantFrequencies(dataArray);
      
      setAudioData({
        average,
        dominantFrequencies,
        timestamp: Date.now()
      });

      // Visualize the audio
      ctx.fillStyle = 'rgba(29, 185, 84, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1db954');
        gradient.addColorStop(1, '#1ed760');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const getDominantFrequencies = (dataArray) => {
    const frequencies = [];
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > 128) { // Threshold for significant frequency
        frequencies.push({
          frequency: i * 22050 / dataArray.length, // Convert to Hz
          amplitude: dataArray[i]
        });
      }
    }
    return frequencies.sort((a, b) => b.amplitude - a.amplitude).slice(0, 10);
  };

  const simulateSongDetection = () => {
    // Fallback simulation if ACRCloud fails
    const mockSongs = [
      { title: "O Meri Laila", artist: "Arijit Singh", confidence: 0.85 },
      { title: "Like That", artist: "Future & Kendrick Lamar", confidence: 0.72 },
      { title: "Unknown Song", artist: "Unknown Artist", confidence: 0.45 }
    ];

    setTimeout(() => {
      const detectedSong = mockSongs[Math.floor(Math.random() * mockSongs.length)];
      onSongDetected(detectedSong);
    }, 2000);
  };

  const handleStartListening = async () => {
    await startListening();
  };

  if (!isSupported) {
    return (
      <div className="song-recognition-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="song-recognition">
      <div className="recognition-header">
        <h2>Song Recognition</h2>
        <p>Listen to identify the currently playing song</p>
        {!isAcrCloudConfigured() && (
          <p style={{ color: '#ffa500', fontSize: '0.9rem', marginTop: '8px' }}>
            ⚠️ Demo mode: Add your ACRCloud credentials for real song recognition
          </p>
        )}
      </div>

      <div className="recognition-controls">
        {!isListening ? (
          <button 
            className="start-listening-btn"
            onClick={handleStartListening}
          >
            🎵 Start Listening
          </button>
        ) : (
          <button 
            className="stop-listening-btn"
            onClick={stopListening}
          >
            ⏹️ Stop Listening
          </button>
        )}
      </div>

      {error && (
        <div className="recognition-error">
          <p>{error}</p>
        </div>
      )}

      {isListening && (
        <div className="recognition-visualizer">
          <canvas 
            ref={canvasRef} 
            width="300" 
            height="100"
            className="audio-visualizer"
          />
          <div className="listening-status">
            <div className="pulse-dot"></div>
            <span>
              {isRecognizing 
                ? `Recognizing song... ${recognitionProgress}%`
                : 'Listening for music...'
              }
            </span>
          </div>
        </div>
      )}

      {isRecognizing && (
        <div className="recognition-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${recognitionProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {audioData && (
        <div className="audio-info">
          <p>Audio Level: {Math.round(audioData.average)}</p>
          <p>Detected Frequencies: {audioData.dominantFrequencies.length}</p>
        </div>
      )}
    </div>
  );
};

export default SongRecognition; 
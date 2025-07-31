import React, { useState, useRef, useEffect } from 'react';
import { ACRCLOUD_CONFIG, isAcrCloudConfigured, getAcrCloudConfig } from '../config/api';
import './SongRecognition.css';

// CryptoJS for signature generation (we'll use a simple implementation)
const hmacSHA1 = (message, secret) => {
  // Simple HMAC-SHA1 implementation for web
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  ).then(key => {
    return crypto.subtle.sign('HMAC', key, messageData);
  }).then(signature => {
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  });
};

const buildStringToSign = (method, uri, accessKey, dataType, signatureVersion, timestamp) => {
  return [method, uri, accessKey, dataType, signatureVersion, timestamp].join('\n');
};

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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    // Check if Web Audio API is supported
    if (!window.AudioContext && !window.webkitAudioContext) {
      setIsSupported(false);
      setError('Web Audio API is not supported in this browser');
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
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [mediaStream, audioContext]);

  const startListening = async () => {
    try {
      setError(null);
      setIsListening(true);
      setIsRecognizing(false);
      setRecognitionProgress(0);
      audioChunksRef.current = [];

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

      // Start recording for ACRCloud
      startRecording(stream);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  const startRecording = (stream) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      await identifySong();
    };

    // Record for 8 seconds
    mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, 8000);
  };

  const identifySong = async () => {
    try {
      setIsRecognizing(true);
      setRecognitionProgress(10);

      if (!isAcrCloudConfigured()) {
        throw new Error('ACRCloud not configured');
      }

      const config = getAcrCloudConfig();
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      setRecognitionProgress(30);

      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      setRecognitionProgress(50);

      // Prepare ACRCloud request
      const timestamp = Math.floor(Date.now() / 1000);
      const stringToSign = buildStringToSign(
        'POST',
        '/v1/identify',
        config.access_key,
        'audio',
        '1',
        timestamp
      );

      const signature = await hmacSHA1(stringToSign, config.access_secret);
      
      setRecognitionProgress(70);

      // Create form data
      const formData = new FormData();
      formData.append('sample', audioBlob, 'sample.webm');
      formData.append('access_key', config.access_key);
      formData.append('data_type', 'audio');
      formData.append('signature_version', '1');
      formData.append('signature', signature);
      formData.append('sample_bytes', audioBlob.size);
      formData.append('timestamp', timestamp);

      setRecognitionProgress(85);

      // Make API request
      const response = await fetch(`https://${config.host}/v1/identify`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      setRecognitionProgress(100);
      setIsRecognizing(false);
      setIsListening(false);

      if (result.status && result.status.code === 0 && 
          result.metadata && result.metadata.music && 
          result.metadata.music.length > 0) {
        
        const song = result.metadata.music[0];
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

    } catch (err) {
      console.error('Error identifying song:', err);
      setError('Recognition failed. Using demo mode.');
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
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

      ctx.fillStyle = 'rgba(18, 18, 18, 0.1)';
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

      // Update audio data for display
      const dominantFreqs = getDominantFrequencies(dataArray);
      setAudioData(dominantFreqs);
    };

    draw();
  };

  const getDominantFrequencies = (dataArray) => {
    const frequencies = [];
    for (let i = 0; i < dataArray.length; i += 10) {
      if (dataArray[i] > 128) {
        frequencies.push(Math.round((i * 22050) / dataArray.length));
      }
    }
    return frequencies.slice(0, 5);
  };

  const simulateSongDetection = () => {
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
      <div className="song-recognition">
        <div className="recognition-error">
          <h3>❌ Not Supported</h3>
          <p>{error}</p>
        </div>
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
          <button className="start-listening-btn" onClick={handleStartListening}>
            🎵 Start Listening
          </button>
        ) : (
          <button className="stop-listening-btn" onClick={stopListening}>
            ⏹️ Stop Listening
          </button>
        )}
      </div>

      {error && (
        <div className="recognition-error">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
        </div>
      )}

      {isListening && (
        <div className="recognition-visualizer">
          <canvas ref={canvasRef} width="300" height="100" className="audio-visualizer" />
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
          <h4>Audio Analysis</h4>
          <p>Dominant Frequencies: {audioData.join(', ')} Hz</p>
        </div>
      )}
    </div>
  );
};

export default SongRecognition; 
import React, { useState, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';

const AudioRecorder = ({ onAudioChange, maxDuration = 300 }) => {
  const { t, language } = useLanguage();
  const {
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    formatDuration,
    playAudio,
    resetRecording
  } = useAudioRecorder();

  React.useEffect(() => {
    onAudioChange(audioBlob);
  }, [audioBlob, onAudioChange]);

  React.useEffect(() => {
    if (duration >= maxDuration && isRecording) {
      stopRecording();
    }
  }, [duration, maxDuration, isRecording, stopRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingTimeText = () => {
    const timeText = t(translations.recordingTime).replace('{time}', formatTime(duration));
    return timeText;
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-hfbk-bg-extra border-2 border-red-400 text-red-400">
          <strong>ERROR:</strong> {error}
        </div>
      )}

      <div className="flex items-center justify-center space-x-4">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="btn-primary px-6 py-3"
          >
            🎤 {t(translations.startRecording)}
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="btn-secondary px-6 py-3 animate-pulse"
          >
            ⏹️ {t(translations.stopRecording)}
          </button>
        )}

        {!isRecording && audioBlob && (
          <div className="flex space-x-3">
            <button
              onClick={playAudio}
              className="btn-primary px-6 py-3"
            >
              ▶️ {t(translations.playRecording)}
            </button>
            <button
              onClick={resetRecording}
              className="btn-secondary px-6 py-3"
            >
              🔄 {t(translations.reRecord)}
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-hfbk-fg-secondary">
        {isRecording && (
          <div className="space-y-1">
            <p className="text-hfbk-primary font-semibold">{t(translations.recording)}</p>
            <p>{getRecordingTimeText()}</p>
          </div>
        )}
        
        {!isRecording && audioBlob && (
          <p>{t(translations.recordingTime).replace('{time}', formatTime(duration))}</p>
        )}
        
        {!isRecording && !audioBlob && (
          <p>
            {t(translations.maxDuration)} {formatTime(maxDuration)}
          </p>
        )}
      </div>

      {audioUrl && (
        <div className="p-4 bg-hfbk-bg-extra border-2 border-hfbk-fg-secondary">
          <p className="font-bold text-hfbk-primary">
            ✓ {language === 'en' ? 'RECORDING COMPLETED' : 'AUFNAHME ABGESCHLOSSEN'} ({formatDuration(duration)})
          </p>
        </div>
      )}

      <div className="text-sm text-hfbk-subtitle space-y-1">
        <p>• {language === 'en' ? 'Maximum recording duration:' : 'Maximale Aufnahmedauer:'} {formatDuration(maxDuration)}</p>
        <p>• {language === 'en' ? 'Click START RECORDING to begin' : 'Klicken Sie auf AUFNAHME STARTEN, um zu beginnen'}</p>
        <p>• {language === 'en' ? 'Speak clearly into your microphone' : 'Sprechen Sie deutlich in Ihr Mikrofon'}</p>
        <p>• {language === 'en' ? 'Click STOP RECORDING when finished' : 'Klicken Sie auf AUFNAHME STOPPEN, wenn Sie fertig sind'}</p>
      </div>
    </div>
  );
};

export default AudioRecorder; 
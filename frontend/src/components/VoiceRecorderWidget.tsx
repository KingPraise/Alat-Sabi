'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { uploadVoiceAudio } from '@/services/api';

interface VoiceRecorderWidgetProps {
  phoneNumber: string;
  businessName: string;
  onSuccess: (data: any) => void;
}

export function VoiceRecorderWidget({ phoneNumber, businessName, onSuccess }: VoiceRecorderWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        setIsLoading(true);
        try {
          const res = await uploadVoiceAudio(phoneNumber, businessName, audioBlob);
          onSuccess(res);
        } catch (err: any) {
          console.error('Audio upload error:', err);
          setErrorMessage(err.message || 'Voice parsing failed');
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setErrorMessage('Microphone access required to record voice notes');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-wema-darkPurple via-wema-purple to-wema-lightPurple text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-wema-pink/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col items-center text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md text-pink-200">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span>Multimodal AI Voice Ledger</span>
        </div>

        <h2 className="text-lg font-bold">Record Today's Sales</h2>
        <p className="text-xs text-purple-200 max-w-xs leading-relaxed">
          Tap mic and speak in Pidgin, English, or Yoruba (e.g. "I sell 2 Ankara 30k cash and 1 Lace 15k credit to Mama Blessing")
        </p>

        <div className="relative my-2">
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-wema-red animate-ping opacity-75" />
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
              isRecording
                ? 'bg-wema-red text-white scale-110'
                : isLoading
                ? 'bg-purple-900 text-purple-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-wema-pink to-wema-red text-white hover:opacity-90 hover:scale-105'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isRecording ? (
              <Square className="w-8 h-8 fill-current" />
            ) : (
              <Mic className="w-9 h-9" />
            )}
          </button>
        </div>

        <p className="text-xs font-semibold tracking-wide">
          {isLoading ? (
            <span className="text-yellow-300 animate-pulse">Gemini AI Transcribing Audio...</span>
          ) : isRecording ? (
            <span className="text-wema-red animate-pulse font-bold">Recording Voice Note (Tap to Stop)</span>
          ) : (
            <span className="text-purple-200">Tap Microphone to Speak</span>
          )}
        </p>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-red-300 bg-red-950/60 border border-red-500/30 px-3 py-1.5 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

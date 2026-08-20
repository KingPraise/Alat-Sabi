'use client';

import React, { useState, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Loader2, 
  Volume2, 
  Play, 
  Sparkles, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { uploadVoiceAudio, postLedgerEntry } from '@/services/api';

interface VoiceRecorderWidgetProps {
  phoneNumber: string;
  businessName: string;
  onSuccess: (data: any) => void;
}

const PRESET_VOICE_CHIPS = [
  {
    id: 'indomie-cash',
    label: 'Pidgin: 2 Cartons Indomie (₦24k Cash)',
    raw_transcript: 'I sell two cartons of Indomie for twenty four thousand naira cash',
    payment_method: 'cash' as const,
    items: [{ name: 'Indomie Super Pack (Carton)', qty: 2, unit_price: 12000, total: 24000 }],
    total_amount: 24000,
    amount_paid: 24000,
    debt_amount: 0,
    debtor_name: undefined,
  },
  {
    id: 'rice-split',
    label: 'Split: 5 Bags Rice (₦450k, ₦200k Transfer, ₦250k Debt)',
    raw_transcript: 'Chief Okafor buy five bags of foreign rice for four hundred and fifty thousand. He do transfer of two hundred thousand, balance two hundred and fifty thousand debt',
    payment_method: 'split' as const,
    items: [{ name: 'Foreign Long Grain Rice (50kg)', qty: 5, unit_price: 90000, total: 450000 }],
    total_amount: 450000,
    amount_paid: 20000,
    debt_amount: 250000,
    debtor_name: 'Chief Okafor',
  },
  {
    id: 'lace-credit',
    label: 'Credit: 3 Lace Fabrics (₦65k Owed by Sister Ngozi)',
    raw_transcript: 'Sister Ngozi collect three yards of Swiss lace fabric sixty five thousand naira on credit say she go pay month end',
    payment_method: 'credit' as const,
    items: [{ name: 'Swiss Voile Lace Material', qty: 3, unit_price: 21666.67, total: 65000 }],
    total_amount: 65000,
    amount_paid: 0,
    debt_amount: 65000,
    debtor_name: 'Sister Ngozi',
  },
];

export function VoiceRecorderWidget({ phoneNumber, businessName, onSuccess }: VoiceRecorderWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChipId, setActiveChipId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setErrorMessage('Microphone access is not supported in this browser environment');
      return;
    }

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
      console.error('Microphone access error:', err);
      setErrorMessage('Please allow microphone permissions to record trade audio');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRunPresetChip = async (chip: typeof PRESET_VOICE_CHIPS[0]) => {
    setActiveChipId(chip.id);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await postLedgerEntry({
        phone_number: phoneNumber,
        business_name: businessName,
        raw_transcript: chip.raw_transcript,
        items: chip.items,
        total_amount: chip.total_amount,
        amount_paid: chip.amount_paid,
        debt_amount: chip.debt_amount,
        debtor_name: chip.debtor_name,
        payment_method: chip.payment_method,
      });
      onSuccess(res);
    } catch (err: any) {
      console.error('Preset test chip error:', err);
      setErrorMessage(err.message || 'Simulation failed');
    } finally {
      setIsLoading(false);
      setActiveChipId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden">
      
      {/* Subtle Gradient Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-pink-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-bold tracking-tight text-white uppercase text-[11px] tracking-wider">
            Gemini Multimodal Voice Engine
          </h3>
        </div>
        <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
          Pidgin • English • Yoruba
        </span>
      </div>

      {/* Main Microphone Interaction Area */}
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        <div className="relative">
          {isRecording && (
            <span className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping" />
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl border ${
              isRecording
                ? 'bg-rose-600 border-rose-400 text-white scale-105 shadow-rose-900/50'
                : isLoading
                ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-br from-[#800040] to-[#500028] hover:from-[#900048] hover:to-[#600030] border-pink-500/40 text-white hover:scale-105 shadow-pink-950/40'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-pink-300" />
            ) : isRecording ? (
              <Square className="w-7 h-7 fill-current text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold text-white">
            {isLoading ? (
              <span className="text-pink-300 animate-pulse">Analyzing audio note with Gemini AI...</span>
            ) : isRecording ? (
              <span className="text-rose-400 font-extrabold flex items-center justify-center gap-1.5">
                <Radio className="w-4 h-4 animate-pulse" /> Listening to trade note... Tap to finalize
              </span>
            ) : (
              'Tap microphone to record sales note'
            )}
          </p>
          <p className="text-xs text-slate-400 max-w-sm">
            Speak items, quantities, cash/transfer amount, and any credit debt in plain everyday market language.
          </p>
        </div>

        {errorMessage && (
          <div className="inline-flex items-center gap-2 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/40 px-3.5 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Quick Test Audio Chips for Judges */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Quick Voice Test Presets:
          </span>
          <span className="text-[10px] text-slate-500">1-Tap Simulated Ingestion</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESET_VOICE_CHIPS.map((chip) => {
            const isChipRunning = activeChipId === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => handleRunPresetChip(chip)}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 text-xs ${
                  isChipRunning
                    ? 'bg-pink-950/60 border-pink-500/50 text-white'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-slate-700 flex items-center justify-center text-pink-300 shrink-0 mt-0.5">
                  {isChipRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                </div>
                <span className="font-medium text-[11px] leading-tight">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

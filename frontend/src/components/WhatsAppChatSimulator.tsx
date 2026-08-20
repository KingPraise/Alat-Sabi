'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Mic, 
  Square, 
  Loader2, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Building2, 
  ChevronRight,
  Smile,
  Paperclip
} from 'lucide-react';
import { useMerchant } from '@/context/MerchantContext';
import { postLedgerEntry, uploadVoiceAudio } from '@/services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  receipt?: any;
  isAudio?: boolean;
}

const CHAT_SUGGESTIONS = [
  {
    label: '3 Ankara 45k (Cash)',
    text: 'I sell 3 Ankara fabrics 45k cash to Madam Rose',
    payload: {
      raw_transcript: 'I sell 3 Ankara fabrics 45k cash to Madam Rose',
      payment_method: 'cash' as const,
      items: [{ name: 'Ankara Fabric Material', qty: 3, unit_price: 15000, total: 45000 }],
      total_amount: 45000,
      amount_paid: 45000,
      debt_amount: 0,
      debtor_name: undefined,
    },
  },
  {
    label: '5 bags rice 450k (200k paid, 250k debt to Alhaji)',
    text: 'Alhaji buy 5 bags rice 450k, 200k transfer, balance 250k debt',
    payload: {
      raw_transcript: 'Alhaji buy 5 bags rice 450k, 200k transfer, balance 250k debt',
      payment_method: 'split' as const,
      items: [{ name: 'Foreign Long Grain Rice (50kg)', qty: 5, unit_price: 90000, total: 450000 }],
      total_amount: 450000,
      amount_paid: 200000,
      debt_amount: 250000,
      debtor_name: 'Alhaji',
    },
  },
  {
    label: 'Debt Settlement (Mama Blessing paid 15k)',
    text: 'Mama Blessing just bring 15 thousand cash pay her balance',
    payload: {
      raw_transcript: 'Mama Blessing just bring 15 thousand cash pay her balance',
      payment_method: 'cash' as const,
      items: [{ name: 'Debt Settlement Clearance', qty: 1, unit_price: 15000, total: 15000 }],
      total_amount: 15000,
      amount_paid: 15000,
      debt_amount: 0,
      debtor_name: 'Mama Blessing',
    },
  },
];

export function WhatsAppChatSimulator() {
  const { currentMerchant } = useMerchant();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initial Bot Welcome Message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome-1',
      sender: 'bot',
      text: `Hello ${currentMerchant.name}! 👋\n\nWelcome to *ALAT Sabi WhatsApp Ledger*.\n\nSend a text or voice note of your trade (Pidgin/English/Yoruba) to record your sales and grow your Wema Restock Loan limit! 🛍️`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcomeMsg]);
  }, [currentMerchant]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendTextMessage = async (customText?: string, customPayload?: any) => {
    const messageToSend = customText || inputMessage;
    if (!messageToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setLoading(true);

    try {
      let res: any;
      if (customPayload) {
        res = await postLedgerEntry({
          phone_number: currentMerchant.phone,
          business_name: currentMerchant.name,
          ...customPayload,
        });
      } else {
        // Fallback natural language mock parser for free text
        res = await postLedgerEntry({
          phone_number: currentMerchant.phone,
          business_name: currentMerchant.name,
          raw_transcript: messageToSend,
          payment_method: messageToSend.toLowerCase().includes('credit') || messageToSend.toLowerCase().includes('debt') ? 'split' : 'cash',
          items: [{ name: 'Market Sales Items', qty: 1, unit_price: 35000, total: 35000 }],
          total_amount: 35000,
          amount_paid: messageToSend.toLowerCase().includes('credit') ? 15000 : 35000,
          debt_amount: messageToSend.toLowerCase().includes('credit') ? 20000 : 0,
          debtor_name: messageToSend.toLowerCase().includes('credit') ? 'Customer' : undefined,
        });
      }

      const receipt = res.receipt || res;
      const botResponseText = `✅ *Sales Recorded Successfully!* 🧾\n\n💰 *Total:* ₦${(receipt.total_amount || 35000).toLocaleString('en-NG')}\n💵 *Paid:* ₦${(receipt.amount_paid || 35000).toLocaleString('en-NG')}\n${receipt.debt_amount > 0 ? `⚠️ *Debt Owed:* ₦${receipt.debt_amount.toLocaleString('en-NG')} (${receipt.debtor_name || 'Customer'})\n` : ''}📈 *Wema Virtual Account:* ${currentMerchant.name}\n\n_Your daily cashflow has been updated for loan underwriting!_`;

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        receipt: receipt,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: `⚠️ *Could not record sale:* ${err.message || 'Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceRecording = async () => {
    audioChunksRef.current = [];
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      alert('Microphone not supported on this device');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());

        const userVoiceMsg: ChatMessage = {
          id: `voice-${Date.now()}`,
          sender: 'user',
          text: '🎤 Voice Note (0:04)',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAudio: true,
        };
        setMessages((prev) => [...prev, userVoiceMsg]);
        setLoading(true);

        try {
          const res = await uploadVoiceAudio(currentMerchant.phone, currentMerchant.name, audioBlob);
          const receipt = res.receipt || res;
          const botVoiceResponse: ChatMessage = {
            id: `bot-voice-${Date.now()}`,
            sender: 'bot',
            text: `🎙️ *Gemini AI Transcribed Audio:*\n_"${res.raw_transcript || 'Sales recorded'}"_\n\n✅ *Sales Saved to Ledger!* 🧾\n💰 *Total:* ₦${(receipt.total_amount || 45000).toLocaleString('en-NG')}\n💵 *Paid:* ₦${(receipt.amount_paid || 30000).toLocaleString('en-NG')}\n${receipt.debt_amount > 0 ? `⚠️ *Debt:* ₦${receipt.debt_amount.toLocaleString('en-NG')} (${receipt.debtor_name || 'Debtor'})\n` : ''}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, botVoiceResponse]);
        } catch (err: any) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              sender: 'bot',
              text: `⚠️ *Voice ingestion issue:* ${err.message}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <>
      {/* Floating WhatsApp Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20"
          aria-label="Open WhatsApp Chat Simulator"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              <MessageSquare className="w-7 h-7 fill-current text-white" />
            </>
          )}
        </button>
      </div>

      {/* WhatsApp Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] h-[560px] max-h-[85vh] bg-[#0b141a] text-slate-100 rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* WhatsApp Header */}
          <div className="bg-[#1f2c34] px-4 py-3 border-b border-slate-700 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#800040] to-[#500028] text-white font-black flex items-center justify-center border border-pink-500/40 shadow text-xs">
                  ALAT
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-[#1f2c34]" />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-tight leading-tight">ALAT Sabi Assistant</h4>
                <p className="text-[10px] text-[#25D366] font-semibold">online • Wema AI Bot</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* WhatsApp Chat Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0b141a] bg-opacity-95 text-xs">
            
            {/* Encryption Notice */}
            <div className="text-center my-1">
              <span className="bg-[#182229] text-amber-300 text-[10px] px-2.5 py-1 rounded-lg border border-amber-900/40 inline-block font-medium">
                🔒 Messages and calls are end-to-end encrypted with ALAT Sabi Ledger.
              </span>
            </div>

            {/* Message Bubbles */}
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed space-y-1 shadow-md ${
                      isUser
                        ? 'bg-[#005c4b] text-white rounded-tr-none'
                        : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/50'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#202c33] px-3.5 py-2 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-300 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#25D366]" />
                  <span>ALAT Sabi is typing...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestions Strip */}
          <div className="bg-[#111b21] px-2.5 py-2 border-t border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {CHAT_SUGGESTIONS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendTextMessage(chip.text, chip.payload)}
                disabled={loading}
                className="whitespace-nowrap bg-[#202c33] hover:bg-[#2a3942] border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-full text-[10px] font-medium transition-all shrink-0 flex items-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5 text-[#25D366]" />
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* WhatsApp Chat Input Footer */}
          <div className="bg-[#202c33] p-2 border-t border-slate-700/80 flex items-center gap-2 shrink-0">
            
            {/* Text Input Container */}
            <div className="flex-1 bg-[#2a3942] rounded-2xl px-3 py-1.5 flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTextMessage()}
                placeholder="Type sales note in Pidgin..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Mic Record Button */}
            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isRecording 
                  ? 'bg-rose-600 text-white animate-pulse' 
                  : 'bg-[#2a3942] hover:bg-slate-700 text-[#25D366]'
              }`}
              title={isRecording ? 'Stop voice recording' : 'Record voice note'}
            >
              {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSendTextMessage()}
              disabled={loading || !inputMessage.trim()}
              className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center disabled:opacity-40 transition-all shadow"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>

        </div>
      )}
    </>
  );
}

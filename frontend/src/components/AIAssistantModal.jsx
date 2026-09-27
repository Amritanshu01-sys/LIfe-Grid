import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Mic, MicOff, Send, X, Sparkles, Volume2, ShieldAlert,
  ArrowRight, PhoneCall, AlertCircle, Compass, Droplet, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AIAssistantModal({ activeEmergencyId }) {
  const { currentRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello! I am LIFEGRID AI, your emergency coordination assistant. You can speak or type in English, Hindi, or Hinglish (e.g., 'Mera accident ho gaya hai' or 'Where is my ambulance?'). How can I help you?",
      tools: null,
      actions: ["Request Ambulance", "Where is my ambulance?", "Find O- blood", "Hospital capacity"]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Web Speech Recognition setup
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English / Hinglish friendly

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please use Google Chrome or type in the chat box.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Mic start failed", err);
      }
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Remove safety brackets for clean speech
      const cleanText = text.replace(/\[.*?\]/g, '').replace(/[*#]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const msg = (textToSend || inputText).trim();
    if (!msg) return;

    setInputText('');
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await api.aiChat(msg, currentRole, activeEmergencyId);
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: res.reply,
        tools: res.tool_called ? { name: res.tool_called, result: res.tool_result } : null,
        actions: res.suggested_actions || []
      };
      setMessages(prev => [...prev, aiMsg]);

      // Speak response if user spoke
      if (isListening) {
        speakText(res.reply);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: "I experienced a temporary communication hiccup with the control server. In an active emergency, please dial 112 immediately.",
          tools: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white px-4 py-3 rounded-full shadow-2xl border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer group"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="font-semibold text-sm tracking-wide">LIFEGRID AI</span>
      </button>

      {/* Assistant Modal Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  LIFEGRID AI Assistant
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                    Voice + NLP
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Controlled emergency tools & triage layer</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clinical Safety Guardrail Warning */}
          <div className="bg-amber-950/40 border-b border-amber-600/30 px-3 py-1.5 text-[11px] text-amber-200/90 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>AI Assistant layer: Does not prescribe or replace doctors.</span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs md:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-rose-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Tool execution badge if tool was called */}
                  {m.tools && (
                    <div className="mt-2 pt-2 border-t border-slate-700/80 text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Executed Controlled Tool: <strong>{m.tools.name}()</strong></span>
                    </div>
                  )}
                </div>

                {/* Speak button for AI messages */}
                {m.sender === 'ai' && (
                  <button
                    onClick={() => speakText(m.text)}
                    className="mt-1 text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-1"
                  >
                    <Volume2 className="w-3 h-3" /> Listen
                  </button>
                )}

                {/* Quick Action Chips */}
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(act)}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-2.5 py-1 rounded-full transition flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRight className="w-2.5 h-2.5 text-rose-400" />
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 p-2.5 rounded-xl w-fit">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                LIFEGRID AI is executing controlled tools...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={isListening ? "Listening... Click to stop" : "Click to speak in Hindi/English"}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask AI or say 'Mera accident ho gaya'..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

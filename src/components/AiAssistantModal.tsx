import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  MapPin, 
  ExternalLink, 
  Compass, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Business } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  matchedBusinesses?: Business[];
}

interface AiAssistantModalProps {
  onClose: () => void;
  onSelectBusiness: (business: Business) => void;
  onLocateBusinessOnMap: (business: Business) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  onClose,
  onSelectBusiness,
  onLocateBusinessOnMap
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Mbolo ! Je suis l'Assistant IA de Gabon Business Map 🇬🇦.\n\nJe peux vous orienter avec précision vers les entreprises enregistrées dans les 9 provinces du Gabon (Libreville, Port-Gentil, Moanda, Franceville, Lambaréné, Oyem...). Posez-moi votre question en langage naturel !",
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "Où trouver un restaurant de prestige au bord de mer à Libreville ?",
    "Quelles sont les grandes entreprises minières à Moanda ?",
    "Donne-moi les coordonnées de l'Hôpital Albert Schweitzer à Lambaréné",
    "Comment réserver un train pour Franceville depuis Owendo ?",
    "Existe-t-il une pharmacie ou des soins référencés à Oyem ?"
  ];

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });

      if (!res.ok) {
        throw new Error('Erreur de communication avec le serveur IA');
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || "Je n'ai pas pu trouver d'informations correspondantes.",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        matchedBusinesses: data.matchedBusinesses || []
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: "Désolé, une erreur temporaire s'est produite lors de la consultation de l'annuaire. Veuillez réessayer dans un instant.",
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Assistant IA • Gabon Business Map
                </h3>
                <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded">
                  En ligne
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Alimenté par la base de données certifiée des 9 provinces du Gabon
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4 text-amber-300" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className={`text-[10px] mt-1.5 block ${msg.sender === 'user' ? 'text-emerald-100 text-right' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Matched Companies Quick Cards */}
                {msg.matchedBusinesses && msg.matchedBusinesses.length > 0 && (
                  <div className="space-y-2 pt-1 w-full">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Fiches associées sur Gabon Business Map :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.matchedBusinesses.map(b => (
                        <div
                          key={b.id}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {(b.logo && b.logo.trim()) || (b.coverImage && b.coverImage.trim()) ? (
                              <img
                                src={(b.logo && b.logo.trim()) || (b.coverImage && b.coverImage.trim()) || ''}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0"
                                onError={(e: any) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center border border-slate-100 shrink-0">
                                {(b.name || 'G').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-slate-900 truncate">
                                {b.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                📍 {b.location.city} • {b.location.province}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                            <button
                              onClick={() => {
                                onSelectBusiness(b);
                                onClose();
                              }}
                              className="py-1 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded text-center transition-colors flex items-center justify-center gap-1"
                            >
                              <span>Voir fiche</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>

                            <button
                              onClick={() => {
                                onLocateBusinessOnMap(b);
                                onClose();
                              }}
                              className="py-1 px-2 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded text-center transition-colors flex items-center justify-center gap-1"
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span>Sur la carte</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Recherche dans la base des entreprises gabonaises...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="p-2.5 bg-white border-t border-slate-200 overflow-x-auto scrollbar-none flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Idées :
          </span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 px-3 py-1 rounded-full whitespace-nowrap transition-colors shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Posez votre question (ex: Quels restaurants au bord de mer à Libreville ?)..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Envoyer</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

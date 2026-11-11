import React, { useState } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  Layers, 
  Code2, 
  Database, 
  MapPin, 
  ShieldCheck, 
  Search, 
  Sliders, 
  ArrowRight,
  Sparkles,
  GitMerge
} from 'lucide-react';
import { MULTI_AGENTS_TEAM } from '../data/gabonData';
import { AgentContribution } from '../types';

export const MultiAgentsView: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentContribution>(MULTI_AGENTS_TEAM[0]);

  const getAgentIcon = (id: number) => {
    switch (id) {
      case 1: return Sliders;
      case 2: return Layers;
      case 3: return Code2;
      case 4: return Sparkles;
      case 5: return MapPin;
      case 6: return Database;
      case 7: return ShieldCheck;
      case 8: return Search;
      case 9: return CheckCircle2;
      default: return Cpu;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title & Multi-Agent Architecture Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white p-6 sm:p-10 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <GitMerge className="w-3.5 h-3.5" />
            Architecture Multi-Agents IA Coordonnée
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            L'Équipe des 9 Agents IA Spécialisés
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Pour concevoir et développer Gabon Business Map à un niveau d'excellence digne d'une startup technologique nationale, 9 agents IA ont collaboré de manière orchestrée sous la direction d'un Superviseur central.
          </p>
        </div>
      </div>

      {/* Grid of the 9 Agents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MULTI_AGENTS_TEAM.map(agent => {
          const Icon = getAgentIcon(agent.id);
          const isSelected = selectedAgent.id === agent.id;

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Livré & Opérationnel
                  </span>
                </div>

                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {agent.name.split(':')[0]}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-0.5 mb-1.5">
                  {agent.role}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {agent.mission}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <span>{agent.keyDeliverables.length} livrables validés</span>
                </div>
                <span className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                  Détails <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Detailed Sheet */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-extrabold uppercase text-emerald-700 tracking-wider">
              Fiche de poste & validation
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {selectedAgent.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mission principale : {selectedAgent.mission}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selectedAgent.technologies.map((tech, idx) => (
              <span key={idx} className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deliverables List */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              Livrables Clés Réalisés
            </h3>
            <ul className="space-y-2.5">
              {selectedAgent.keyDeliverables.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coordination & Summary */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              Intégration & Coordination avec les autres agents
            </h3>
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-emerald-950 mb-2">Synthèse du superviseur :</p>
              {selectedAgent.summary}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 block">Protocole d'échange multi-agents :</span>
              <p>
                Toutes les interfaces de données, modèles géographiques et endpoints ont été normalisés sur le même contrat TypeScript pour assurer 0 friction lors du rendu cartographique et des requêtes d'assistant IA.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

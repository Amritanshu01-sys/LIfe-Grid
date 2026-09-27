import React from 'react';
import {
  ShieldAlert, Activity, Heart, Truck, Building2, Stethoscope,
  TrafficCone, Droplets, Bot, ArrowRight, CheckCircle2, AlertTriangle,
  Zap, Radio, MapPin, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ setActiveTab }) {
  const { switchRole } = useAuth();

  const handleLaunchRole = (roleId) => {
    switchRole(roleId);
    setActiveTab(roleId);
  };

  const workflowSteps = [
    { title: "Patient / Citizen", desc: "One-click emergency intake with live GPS & AI voice assistant in Hindi/English.", icon: "👤", role: "patient" },
    { title: "Ambulance Crew", desc: "Real-time routing, dynamic green corridors & pre-arrival medical summaries.", icon: "🚑", role: "ambulance" },
    { title: "Traffic Control", desc: "Smart green wave corridor synchronization to eliminate arterial junction delays.", icon: "🚦", role: "traffic" },
    { title: "Destination Hospital", desc: "Multi-factor matching, bed/ICU booking & automated pre-arrival trauma alerts.", icon: "🏥", role: "hospital" },
    { title: "Attending Doctor", desc: "Pre-briefed clinical chart, allergy alerts, diagnostic orders & digital triage.", icon: "🩺", role: "doctor" },
    { title: "Family Member", desc: "Privacy-safe real-time status tracker, vehicle ETA & milestone timeline.", icon: "❤️", role: "family" },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 text-center">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[350px] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-rose-400 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          SIH 2026 PROTOTYPE — AI-POWERED EMERGENCY COORDINATION
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          LIFEGRID
          <span className="block text-xl sm:text-2xl font-medium text-rose-400 mt-2">
            AI-Powered Emergency Response & Coordination Network
          </span>
        </h1>

        <p className="text-lg sm:text-xl font-semibold text-slate-300 mt-4 tracking-wide">
          "Connect. Coordinate. Respond."
        </p>

        <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          One unified, patient-centric emergency workflow connecting patients, families, ambulances, traffic authorities, hospitals, doctors, and blood banks through real-time telemetry and conversational AI.
        </p>

        {/* Hero Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <button
            onClick={() => handleLaunchRole('patient')}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-rose-600/30 transition hover:scale-105 active:scale-95 cursor-pointer text-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            REQUEST EMERGENCY
          </button>

          <button
            onClick={() => handleLaunchRole('admin')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl border border-slate-700 transition hover:border-slate-600 cursor-pointer text-sm"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            CONTROL ROOM OVERVIEW
          </button>
        </div>

        {/* Clear Strategic Positioning Notice */}
        <div className="mt-10 max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-left text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Important Architecture Positioning:</strong>
              <span className="ml-1 text-slate-400">
                LIFEGRID does <em>not</em> claim to replace established emergency services like India's ERSS-112. Instead, LIFEGRID serves as a specialized <strong>digital coordination layer</strong> that bridges information gaps between the ambulance on the road, city traffic junctions, the hospital ER bay, attending doctors, and waiting families.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Unified Emergency Journey Diagram */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">The Connected Emergency Journey</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Emergency data moves seamlessly with the patient instead of isolated phone calls
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflowSteps.map((step, idx) => (
            <div
              key={idx}
              onClick={() => handleLaunchRole(step.role)}
              className="bg-slate-900/70 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-5 transition-all hover:bg-slate-900 cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700/60 group-hover:scale-110 transition-transform">
                  {step.icon}
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  STAGE 0{idx + 1}
                </span>
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-rose-400 transition-colors">
                {step.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {step.desc}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform">
                Launch Portal <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Innovation & Differentiation Pillars */}
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Key Differentiators</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Why LIFEGRID Solves The Golden Hour Crisis
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              Every minute lost in inter-agency coordination reduces survival probability in trauma and cardiac emergencies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold mb-3">
                01
              </div>
              <h4 className="font-semibold text-white text-sm">Multi-Factor Hospital Matching</h4>
              <p className="text-xs text-slate-400 mt-1">
                Doesn't just pick the closest hospital. Scrutinizes real-time ICU beds, trauma/cath capabilities, and ER overload.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold mb-3">
                02
              </div>
              <h4 className="font-semibold text-white text-sm">Traffic Green Wave Corridor</h4>
              <p className="text-xs text-slate-400 mt-1">
                Simulated priority alerts inform approaching intersections, dynamically turning traffic lights green for ambulances.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-3">
                03
              </div>
              <h4 className="font-semibold text-white text-sm">Safe Controlled AI Tools</h4>
              <p className="text-xs text-slate-400 mt-1">
                Natural speech & chat in Hinglish with strict guardrails: AI executes bounded API tools and refuses to make clinical diagnoses.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold mb-3">
                04
              </div>
              <h4 className="font-semibold text-white text-sm">Medical Continuity & Transfer</h4>
              <p className="text-xs text-slate-400 mt-1">
                Carries verified penicillin allergies and asthma history directly to the attending doctor; supports seamless ambulance transfer.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

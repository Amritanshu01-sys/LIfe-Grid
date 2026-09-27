import React, { useState, useEffect } from 'react';
import {
  TrafficCone, AlertTriangle, CheckCircle2, ShieldAlert,
  ArrowRight, Activity, Zap, Radio, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function TrafficPortal() {
  const [signals, setSignals] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrafficData = async () => {
    try {
      const sigs = await api.getSignals();
      setSignals(sigs);
      const cors = await api.getActiveCorridors();
      setCorridors(cors);
    } catch (e) {
      console.error('Failed to load traffic portal:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualOverride = async (signalId, targetState) => {
    try {
      await api.overrideSignal(signalId, targetState, targetState === 'GREEN');
      await fetchTrafficData();
    } catch (e) {
      alert('Override error: ' + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
            <TrafficCone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Municipal Traffic & Green Corridor Command
              <span className="text-xs bg-slate-800 text-purple-400 px-2 py-0.5 rounded-full font-mono">
                Simulated Grid Control
              </span>
            </h1>
            <p className="text-xs text-slate-400">Arterial Signal Synchronization & Emergency Priority Clearence</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Green Corridor Protocol: <strong>ONLINE</strong></span>
        </div>
      </div>

      {/* Prototype Disclaimer Banner */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 text-xs text-slate-300 flex items-start gap-3">
        <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-semibold">Simulated Signal Priority Architecture (Section 10 & 21 Compliance):</strong>
          <span className="text-slate-400">
            For this SIH prototype, signal lights and green corridor triggers are simulated in software. In actual deployment, this coordination module interfaces with municipal Intelligent Transportation Systems (ITS) and SCATS/SCOOT traffic controllers via authorized government APIs.
          </span>
        </div>
      </div>

      {/* Active Emergency Corridors Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          Active Emergency Corridors ({corridors.length})
        </h2>

        {corridors.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
            No active ambulance priority corridor requests currently pending.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {corridors.map((c) => (
              <div
                key={c.ambulance_id}
                className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded">
                      CORRIDOR PRIORITY • {c.priority}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">
                      Ambulance {c.vehicle_number}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Speed</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">{c.speed_kmh} km/h</span>
                  </div>
                </div>

                <div className="text-xs text-slate-300">
                  Emergency: <strong>{c.emergency_type}</strong> • Corridor ETA: <strong>{c.eta_minutes} min</strong>
                </div>

                {/* Priority Signal Wave Sequence */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">Upcoming Synchronized Intersections:</span>
                  <div className="space-y-2">
                    {c.upcoming_intersections.map((sig) => (
                      <div
                        key={sig.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              sig.current_state === 'GREEN'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                                : sig.current_state === 'YELLOW'
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-semibold text-white">{sig.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {sig.is_priority_green ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                              GREEN WAVE
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Standard Cycle</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Monitored Intersections Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">All Monitored Traffic Intersections ({signals.length})</h3>
          <span className="text-xs text-slate-400">Manual Signal Control Override</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {signals.map((sig) => (
            <div
              key={sig.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <strong className="text-white text-xs">{sig.intersection_name}</strong>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sig.current_state === 'GREEN'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : sig.current_state === 'YELLOW'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {sig.current_state}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Congestion: {sig.congestion_level}</span>
                <span>Priority: {sig.emergency_priority_active ? 'ENGAGED' : 'OFF'}</span>
              </div>

              {/* Manual Override Buttons */}
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => handleManualOverride(sig.id, 'GREEN')}
                  className="flex-1 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-bold transition cursor-pointer"
                >
                  Green
                </button>
                <button
                  onClick={() => handleManualOverride(sig.id, 'YELLOW')}
                  className="flex-1 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white text-[11px] font-bold transition cursor-pointer"
                >
                  Yellow
                </button>
                <button
                  onClick={() => handleManualOverride(sig.id, 'RED')}
                  className="flex-1 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-[11px] font-bold transition cursor-pointer"
                >
                  Red
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

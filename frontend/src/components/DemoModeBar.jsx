import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity, AlertTriangle, ShieldCheck, Gauge } from 'lucide-react';
import { api } from '../services/api';

export default function DemoModeBar({ onSimulationUpdate }) {
  const [status, setStatus] = useState({
    is_running: false,
    current_step: 0,
    total_steps: 16,
    step_name: 'Ready for SIH Demonstration',
    speed_multiplier: 1.0,
    traffic_level: 'MODERATE'
  });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.getSimulationStatus();
      setStatus(res);
      if (onSimulationUpdate) onSimulationUpdate(res);
    } catch (e) {
      console.error('Error fetching sim status', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    await api.startSimulation();
    await fetchStatus();
    setLoading(false);
  };

  const handlePause = async () => {
    setLoading(true);
    await api.pauseSimulation();
    await fetchStatus();
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    await api.resetSimulation();
    await fetchStatus();
    setLoading(false);
  };

  const handleStep = async () => {
    setLoading(true);
    await api.stepSimulation();
    await fetchStatus();
    setLoading(false);
  };

  const handleSpeed = async (multiplier) => {
    await api.setSimulationSpeed(multiplier);
    await fetchStatus();
  };

  const handleTraffic = async (level) => {
    await api.setSimulationTraffic(level);
    await fetchStatus();
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-rose-500/30 px-4 py-2 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
        {/* Left: SIH Demo Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/20 border border-rose-500/40 text-rose-300 font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            SIH 2026 LIVE DEMO MODE
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Step {status.current_step}/{status.total_steps}: <strong className="text-white">{status.step_name}</strong></span>
          </div>
        </div>

        {/* Center: Stepper Progress indicator */}
        <div className="hidden lg:flex items-center gap-1 max-w-md w-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              title={`Step ${i + 1}`}
              className={`h-2 flex-1 rounded-sm transition-all duration-300 ${
                i < status.current_step
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                  : i === status.current_step
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-2">
          {!status.is_running ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg shadow transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              START SIMULATION
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={loading}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1.5 rounded-lg shadow transition cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              PAUSE
            </button>
          )}

          <button
            onClick={handleStep}
            disabled={loading}
            title="Step Forward"
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5" />
            Step
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            title="Reset Simulation"
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          {/* Speed Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => handleSpeed(1.0)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                status.speed_multiplier === 1.0 ? 'bg-slate-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => handleSpeed(2.0)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                status.speed_multiplier === 2.0 ? 'bg-slate-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2x
            </button>
          </div>

          {/* Traffic Density Toggle */}
          <select
            value={status.traffic_level}
            onChange={(e) => handleTraffic(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-rose-500"
          >
            <option value="LOW">Traffic: Low</option>
            <option value="MODERATE">Traffic: Moderate</option>
            <option value="HEAVY">Traffic: Heavy</option>
          </select>
        </div>
      </div>
    </div>
  );
}

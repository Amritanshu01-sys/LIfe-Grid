import React from 'react';
import {
  ShieldAlert, Activity, Heart, Truck, Building2, Stethoscope,
  TrafficCone, Droplets, User, Radio, Home
} from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { currentRole, currentUser, switchRole } = useAuth();

  const navItems = [
    { id: 'landing', label: 'Overview', icon: Home },
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'family', label: 'Family', icon: Heart },
    { id: 'ambulance', label: 'Ambulance', icon: Truck },
    { id: 'hospital', label: 'Hospital', icon: Building2 },
    { id: 'doctor', label: 'Doctor', icon: Stethoscope },
    { id: 'traffic', label: 'Traffic', icon: TrafficCone },
    { id: 'bloodbank', label: 'Blood Bank', icon: Droplets },
    { id: 'admin', label: 'Control Room', icon: ShieldAlert },
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div
          onClick={() => setActiveTab('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">LIFEGRID</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/30 uppercase tracking-widest">
                ERSS+
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Connect. Coordinate. Respond.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Persona Switcher Dropdown for SIH Demonstrations */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Active Persona</div>
              <div className="text-xs font-bold text-white capitalize">{currentRole}</div>
            </div>

            <select
              value={currentRole}
              onChange={(e) => {
                switchRole(e.target.value);
                setActiveTab(e.target.value);
              }}
              className="bg-slate-800 text-rose-400 border border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="patient">👤 Patient View</option>
              <option value="family">❤️ Family View</option>
              <option value="ambulance">🚑 Ambulance Crew</option>
              <option value="hospital">🏥 Hospital Desk</option>
              <option value="doctor">🩺 Attending Doctor</option>
              <option value="traffic">🚦 Traffic Control</option>
              <option value="bloodbank">🩸 Blood Bank Ops</option>
              <option value="admin">🚨 Control Room (Admin)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="xl:hidden flex items-center gap-1 px-4 py-2 border-t border-slate-800/80 overflow-x-auto bg-slate-950/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                isActive ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Activity, Truck, Building2, TrafficCone, Droplets,
  Radio, Clock, AlertTriangle, ArrowRight, RefreshCw, UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import EmergencyMap from '../components/EmergencyMap';

export default function AdminControlRoom() {
  const [overview, setOverview] = useState(null);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [reassignAmbulanceId, setReassignAmbulanceId] = useState('');
  const [reassignHospitalId, setReassignHospitalId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
      if (!selectedEmergency && data.active_emergencies.length > 0) {
        setSelectedEmergency(data.active_emergencies[0]);
        const events = await api.getTimeline(data.active_emergencies[0].id);
        setTimeline(events);
      }
    } catch (e) {
      console.error('Failed to fetch admin overview:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectEmergency = async (em) => {
    setSelectedEmergency(em);
    try {
      const events = await api.getTimeline(em.id);
      setTimeline(events);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualReassign = async (e) => {
    e.preventDefault();
    if (!selectedEmergency) return;
    try {
      await api.reassignEmergency(
        selectedEmergency.id,
        reassignAmbulanceId ? Number(reassignAmbulanceId) : null,
        reassignHospitalId ? Number(reassignHospitalId) : null
      );
      alert('Manual dispatch override executed successfully.');
      await fetchOverview();
    } catch (err) {
      alert('Reassign error: ' + err.message);
    }
  };

  if (loading || !overview) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        Initializing Central Emergency Control Room telemetry...
      </div>
    );
  }

  const { stats } = overview;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Central Emergency Control Room
              <span className="text-xs bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-full font-mono">
                Command Ops Center
              </span>
            </h1>
            <p className="text-xs text-slate-400">Single-Pane-Of-Glass Dispatch Telematics & Multi-Agency Coordination</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            ALL DISPATCH HUBS ONLINE
          </span>
        </div>
      </div>

      {/* Control Room Top KPI Grid (Section 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 block">Active Incidents</span>
          <div className="text-2xl font-extrabold text-rose-500 mt-1">
            {stats.active_emergencies}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 block">Available Fleet</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {stats.fleet_available} <span className="text-xs font-normal text-slate-500">/ {stats.fleet_total}</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 block">Active Dispatches</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {stats.fleet_active}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 block">Hospital Beds Free</span>
          <div className="text-2xl font-extrabold text-white mt-1">
            {stats.available_beds}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 block">ICU Bays Available</span>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">
            {stats.available_icu}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 block">Priority Corridors</span>
          <div className="text-2xl font-extrabold text-purple-400 mt-1">
            {stats.priority_green_corridors}
          </div>
        </div>
      </div>

      {/* Main Map & Active Incidents Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Full City Telemetry Map */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Metropolitan Live GPS Incident & Fleet Map
            </h3>
            <span className="text-xs text-slate-400">
              {overview.ambulances.length} Ambulances • {overview.hospitals.length} Hospitals
            </span>
          </div>
          <EmergencyMap
            center={[28.6139, 77.2090]}
            zoom={12}
            ambulances={overview.ambulances}
            hospitals={overview.hospitals}
            signals={overview.traffic_signals}
            activeEmergency={selectedEmergency}
            routeWaypoints={selectedEmergency?.route_details?.routes?.[0]?.waypoints || []}
            className="h-[460px] w-full"
          />
        </div>

        {/* Active Emergency Call Queue */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Active Queue ({overview.active_emergencies.length})</h3>
            <span className="text-[10px] text-slate-400 font-mono">PRIORITY SORT</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[400px] flex-1 pr-1">
            {overview.active_emergencies.map((em) => (
              <div
                key={em.id}
                onClick={() => handleSelectEmergency(em)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                  selectedEmergency?.id === em.id
                    ? 'bg-rose-950/30 border-rose-500 shadow-md'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-rose-400 text-[11px]">{em.tracking_code}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {em.status}
                  </span>
                </div>
                <div className="font-bold text-white text-sm">{em.emergency_type}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">{em.pickup_address}</div>
                <div className="flex items-center justify-between text-[11px] mt-2 text-slate-400 border-t border-slate-800/80 pt-1.5">
                  <span>Priority: <strong className="text-white">{em.priority}</strong></span>
                  <span>ETA: <strong className="text-amber-400">{em.eta_minutes} min</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Dispatch Overrides & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Manual Reassignment Controller */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Manual Dispatch Override</h3>
          </div>

          {selectedEmergency ? (
            <form onSubmit={handleManualReassign} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Selected Incident:</span>
                <strong className="text-white ml-1">{selectedEmergency.tracking_code} ({selectedEmergency.emergency_type})</strong>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Reassign Ambulance Fleet Unit</label>
                <select
                  value={reassignAmbulanceId}
                  onChange={(e) => setReassignAmbulanceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Keep currently assigned</option>
                  {overview.ambulances.map(a => (
                    <option key={a.id} value={a.id}>
                      🚑 {a.vehicle_number} ({a.ambulance_type}, Status: {a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Divert To Target Hospital</label>
                <select
                  value={reassignHospitalId}
                  onChange={(e) => setReassignHospitalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Keep currently matched</option>
                  {overview.hospitals.map(h => (
                    <option key={h.id} value={h.id}>
                      🏥 {h.name} (Beds: {h.available_beds}, ICU: {h.available_icu})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                APPLY MANUAL DISPATCH OVERRIDE
              </button>
            </form>
          ) : (
            <div className="text-slate-400 text-xs">Select an incident from the queue to override dispatch.</div>
          )}
        </div>

        {/* Selected Incident Event Timeline */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              Incident Audit Timeline — {selectedEmergency?.tracking_code || 'None'}
            </h3>
            <span className="text-[11px] text-slate-400">Chronological Event Trail</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2 text-xs">
            {timeline.length === 0 ? (
              <div className="text-slate-400 py-4">No events logged yet for this incident.</div>
            ) : (
              timeline.map(ev => (
                <div key={ev.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                  <span className="font-mono text-slate-400 text-[11px] shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <strong className="text-white">{ev.title}</strong>
                    <div className="text-slate-400 text-[11px] mt-0.5">{ev.description}</div>
                    <span className="inline-block mt-1 text-[10px] font-mono bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded">
                      Role: {ev.actor_role}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

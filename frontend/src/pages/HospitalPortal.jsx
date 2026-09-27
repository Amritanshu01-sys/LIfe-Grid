import React, { useState, useEffect } from 'react';
import {
  Building2, AlertTriangle, CheckCircle2, User, Clock, Activity,
  Bed, Heart, Stethoscope, ShieldAlert, ArrowRight, Check, X
} from 'lucide-react';
import { api } from '../services/api';

export default function HospitalPortal() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, patients, beds
  const [hospital, setHospital] = useState(null);
  const [preAlerts, setPreAlerts] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(1);
  const [loading, setLoading] = useState(true);

  // Capacity states
  const [bedsFree, setBedsFree] = useState(25);
  const [icuFree, setIcuFree] = useState(6);
  const [erStatus, setErStatus] = useState('NORMAL');

  const fetchHospitalData = async () => {
    try {
      const all = await api.listHospitals();
      setHospitalsList(all);
      const current = all.find(h => h.id === selectedHospitalId) || all[0];
      if (current) {
        setHospital(current);
        setBedsFree(current.available_beds);
        setIcuFree(current.available_icu);
        setErStatus(current.status);
        const alerts = await api.getPreAlerts(current.id);
        setPreAlerts(alerts);
      }
    } catch (e) {
      console.error('Failed to fetch hospital portal:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalData();
    const interval = setInterval(fetchHospitalData, 3000);
    return () => clearInterval(interval);
  }, [selectedHospitalId]);

  const handleUpdateCapacity = async () => {
    if (!hospital) return;
    try {
      const res = await api.updateHospitalCapacity(hospital.id, {
        available_beds: bedsFree,
        available_icu: icuFree,
        status: erStatus
      });
      setHospital(res);
      alert('Hospital emergency capacity successfully updated.');
    } catch (e) {
      alert('Failed to update capacity: ' + e.message);
    }
  };

  const handleAcceptPatient = async (emergencyId) => {
    try {
      await api.acceptEmergency(hospital.id, emergencyId);
      await fetchHospitalData();
      alert('Patient intake accepted! Resuscitation Bay Reserved.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header and Hospital Selector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Hospital Emergency Command
              <span className="text-xs bg-slate-800 text-blue-400 px-2.5 py-0.5 rounded-full font-mono">
                {hospital?.code || 'AIIMS-TRM'}
              </span>
            </h1>
            <p className="text-xs text-slate-400">Incoming Trauma Pre-Alerts & Capacity Coordination</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs font-semibold text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {hospitalsList.map(h => (
              <option key={h.id} value={h.id}>🏥 {h.name}</option>
            ))}
          </select>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pre-Alerts
            </button>
            <button
              onClick={() => setActiveTab('beds')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'beds' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Beds & Capacity
            </button>
          </div>
        </div>
      </div>

      {/* Capacity KPI Bar */}
      {hospital && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs text-slate-400">Available General Beds</span>
            <div className="text-2xl font-bold text-white mt-1">
              {hospital.available_beds} <span className="text-xs font-normal text-slate-500">/ {hospital.total_beds}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs text-slate-400">Available ICU Bays</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {hospital.available_icu} <span className="text-xs font-normal text-slate-500">/ {hospital.total_icu}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs text-slate-400">Specialty Readiness</span>
            <div className="text-xs font-bold text-slate-200 mt-2 flex flex-wrap gap-1">
              {hospital.trauma_ready && <span className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">Trauma</span>}
              {hospital.cardiac_ready && <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Cath Lab</span>}
              {hospital.pediatric_ready && <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Pediatric</span>}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs text-slate-400">ER Triage Status</span>
            <div className="mt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                hospital.status === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {hospital.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PRE-ARRIVAL ALERTS (Section 8) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Incoming Emergency Pre-Arrival Alerts ({preAlerts.length})
            </h2>
            <span className="text-xs text-slate-400">Prepares resuscitation bay before ambulance touch-down</span>
          </div>

          {preAlerts.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
              No incoming emergency transports in the active corridor at this moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {preAlerts.map((alert) => (
                <div
                  key={alert.emergency_id}
                  className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-5 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded">
                        INCOMING EMERGENCY • {alert.tracking_code}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">{alert.emergency_type}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Ambulance ETA</span>
                      <span className="text-xl font-extrabold text-rose-400 animate-pulse">
                        ~{alert.eta_minutes} Min
                      </span>
                    </div>
                  </div>

                  {/* Pre-Arrival Packet */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Patient Profile</span>
                      <div className="font-bold text-white text-sm mt-0.5">{alert.patient_name}</div>
                      <div className="text-slate-400">{alert.age} Yrs • {alert.gender}</div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Blood Group</span>
                      <div className="font-extrabold text-rose-400 text-lg mt-0.5">{alert.blood_group}</div>
                      <div className="text-[11px] text-slate-400">Cross-match queued</div>
                    </div>
                  </div>

                  {/* Allergy & Clinical Precaution Alert */}
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200">
                    <div className="font-bold flex items-center gap-1 text-rose-400">
                      <AlertTriangle className="w-4 h-4" /> ALLERGY CONTRAINDICATION: {alert.allergies}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Attending trauma team notified to prepare non-penicillin antimicrobial prophylaxis.
                    </p>
                  </div>

                  {/* Required Specialty & Ambulance Info */}
                  <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400">Required Team:</span>
                      <strong className="text-white ml-1">{alert.required_specialty}</strong>
                    </div>
                    <div className="text-slate-400">
                      Ambulance: <strong className="text-amber-400">{alert.ambulance_number}</strong>
                    </div>
                  </div>

                  {/* Accept / Stand-by Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleAcceptPatient(alert.emergency_id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> ACCEPT PATIENT & PREP BAY
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAPACITY MANAGEMENT (Section 8) */}
      {activeTab === 'beds' && (
        <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Emergency Department Capacity Management</h2>
            <p className="text-xs text-slate-400">
              Directly influences the LIFEGRID Hospital Matching Engine algorithm.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Available Emergency Beds (Currently: {bedsFree})
              </label>
              <input
                type="number"
                value={bedsFree}
                onChange={(e) => setBedsFree(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Available ICU / Resuscitation Beds (Currently: {icuFree})
              </label>
              <input
                type="number"
                value={icuFree}
                onChange={(e) => setIcuFree(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Emergency Department Load Status
              </label>
              <select
                value={erStatus}
                onChange={(e) => setErStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="NORMAL">NORMAL — Triage Ready</option>
                <option value="HIGH_LOAD">HIGH_LOAD — Delay Expected</option>
                <option value="CRITICAL">CRITICAL — Diversion Recommended</option>
              </select>
            </div>

            <button
              onClick={handleUpdateCapacity}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow cursor-pointer text-sm"
            >
              SAVE EMERGENCY CAPACITY SETTINGS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

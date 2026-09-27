import React, { useState, useEffect } from 'react';
import {
  Truck, Navigation, AlertTriangle, AlertCircle, Phone, CheckCircle2,
  Share2, ArrowRight, ShieldAlert, Activity, RefreshCw, Compass
} from 'lucide-react';
import { api } from '../services/api';
import EmergencyMap from '../components/EmergencyMap';

export default function AmbulancePortal() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, patient, transfer
  const [emergency, setEmergency] = useState(null);
  const [ambulance, setAmbulance] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [patient, setPatient] = useState(null);
  const [transferReason, setTransferReason] = useState('Heavy traffic bottleneck / Vehicle engine overheating');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(null);

  const fetchActiveCall = async () => {
    try {
      const emergencies = await api.listEmergencies();
      const active = emergencies.find(e => ['AMBULANCE_ASSIGNED', 'AMBULANCE_EN_ROUTE', 'ARRIVED', 'PATIENT_PICKED_UP', 'TRANSPORTING'].includes(e.status)) || emergencies[0];
      if (active) {
        const detail = await api.getEmergency(active.id);
        setEmergency(detail.emergency);
        setAmbulance(detail.ambulance);
        setHospital(detail.hospital);
        setPatient(detail.patient);
      }
    } catch (e) {
      console.error('Failed to load ambulance dispatch:', e);
    }
  };

  useEffect(() => {
    fetchActiveCall();
    const interval = setInterval(fetchActiveCall, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (newStatus) => {
    if (!emergency) return;
    try {
      const res = await api.updateEmergencyStatus(emergency.id, newStatus);
      setEmergency(res);
      await fetchActiveCall();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleRequestTransfer = async (e) => {
    e.preventDefault();
    if (!emergency) return;
    setIsTransferring(true);
    try {
      const res = await api.transferAmbulance(emergency.id, transferReason);
      setTransferSuccess(res);
      await fetchActiveCall();
    } catch (err) {
      alert('Transfer request failed: ' + err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Sub-Header Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Ambulance Driver & Paramedic Console
              <span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full font-mono">
                {ambulance ? ambulance.vehicle_number : 'Unit DL-01-EMS-1004'}
              </span>
            </h1>
            <p className="text-xs text-slate-400">Mobile Telematics, Navigation Corridor & Patient Handover</p>
          </div>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Mission
          </button>
          <button
            onClick={() => setActiveTab('patient')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'patient' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Patient Medical Info
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'transfer' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ambulance Transfer
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE MISSION DASHBOARD */}
      {activeTab === 'dashboard' && emergency && (
        <div className="space-y-6">
          {/* Status Progression Quick Buttons */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="text-xs font-semibold text-slate-400 mb-2">Update Mission Status</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { st: 'AMBULANCE_EN_ROUTE', label: 'En Route', color: 'bg-amber-600' },
                { st: 'ARRIVED', label: 'Arrived at Scene', color: 'bg-blue-600' },
                { st: 'PATIENT_PICKED_UP', label: 'Patient Secured', color: 'bg-indigo-600' },
                { st: 'TRANSPORTING', label: 'Transporting', color: 'bg-purple-600' },
                { st: 'HOSPITAL_ARRIVED', label: 'Hospital ER', color: 'bg-rose-600' },
                { st: 'COMPLETED', label: 'Handover Complete', color: 'bg-emerald-600' },
              ].map((btn) => (
                <button
                  key={btn.st}
                  onClick={() => handleUpdateStatus(btn.st)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold text-white transition shadow cursor-pointer ${
                    emergency.status === btn.st
                      ? `${btn.color} ring-2 ring-white scale-102`
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Mission Details & Route Info */}
            <div className="lg:col-span-5 space-y-5">
              {/* Emergency Banner */}
              <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                    CODE: {emergency.tracking_code}
                  </span>
                  <span className="px-2 py-0.5 bg-rose-600/30 text-rose-300 text-xs font-bold rounded-full">
                    {emergency.priority} PRIORITY
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white">{emergency.emergency_type}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Pickup: <strong className="text-slate-200">{emergency.pickup_address}</strong>
                  </p>
                </div>

                {/* Patient Allergy Alert Banner */}
                {patient?.allergies && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <strong className="block font-bold">ALLERGY WARNING: {patient.allergies}</strong>
                      <span>Paramedics: Verify airway. Strictly avoid all beta-lactam antibiotics.</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Destination Hospital</span>
                    <div className="font-bold text-white text-sm mt-0.5">
                      {hospital ? hospital.name : 'AIIMS Apex Trauma Center'}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Estimated ETA</span>
                    <div className="font-bold text-amber-400 text-sm mt-0.5">
                      {emergency.eta_minutes} Minutes
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Route Comparison (Section 19) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Route Recommendation Engine
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">
                    Green Wave Priority
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-300">Route A: Direct Arterials</div>
                      <div className="text-[11px] text-rose-400">Heavy Traffic (1.8x Congestion)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-300">8.2 km</div>
                      <div className="text-slate-400">17 min</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-emerald-400 flex items-center gap-1">
                        Route B: LIFEGRID Green Corridor
                        <span className="text-[9px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">BEST</span>
                      </div>
                      <div className="text-[11px] text-emerald-300">Signals Synchronized to Green</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">10.4 km</div>
                      <div className="font-bold text-emerald-400 text-sm">12 min</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    Recommendation: Route B bypasses radial bottleneck saving 5 minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Map Telemetry View */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <EmergencyMap
                center={[emergency.pickup_lat, emergency.pickup_lng]}
                zoom={13}
                ambulances={ambulance ? [ambulance] : []}
                hospitals={hospital ? [hospital] : []}
                activeEmergency={emergency}
                routeWaypoints={emergency?.route_details?.routes?.[0]?.waypoints || []}
                className="h-[460px] w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT MEDICAL INFORMATION */}
      {activeTab === 'patient' && (
        <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Authorized Patient Clinical Information</h2>
              <p className="text-xs text-slate-400">Crucial information for paramedic stabilization in transit.</p>
            </div>
            <span className="text-sm font-bold text-rose-400 bg-rose-500/20 px-3 py-1 rounded-xl">
              Blood Group: {patient ? patient.blood_group : 'O+'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs">Patient Name & Age</span>
              <div className="font-bold text-white text-base mt-1">
                {patient ? patient.name : 'Rahul Sharma'} ({patient ? patient.age : 28} Yrs, Male)
              </div>
            </div>

            <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/40">
              <span className="text-rose-400 font-bold text-xs">Severe Allergies</span>
              <div className="font-bold text-rose-200 text-base mt-1">
                {patient ? patient.allergies : 'PENICILLIN (Beta-Lactams)'}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs">Existing Conditions</span>
              <div className="text-slate-200 font-semibold mt-1">
                {patient ? patient.existing_conditions : 'Asthma, Mild Hypertension'}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-xs">Current Medications</span>
              <div className="text-slate-200 font-semibold mt-1">
                {patient ? patient.current_medications : 'Salbutamol Inhaler'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AMBULANCE TRANSFER REQUEST */}
      {activeTab === 'transfer' && (
        <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 bg-rose-600/20 text-rose-500 rounded-xl flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Emergency Transfer Protocol</h2>
              <p className="text-xs text-slate-400">
                If this ambulance becomes mechanically stuck or unavailable, request backup transfer immediately.
              </p>
            </div>
          </div>

          {transferSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 space-y-1">
              <div className="font-bold text-sm">Transfer Successfully Initiated!</div>
              <div>{transferSuccess.message}</div>
              <div>New Unit ETA: ~{transferSuccess.eta_minutes} mins</div>
            </div>
          )}

          <form onSubmit={handleRequestTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transfer Trigger Reason
              </label>
              <select
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Mechanical breakdown / flat tire">Mechanical breakdown / flat tire</option>
                <option value="Severe arterial flood / road blockade">Severe arterial road blockade</option>
                <option value="Patient requires higher care (ECMO/Mobile ICU)">Patient requires Mobile ICU / ECMO backup</option>
                <option value="Ambulance collision or secondary accident">Secondary collision on route</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isTransferring}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition shadow cursor-pointer text-sm"
            >
              {isTransferring ? 'LOCATING BACKUP AMBULANCE...' : 'DISPATCH BACKUP AMBULANCE TRANSFER'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

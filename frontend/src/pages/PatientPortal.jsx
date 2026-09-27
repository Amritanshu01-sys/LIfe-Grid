import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, MapPin, Phone, AlertCircle, CheckCircle2, User,
  Clock, Activity, FileText, Heart, Navigation, Mic, ArrowRight, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import EmergencyMap from '../components/EmergencyMap';

export default function PatientPortal({ onEmergencyCreated }) {
  const [activeTab, setActiveTab] = useState('emergency'); // emergency, profile, history
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [emergencyTimeline, setEmergencyTimeline] = useState([]);
  const [ambulance, setAmbulance] = useState(null);
  const [hospital, setHospital] = useState(null);

  // Emergency Intake Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationName, setLocationName] = useState('Barakhamba Road, Connaught Place, New Delhi');
  const [lat, setLat] = useState(28.6304);
  const [lng, setLng] = useState(77.2177);
  const [emergencyType, setEmergencyType] = useState('Trauma (Vehicle Accident)');
  const [notes, setNotes] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Load Patient Profile & History
  useEffect(() => {
    loadPatientData();
  }, []);

  // Poll active emergency status if present
  useEffect(() => {
    if (!activeEmergency?.id) return;
    const interval = setInterval(async () => {
      try {
        const detail = await api.getEmergency(activeEmergency.id);
        setActiveEmergency(detail.emergency);
        setAmbulance(detail.ambulance);
        setHospital(detail.hospital);
        setEmergencyTimeline(detail.events || []);
      } catch (e) {
        console.error('Error polling emergency status', e);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [activeEmergency?.id]);

  const loadPatientData = async () => {
    try {
      const p = await api.getPatientProfile();
      setPatient(p);
      const h = await api.getPatientHistory();
      setHistory(h);
      if (h.length > 0 && h[0].status !== 'COMPLETED' && h[0].status !== 'CANCELLED') {
        const detail = await api.getEmergency(h[0].id);
        setActiveEmergency(detail.emergency);
        setAmbulance(detail.ambulance);
        setHospital(detail.hospital);
        setEmergencyTimeline(detail.events || []);
      }
    } catch (e) {
      console.error('Failed to load patient data', e);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(roundCoord(pos.coords.latitude));
          setLng(roundCoord(pos.coords.longitude));
          setLocationName(`GPS Verified [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`);
          setIsGettingLocation(false);
        },
        (err) => {
          console.warn('Geolocation blocked or unavailable:', err.message);
          setIsGettingLocation(false);
          // Keep Delhi fallback
        }
      );
    }
  };

  const roundCoord = (val) => Math.round(val * 10000) / 10000;

  const handleRequestEmergency = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        patient_id: patient?.id || 1,
        caller_name: patient?.name || 'Rahul Sharma',
        caller_phone: patient?.emergency_phone || '+91-9876543210',
        emergency_type: emergencyType,
        priority: 'CRITICAL',
        pickup_address: locationName,
        pickup_lat: lat,
        pickup_lng: lng,
        notes: notes || 'Dispatched via Patient Portal'
      };

      const res = await api.createEmergency(payload);
      const detail = await api.getEmergency(res.id);
      setActiveEmergency(detail.emergency);
      setAmbulance(detail.ambulance);
      setHospital(detail.hospital);
      setEmergencyTimeline(detail.events || []);
      if (onEmergencyCreated) onEmergencyCreated(res.id);
    } catch (err) {
      alert('Error initiating emergency request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emergencyStates = [
    "REQUESTED", "SEARCHING", "AMBULANCE_ASSIGNED", "AMBULANCE_EN_ROUTE",
    "ARRIVED", "PATIENT_PICKED_UP", "TRANSPORTING", "HOSPITAL_ARRIVED",
    "TREATMENT_STARTED", "COMPLETED"
  ];

  const currentStepIdx = activeEmergency
    ? emergencyStates.indexOf(activeEmergency.status)
    : -1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Sub-Tabs for Patient View */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Patient Portal
              {patient && (
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-normal">
                  {patient.name} ({patient.blood_group})
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">Emergency SOS, Medical Passport & Response Tracking</p>
          </div>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'emergency' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Emergency SOS
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'profile' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Medical Profile
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'history' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Emergency History
          </button>
        </div>
      </div>

      {/* TAB 1: EMERGENCY SOS & ACTIVE TRACKING */}
      {activeTab === 'emergency' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: SOS Trigger & Active Status */}
          <div className="lg:col-span-5 space-y-6">
            {!activeEmergency ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 bg-rose-600/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-500/40">
                    <ShieldAlert className="w-8 h-8 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Emergency Request</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Triggers automated GPS dispatch, nearest ALS ambulance search, hospital matching and traffic green corridor.
                  </p>
                </div>

                <form onSubmit={handleRequestEmergency} className="space-y-4">
                  {/* Emergency Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Emergency Condition
                    </label>
                    <select
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Trauma (Vehicle Accident)">Trauma / High-Speed Road Accident</option>
                      <option value="Cardiac Arrest / Chest Pain">Cardiac Arrest / Acute Chest Pain</option>
                      <option value="Severe Respiratory Distress">Severe Respiratory Distress / Asthma</option>
                      <option value="Acute Stroke / Neurological Deficit">Acute Stroke / Paralysis / Speech Loss</option>
                      <option value="Severe Burn Trauma">Severe Burn Trauma</option>
                      <option value="Unconscious / Unknown Fall">Unconscious / Fall Injury</option>
                    </select>
                  </div>

                  {/* Location Picker & Correction */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Pickup Location Address
                      </label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        {isGettingLocation ? 'Detecting...' : 'Detect My GPS'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Enter street, landmark, or intersection"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-rose-500"
                      required
                    />
                    <div className="flex gap-2 mt-1.5 text-[11px] text-slate-400 font-mono">
                      <span>Lat: {lat}</span>
                      <span>Lng: {lng}</span>
                    </div>
                  </div>

                  {/* Triage Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Important Medical Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Bleeding heavily, conscious, allergies noted..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Big Emergency SOS Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-600/40 text-sm tracking-wide transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    {isSubmitting ? 'DISPATCHING EMERGENCY NETWORK...' : 'REQUEST EMERGENCY ASSISTANCE'}
                  </button>
                </form>
              </div>
            ) : (
              /* Active Emergency Card */
              <div className="bg-slate-900/90 border border-rose-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">
                      {activeEmergency.tracking_code}
                    </span>
                    <h2 className="text-base font-bold text-white mt-1">
                      {activeEmergency.emergency_type}
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs animate-pulse">
                    {activeEmergency.status}
                  </span>
                </div>

                {/* Key Status Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Ambulance Assigned</span>
                    <div className="font-bold text-white text-sm mt-0.5">
                      {ambulance ? ambulance.vehicle_number : 'Searching...'}
                    </div>
                    {ambulance && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        Driver: {ambulance.driver_name} ({ambulance.driver_phone})
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Estimated ETA</span>
                    <div className="font-bold text-rose-400 text-sm mt-0.5">
                      ~{activeEmergency.eta_minutes} Minutes
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Distance: {activeEmergency.distance_km} km
                    </div>
                  </div>
                </div>

                {/* Destination Hospital */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">Destination Hospital</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {hospital ? hospital.name : 'Matching Optimal Hospital...'}
                  </div>
                  {activeEmergency.hospital_selection_reason && (
                    <div className="text-[11px] text-indigo-300 mt-1 bg-indigo-950/30 p-1.5 rounded border border-indigo-900/50">
                      💡 Reason: {activeEmergency.hospital_selection_reason}
                    </div>
                  )}
                </div>

                {/* 10-State Linear Emergency Progression */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-slate-300">Emergency Progress</span>
                  <div className="flex gap-1 h-2">
                    {emergencyStates.map((st, i) => (
                      <div
                        key={st}
                        title={st}
                        className={`flex-1 rounded-sm transition-all ${
                          i <= currentStepIdx
                            ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 text-right">
                    Current Milestone: <strong className="text-white">{activeEmergency.status}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Telemetry Map & Real-time Timeline */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live GPS Tracking & Route Corridor
                </h3>
                <span className="text-[11px] text-slate-400">Updates live via WebSocket</span>
              </div>
              <EmergencyMap
                center={[lat, lng]}
                zoom={13}
                ambulances={ambulance ? [ambulance] : []}
                hospitals={hospital ? [hospital] : []}
                activeEmergency={activeEmergency}
                routeWaypoints={activeEmergency?.route_details?.routes?.[0]?.waypoints || []}
                className="h-[360px] w-full"
              />
            </div>

            {/* Emergency Timeline */}
            {emergencyTimeline.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" />
                  Emergency Response Timeline
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {emergencyTimeline.map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-rose-500/50 pl-3 py-1">
                      <div className="text-[11px] font-mono text-slate-400 shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{ev.title}</div>
                        {ev.description && <div className="text-slate-400 mt-0.5">{ev.description}</div>}
                        <span className="inline-block mt-1 text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {ev.actor_role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT MEDICAL PROFILE */}
      {activeTab === 'profile' && patient && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Digital Health Passport & Emergency Information</h2>
              <p className="text-xs text-slate-400">
                Authorized pre-arrival information automatically streamed to responding paramedics and trauma surgeons.
              </p>
            </div>
            <div className="px-3 py-1 bg-rose-600/20 border border-rose-500/40 text-rose-300 font-bold rounded-lg text-sm">
              Blood Group: {patient.blood_group}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs md:text-sm">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs">Full Name</span>
              <div className="font-bold text-white text-base">{patient.name}</div>
              <div className="text-slate-400">Age: {patient.age} | Gender: {patient.gender}</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs">Emergency Contact (Kin)</span>
              <div className="font-bold text-white text-base">{patient.emergency_contact}</div>
              <div className="text-rose-400 font-mono">{patient.emergency_phone}</div>
            </div>

            <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/30 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Verified Severe Allergies</span>
              </div>
              <div className="text-rose-200 font-semibold text-sm">
                {patient.allergies || "No documented drug allergies."}
              </div>
              <p className="text-[11px] text-slate-400">
                Flagged to hospital Cath Lab and ER doctors before medication prescription.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs font-semibold">Existing Medical Conditions</span>
              <div className="text-slate-200 font-medium">
                {patient.existing_conditions || "None reported."}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs font-semibold">Current Medications</span>
              <div className="text-slate-200 font-medium">
                {patient.current_medications || "None."}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs font-semibold">Emergency Facility Preferences</span>
              <div className="text-slate-200 font-medium">
                {patient.emergency_preferences || "Nearest trauma ready hospital."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto space-y-4">
          <h2 className="text-lg font-bold text-white">Emergency Response History</h2>
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No previous emergency admissions on record.</div>
          ) : (
            <div className="space-y-3">
              {history.map((em) => (
                <div key={em.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs md:text-sm">
                  <div>
                    <div className="font-bold text-white text-base">{em.emergency_type}</div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Code: <span className="font-mono text-rose-400">{em.tracking_code}</span> | Pickup: {em.pickup_address}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {new Date(em.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 font-bold text-xs">
                      {em.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

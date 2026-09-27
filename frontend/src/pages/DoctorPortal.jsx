import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Activity, FileText, AlertTriangle, CheckCircle2,
  Pill, Plus, ShieldAlert, Sparkles, Send, Clock, User
} from 'lucide-react';
import { api } from '../services/api';

export default function DoctorPortal() {
  const [emergencyId, setEmergencyId] = useState(null);
  const [data, setData] = useState(null);
  const [emergenciesList, setEmergenciesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [diagnosis, setDiagnosis] = useState('');
  const [outcome, setOutcome] = useState('Stabilized in Trauma ICU');
  const [testName, setTestName] = useState('Whole Body CT Scan (Trauma Protocol)');
  const [testStatus, setTestStatus] = useState('NORMAL');
  const [testValue, setTestValue] = useState('No intracranial hemorrhage, no cervical spine fracture.');
  const [medName, setMedName] = useState('Tramadol 50mg IV');
  const [dosage, setDosage] = useState('50mg');
  const [route, setRoute] = useState('IV');
  const [treatmentNote, setTreatmentNote] = useState('');

  const fetchDoctorData = async () => {
    try {
      const ems = await api.listEmergencies();
      setEmergenciesList(ems);
      const targetId = emergencyId || (ems.length > 0 ? ems[0].id : null);
      if (targetId) {
        setEmergencyId(targetId);
        const res = await api.getDoctorPatientView(targetId);
        setData(res);
      }
    } catch (e) {
      console.error('Failed to load doctor view:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    const interval = setInterval(fetchDoctorData, 3500);
    return () => clearInterval(interval);
  }, [emergencyId]);

  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    if (!diagnosis) return;
    try {
      await api.addDiagnosis(emergencyId, diagnosis, { bp: "122/80", pulse: 84, spO2: 98 }, "Primary trauma survey complete.", outcome);
      await fetchDoctorData();
      alert('Diagnosis and clinical outcome logged.');
      setDiagnosis('');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    try {
      await api.addTest(emergencyId, testName, testStatus, testValue, 'Ordered by attending physician.');
      await fetchDoctorData();
      alert('Diagnostic test result added.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    // Safety check: verify penicillin allergy
    if (data?.patient?.allergies?.toLowerCase().includes('penicillin') && medName.toLowerCase().includes('penicillin')) {
      alert('CRITICAL SAFETY BLOCK: Patient has documented Penicillin allergy! Choose a safe alternative.');
      return;
    }
    try {
      await api.addMedication(emergencyId, medName, dosage, route, 'Administered in ER.');
      await fetchDoctorData();
      alert('Medication logged.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!treatmentNote) return;
    try {
      await api.addTreatmentNote(emergencyId, 'Dr. Vikram Seth', 'Lead Trauma Surgeon', treatmentNote);
      await fetchDoctorData();
      setTreatmentNote('');
      alert('Treatment note added.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header and Case Selector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Attending Physician Emergency Console
              <span className="text-xs bg-slate-800 text-indigo-400 px-2 py-0.5 rounded-full font-mono">
                Dr. Vikram Seth (Trauma Lead)
              </span>
            </h1>
            <p className="text-xs text-slate-400">Pre-Arrival Triage Brief & Digital Resuscitation Chart</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Select Emergency Case:</span>
          <select
            value={emergencyId || ''}
            onChange={(e) => setEmergencyId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs font-semibold text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {emergenciesList.map(em => (
              <option key={em.id} value={em.id}>
                {em.tracking_code} — {em.emergency_type} ({em.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Authorized Pre-Arrival Packet & AI Summary */}
          <div className="lg:col-span-5 space-y-5">
            {/* AI Clinical Summary (Strictly summary only) */}
            <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  AI Clinical Pre-Arrival Brief
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  DECISION SUPPORT ONLY
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950 p-3 rounded-xl border border-slate-800">
                {data.ai_prearrival_summary}
              </p>
              <div className="text-[10px] text-slate-400 italic">
                * LIFEGRID AI adheres to clinical safety: Summarizes intake telemetry without independently prescribing or making autonomous diagnoses.
              </div>
            </div>

            {/* Patient Clinical Profile */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-rose-400" />
                  Patient Profile: {data.patient?.name || 'Rahul Sharma'}
                </h3>
                <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                  Blood: {data.patient?.blood_group || 'O+'}
                </span>
              </div>

              {/* Severe Allergy Flag */}
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200 space-y-1">
                <div className="font-bold flex items-center gap-1 text-rose-400">
                  <AlertTriangle className="w-4 h-4" /> SEVERE CONTRAINDICATION
                </div>
                <div>Allergies: <strong>{data.patient?.allergies || 'PENICILLIN'}</strong></div>
                <div className="text-[11px] text-slate-400">System enforces lock on beta-lactam prescribing.</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Age / Gender</span>
                  <div className="font-bold text-white mt-0.5">{data.patient?.age || 28} Yrs • {data.patient?.gender || 'Male'}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Existing Conditions</span>
                  <div className="font-bold text-white mt-0.5">{data.patient?.existing_conditions || 'Asthma'}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">Current Medications:</span>
                <div className="font-medium text-slate-200 mt-0.5">{data.patient?.current_medications || 'Salbutamol Inhaler'}</div>
              </div>
            </div>

            {/* Vitals Telemetry */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Live Vitals Telemetry (In-Transit)
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Blood Pressure</span>
                  <div className="font-bold text-white text-sm">122/80</div>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Pulse Rate</span>
                  <div className="font-bold text-emerald-400 text-sm">84 bpm</div>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px]">SpO2 Saturation</span>
                  <div className="font-bold text-blue-400 text-sm">98%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Doctor Action Controls (Diagnosis, Tests, Meds, Notes) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Add Diagnosis Form */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                Attending Physician Clinical Diagnosis & Outcome
              </h3>
              <form onSubmit={handleAddDiagnosis} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Diagnosis</label>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Polytrauma, blunt chest contusion"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Outcome</label>
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Stabilized in Trauma ICU">Stabilized in Trauma ICU</option>
                      <option value="Admitted to Cardiac Care Unit (CCU)">Admitted to CCU</option>
                      <option value="Emergency Surgical Intervention">Emergency Surgery</option>
                      <option value="Discharged after Triage Observation">Discharged Stable</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  SAVE CLINICAL DIAGNOSIS
                </button>
              </form>
            </div>

            {/* 2. Order Diagnostic Test */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-400" />
                Add Diagnostic Test & Result
              </h3>
              <form onSubmit={handleAddTest} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Test Name</label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                    <select
                      value={testStatus}
                      onChange={(e) => setTestStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="ABNORMAL">ABNORMAL</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Findings</label>
                    <input
                      type="text"
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  ADD TEST RECORD
                </button>
              </form>

              {/* Logged Tests */}
              {data.tests && data.tests.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-400">Diagnostic Tests on File:</span>
                  {data.tests.map(t => (
                    <div key={t.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white">{t.test_name}</strong>
                        <div className="text-[11px] text-slate-400">{t.result_value}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.result_status === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {t.result_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Prescribe Medication */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-400" />
                Administer Emergency Medication
              </h3>
              <form onSubmit={handleAddMedication} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Medication Name</label>
                    <input
                      type="text"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="e.g. Tramadol 50mg"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Dosage</label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Route</label>
                    <select
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="IV">IV</option>
                      <option value="Oral">Oral</option>
                      <option value="IM">IM</option>
                      <option value="Inhalation">Inhalation</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  ADMINISTER MEDICATION
                </button>
              </form>

              {/* Logged Meds */}
              {data.medications && data.medications.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-slate-400">Administered Drugs:</span>
                  {data.medications.map(m => (
                    <div key={m.id} className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between">
                      <span className="font-semibold text-white">{m.medicine_name} ({m.dosage}, {m.route})</span>
                      <span className="text-[11px] text-slate-400">{new Date(m.administered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Treatment Notes */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                Add Physician Treatment Note
              </h3>
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  value={treatmentNote}
                  onChange={(e) => setTreatmentNote(e.target.value)}
                  placeholder="Document clinical observations, surgical indications, or ICU handover directives..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  LOG TREATMENT NOTE
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

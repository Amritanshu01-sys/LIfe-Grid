import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DemoModeBar from './components/DemoModeBar';
import AIAssistantModal from './components/AIAssistantModal';

// Pages
import LandingPage from './pages/LandingPage';
import PatientPortal from './pages/PatientPortal';
import FamilyPortal from './pages/FamilyPortal';
import AmbulancePortal from './pages/AmbulancePortal';
import HospitalPortal from './pages/HospitalPortal';
import DoctorPortal from './pages/DoctorPortal';
import TrafficPortal from './pages/TrafficPortal';
import BloodBankPortal from './pages/BloodBankPortal';
import AdminControlRoom from './pages/AdminControlRoom';

import { initWebSocket } from './services/api';

function MainApp() {
  const { currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState('landing');
  const [activeEmergencyId, setActiveEmergencyId] = useState(1);

  // Sync tab with persona switch
  useEffect(() => {
    if (currentRole && activeTab !== 'landing') {
      setActiveTab(currentRole);
    }
  }, [currentRole]);

  // Real-Time WebSocket broadcast listener
  useEffect(() => {
    const cleanup = initWebSocket((payload) => {
      if (payload.type === 'SIMULATION_STEP') {
        if (payload.emergency_id) {
          setActiveEmergencyId(payload.emergency_id);
        }
      }
    });
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* 1. SIH Presentation Demo Bar */}
      <DemoModeBar
        onSimulationUpdate={(status) => {
          if (status.active_emergency_id) {
            setActiveEmergencyId(status.active_emergency_id);
          }
        }}
      />

      {/* 2. Main Navigation Bar with Role Persona Switcher */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 3. Main Dashboard Workspace */}
      <main className="flex-1 w-full">
        {activeTab === 'landing' && <LandingPage setActiveTab={setActiveTab} />}
        {activeTab === 'patient' && <PatientPortal onEmergencyCreated={(id) => setActiveEmergencyId(id)} />}
        {activeTab === 'family' && <FamilyPortal />}
        {activeTab === 'ambulance' && <AmbulancePortal />}
        {activeTab === 'hospital' && <HospitalPortal />}
        {activeTab === 'doctor' && <DoctorPortal />}
        {activeTab === 'traffic' && <TrafficPortal />}
        {activeTab === 'bloodbank' && <BloodBankPortal />}
        {activeTab === 'admin' && <AdminControlRoom />}
      </main>

      {/* 4. Global Floating AI Assistant (Chat + Voice) */}
      <AIAssistantModal activeEmergencyId={activeEmergencyId} />

      {/* 5. Professional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <strong className="text-slate-300">LIFEGRID</strong>
            <span>— AI-Powered Emergency Response & Coordination Network</span>
          </div>
          <div>
            Built as a Smart India Hackathon (SIH) prototype. Fictional data clearly designated.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

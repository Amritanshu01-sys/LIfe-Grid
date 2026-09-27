import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const ROLES = [
  { id: 'patient', label: 'Patient / Citizen', icon: 'User', color: 'emerald' },
  { id: 'family', label: 'Family Member', icon: 'Heart', color: 'rose' },
  { id: 'ambulance', label: 'Ambulance Crew', icon: 'Truck', color: 'amber' },
  { id: 'hospital', label: 'Hospital ER Desk', icon: 'Building2', color: 'blue' },
  { id: 'doctor', label: 'Attending Doctor', icon: 'Stethoscope', color: 'indigo' },
  { id: 'traffic', label: 'Traffic Control Unit', icon: 'TrafficCone', color: 'purple' },
  { id: 'bloodbank', label: 'Blood Bank Ops', icon: 'Droplets', color: 'red' },
  { id: 'admin', label: 'Emergency Control Room', icon: 'ShieldAlert', color: 'cyan' },
];

export function AuthProvider({ children }) {
  const [currentRole, setCurrentRole] = useState('patient');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize with default demo persona
  useEffect(() => {
    const savedRole = localStorage.getItem('lifegrid_role') || 'patient';
    switchRole(savedRole);
  }, []);

  const switchRole = async (roleId) => {
    setLoading(true);
    try {
      const res = await api.setPersona(roleId);
      localStorage.setItem('lifegrid_token', res.access_token);
      localStorage.setItem('lifegrid_role', res.user.role);
      setCurrentRole(res.user.role);
      setCurrentUser(res.user);
    } catch (err) {
      console.error('Failed to set demo persona:', err);
      // Fallback mock user if backend not yet running
      setCurrentRole(roleId);
      setCurrentUser({
        id: 1,
        username: `${roleId}_user`,
        full_name: `${roleId.toUpperCase()} Operator`,
        role: roleId
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentRole, currentUser, switchRole, loading, ROLES }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

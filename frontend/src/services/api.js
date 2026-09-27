// LIFEGRID Frontend API & WebSocket Service

const API_BASE = '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('lifegrid_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth & Roles
  setPersona: (role) => request(`/auth/demo-persona?role=${role}`, { method: 'POST' }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),

  // Emergency
  createEmergency: (data) => request('/emergency', { method: 'POST', body: JSON.stringify(data) }),
  listEmergencies: (status) => request(status ? `/emergency?status=${status}` : '/emergency'),
  getEmergency: (id) => request(`/emergency/${id}`),
  updateEmergencyStatus: (id, status, notes) => request(`/emergency/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  }),
  transferAmbulance: (id, reason) => request(`/emergency/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  getTimeline: (id) => request(`/emergency/${id}/timeline`),

  // Ambulance
  listAmbulances: () => request('/ambulances'),
  getAmbulance: (id) => request(`/ambulances/${id}`),
  updateAmbulanceStatus: (id, status) => request(`/ambulances/${id}/status?new_status=${status}`, { method: 'PATCH' }),
  updateAmbulanceLocation: (id, lat, lng, speed) => request(`/ambulances/${id}/location`, {
    method: 'PATCH',
    body: JSON.stringify({ lat, lng, speed })
  }),

  // Hospital
  listHospitals: () => request('/hospitals'),
  getHospital: (id) => request(`/hospitals/${id}`),
  getPreAlerts: (id) => request(`/hospitals/${id}/pre-alerts`),
  updateHospitalCapacity: (id, data) => request(`/hospitals/${id}/capacity`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  acceptEmergency: (hospitalId, emergencyId) => request(`/hospitals/${hospitalId}/emergency/${emergencyId}/accept`, {
    method: 'POST'
  }),

  // Doctor
  listDoctors: () => request('/doctor/list'),
  getDoctorPatientView: (emergencyId) => request(`/doctor/patient/${emergencyId}`),
  addDiagnosis: (emergencyId, diagnosis, vitals, summary, outcome) => request(`/doctor/patient/${emergencyId}/diagnosis`, {
    method: 'POST',
    body: JSON.stringify({ diagnosis, vitals, summary, outcome })
  }),
  addTest: (emergencyId, test_name, result_status, result_value, notes) => request(`/doctor/patient/${emergencyId}/test`, {
    method: 'POST',
    body: JSON.stringify({ test_name, result_status, result_value, notes })
  }),
  addMedication: (emergencyId, medicine_name, dosage, route, instructions) => request(`/doctor/patient/${emergencyId}/medication`, {
    method: 'POST',
    body: JSON.stringify({ medicine_name, dosage, route, instructions })
  }),
  addTreatmentNote: (emergencyId, author_name, author_role, note_text) => request(`/doctor/patient/${emergencyId}/note`, {
    method: 'POST',
    body: JSON.stringify({ author_name, author_role, note_text })
  }),

  // Traffic
  getSignals: () => request('/traffic/signals'),
  getActiveCorridors: () => request('/traffic/active-corridors'),
  overrideSignal: (signalId, state, emergency_priority = false) => request(
    `/traffic/override/${signalId}?state=${state}&emergency_priority=${emergency_priority}`,
    { method: 'POST' }
  ),

  // Blood Bank
  listBloodBanks: () => request('/bloodbank'),
  searchBlood: (bloodGroup, nearHospitalId, lat, lng) => {
    let url = `/bloodbank/search?blood_group=${encodeURIComponent(bloodGroup)}`;
    if (nearHospitalId) url += `&near_hospital_id=${nearHospitalId}`;
    if (lat && lng) url += `&ref_lat=${lat}&ref_lng=${lng}`;
    return request(url);
  },
  updateInventory: (inventoryId, units) => request(`/bloodbank/inventory/${inventoryId}?units=${units}`, { method: 'PATCH' }),

  // Patient
  getPatientProfile: (patientId) => request(patientId ? `/patient/profile?patient_id=${patientId}` : '/patient/profile'),
  updatePatientProfile: (data) => request('/patient/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getPatientHistory: () => request('/patient/history'),

  // Family
  getFamilyDashboard: (emergencyId, patientId) => {
    let url = '/family/dashboard';
    if (emergencyId) url += `?emergency_id=${emergencyId}`;
    else if (patientId) url += `?patient_id=${patientId}`;
    return request(url);
  },

  // Admin
  getAdminOverview: () => request('/admin/overview'),
  reassignEmergency: (emergencyId, ambulanceId, hospitalId) => request('/admin/reassign', {
    method: 'POST',
    body: JSON.stringify({ emergency_id: emergencyId, ambulance_id: ambulanceId, hospital_id: hospitalId })
  }),

  // Simulation
  getSimulationStatus: () => request('/simulation/status'),
  startSimulation: () => request('/simulation/start', { method: 'POST' }),
  pauseSimulation: () => request('/simulation/pause', { method: 'POST' }),
  resetSimulation: () => request('/simulation/reset', { method: 'POST' }),
  stepSimulation: () => request('/simulation/step', { method: 'POST' }),
  setSimulationSpeed: (multiplier) => request('/simulation/speed', {
    method: 'POST',
    body: JSON.stringify({ multiplier })
  }),
  setSimulationTraffic: (level) => request('/simulation/traffic', {
    method: 'POST',
    body: JSON.stringify({ level })
  }),

  // AI Assistant
  aiChat: (message, user_role, emergency_id) => request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, user_role, emergency_id })
  }),
  aiVoice: (transcript, language, user_role) => request('/ai/voice', {
    method: 'POST',
    body: JSON.stringify({ transcript, language, user_role })
  }),
  getAITools: () => request('/ai/tools')
};

// Real-Time WebSocket Connection
export function initWebSocket(onMessage) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  let ws = null;
  let retryTimeout = null;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log('Connected to LIFEGRID Real-Time WebSocket stream');
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket frame', e);
        }
      };
      ws.onclose = () => {
        console.warn('LIFEGRID WebSocket closed, reconnecting in 3s...');
        retryTimeout = setTimeout(connect, 3000);
      };
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      retryTimeout = setTimeout(connect, 3000);
    }
  }

  connect();

  return () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (ws) ws.close();
  };
}

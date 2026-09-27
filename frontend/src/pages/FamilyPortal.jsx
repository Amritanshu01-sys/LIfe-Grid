import React, { useState, useEffect } from 'react';
import {
  Heart, Shield, Clock, Phone, MapPin, Truck, Building2,
  AlertCircle, CheckCircle, Navigation, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import EmergencyMap from '../components/EmergencyMap';

export default function FamilyPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFamilyData = async () => {
    try {
      const res = await api.getFamilyDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load family dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
    const interval = setInterval(fetchFamilyData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        Loading Family Emergency Status...
      </div>
    );
  }

  if (!data?.has_active_emergency) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-white">No Active Emergency</h2>
        <p className="text-xs text-slate-400">
          All registered family members are currently safe. If an emergency occurs, you will receive real-time authorized tracking information here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl flex items-center justify-center font-bold">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded">
                FAMILY VERIFIED PORTAL
              </span>
              <span className="text-xs text-slate-400 font-mono">#{data.tracking_code}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              {data.patient_name} — Emergency In Progress
            </h1>
            <p className="text-xs text-slate-400">
              Authorized emergency status stream with location, vehicle ETA & milestones.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block mb-1">Response State</span>
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold text-sm rounded-full">
            {data.emergency_status}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ambulance & Crew Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-400" />
              Ambulance Vehicle
            </span>
            <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
              {data.ambulance_number}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="text-slate-400">
              Estimated Arrival: <strong className="text-rose-400 text-sm">{data.eta_minutes} mins</strong>
            </div>
            {data.ambulance_crew && (
              <>
                <div className="text-slate-300">
                  Driver: <strong>{data.ambulance_crew.driver_name}</strong>
                </div>
                <div className="text-slate-300">
                  Paramedic: <strong>{data.ambulance_crew.paramedic}</strong>
                </div>
                <a
                  href={`tel:${data.ambulance_crew.driver_phone}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Crew: {data.ambulance_crew.driver_phone}
                </a>
              </>
            )}
          </div>
        </div>

        {/* Destination Hospital Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              Target Hospital
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50">
              {data.destination_hospital.emergency_department_status}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="font-bold text-white text-sm">
              {data.destination_hospital.name}
            </div>
            <div className="text-slate-400">
              {data.destination_hospital.address}
            </div>
            {data.destination_hospital.phone && (
              <div className="text-slate-300 font-mono mt-1">
                Hospital Desk: {data.destination_hospital.phone}
              </div>
            )}
          </div>
        </div>

        {/* Basic Treatment Status Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Patient Care Status
            </span>
            <span className="text-[10px] text-slate-400">Authorized Brief</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-medium text-slate-200">
              {data.basic_treatment_status}
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Note: Unrestricted clinical diagnostic files are restricted to licensed medical personnel in compliance with health privacy standards.
            </p>
          </div>
        </div>
      </div>

      {/* Live Map & Emergency Milestones Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-400" />
            Live Ambulance GPS Location
          </h3>
          <EmergencyMap
            center={[data.ambulance_location?.lat || 28.6139, data.ambulance_location?.lng || 77.2090]}
            zoom={13}
            ambulances={[{
              current_lat: data.ambulance_location?.lat || 28.6139,
              current_lng: data.ambulance_location?.lng || 77.2090,
              vehicle_number: data.ambulance_number,
              ambulance_type: "ALS",
              driver_name: data.ambulance_crew?.driver_name || "Crew",
              paramedic_name: data.ambulance_crew?.paramedic || "Paramedic",
              status: data.emergency_status,
              speed: data.ambulance_location?.speed_kmh || 45
            }]}
            className="h-[380px] w-full"
          />
        </div>

        {/* Milestone Timeline */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400" />
            Official Emergency Timeline
          </h3>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
            {data.timeline.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-rose-500/50 pl-3 py-1">
                <div className="font-mono text-slate-400 text-[11px] shrink-0">{item.time}</div>
                <div>
                  <div className="font-semibold text-white">{item.title}</div>
                  {item.description && <div className="text-slate-400 text-[11px] mt-0.5">{item.description}</div>}
                  <span className="inline-block mt-1 text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    {item.actor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

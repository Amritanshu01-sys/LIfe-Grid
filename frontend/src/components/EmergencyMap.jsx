import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Custom Map Component using Leaflet
export default function EmergencyMap({
  center = [28.6139, 77.2090],
  zoom = 12,
  ambulances = [],
  hospitals = [],
  signals = [],
  activeEmergency = null,
  routeWaypoints = [],
  className = "h-96 w-full"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routePolylineRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false
      });

      // Dark, high-contrast OpenStreetMap carto tile layer for emergency operations
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map alive or clean on unmount
    };
  }, []);

  // Update Markers and Routes dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. Render Hospitals
    hospitals.forEach(hosp => {
      const isCritical = hosp.status === 'CRITICAL';
      const isHighLoad = hosp.status === 'HIGH_LOAD';
      const color = isCritical ? '#ef4444' : isHighLoad ? '#f59e0b' : '#3b82f6';

      const iconHtml = `
        <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 14px;">
          H
        </div>
      `;
      const customIcon = L.divIcon({
        className: 'custom-hosp-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const m = L.marker([hosp.lat, hosp.lng], { icon: customIcon });
      m.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; min-width: 170px;">
          <b style="font-size: 14px;">${hosp.name}</b><br/>
          <div style="margin: 4px 0;">Status: <b style="color: ${color}">${hosp.status}</b></div>
          <div>Beds Free: <b>${hosp.available_beds}/${hosp.total_beds}</b></div>
          <div>ICU Free: <b>${hosp.available_icu}/${hosp.total_icu}</b></div>
          <div style="margin-top: 4px; font-size: 11px; color: #64748b;">${hosp.address}</div>
        </div>
      `);
      markersLayerRef.current.addLayer(m);
    });

    // 2. Render Ambulances
    ambulances.forEach(amb => {
      const isDispatched = ['EN_ROUTE', 'TRANSPORTING', 'ARRIVED'].includes(amb.status);
      const ambColor = isDispatched ? '#ef4444' : (amb.status === 'AVAILABLE' ? '#10b981' : '#64748b');
      const pulseClass = isDispatched ? 'pulse-beacon' : '';

      const iconHtml = `
        <div class="${pulseClass}" style="background-color: ${ambColor}; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); font-size: 16px;">
          🚑
        </div>
      `;
      const customIcon = L.divIcon({
        className: 'custom-amb-icon',
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const m = L.marker([amb.current_lat, amb.current_lng], { icon: customIcon });
      m.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; min-width: 160px;">
          <b style="font-size: 14px;">${amb.vehicle_number} (${amb.ambulance_type})</b><br/>
          <div>Status: <b style="color: ${ambColor}">${amb.status}</b></div>
          <div>Crew: ${amb.driver_name}</div>
          <div>Paramedic: ${amb.paramedic_name}</div>
          <div>Speed: ${amb.speed} km/h</div>
        </div>
      `);
      markersLayerRef.current.addLayer(m);
    });

    // 3. Render Active Emergency Incident Location
    if (activeEmergency && activeEmergency.pickup_lat && activeEmergency.pickup_lng) {
      const incidentHtml = `
        <div class="pulse-beacon" style="background-color: #dc2626; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 0 15px rgba(220,38,38,0.8); font-size: 18px;">
          ⚠️
        </div>
      `;
      const incidentIcon = L.divIcon({
        className: 'custom-incident-icon',
        html: incidentHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const m = L.marker([activeEmergency.pickup_lat, activeEmergency.pickup_lng], { icon: incidentIcon });
      m.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; font-size: 12px;">
          <b style="color: #dc2626; font-size: 13px;">🚨 ACTIVE EMERGENCY INCIDENT</b><br/>
          <b>${activeEmergency.emergency_type}</b><br/>
          <div>Location: ${activeEmergency.pickup_address}</div>
          <div>Priority: <b>${activeEmergency.priority}</b> | Status: <b>${activeEmergency.status}</b></div>
          <div>ETA: <b>${activeEmergency.eta_minutes} mins</b></div>
        </div>
      `);
      markersLayerRef.current.addLayer(m);
    }

    // 4. Render Traffic Signals
    signals.forEach(sig => {
      const isGreen = sig.current_state === 'GREEN';
      const sigColor = isGreen ? '#22c55e' : (sig.current_state === 'YELLOW' ? '#eab308' : '#ef4444');
      const priorityBadge = sig.emergency_priority_active ? 'pulse-green' : '';

      const sigHtml = `
        <div class="${priorityBadge}" style="background-color: #0f172a; border: 2px solid ${sigColor}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <div style="background-color: ${sigColor}; width: 10px; height: 10px; border-radius: 50%;"></div>
        </div>
      `;
      const customIcon = L.divIcon({
        className: 'custom-sig-icon',
        html: sigHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const m = L.marker([sig.lat, sig.lng], { icon: customIcon });
      m.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; font-size: 12px;">
          <b>Traffic Intersection</b><br/>
          ${sig.intersection_name}<br/>
          State: <b style="color:${sigColor}">${sig.current_state}</b><br/>
          Priority Corridor: <b>${sig.emergency_priority_active ? 'ACTIVE (Green Wave)' : 'Off'}</b>
        </div>
      `);
      markersLayerRef.current.addLayer(m);
    });

    // 5. Draw Route Polyline
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (routeWaypoints && routeWaypoints.length > 1) {
      const latlngs = routeWaypoints.map(wp => [wp.lat, wp.lng]);
      routePolylineRef.current = L.polyline(latlngs, {
        color: '#10b981',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(map);

      // Fit bounds if waypoints exist
      map.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] });
    }

  }, [ambulances, hospitals, signals, activeEmergency, routeWaypoints]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-700/80 shadow-2xl ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full" />
      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-200 flex gap-4 shadow-lg">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Ambulances</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Hospitals</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span> Incident</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Traffic Signals</span>
      </div>
    </div>
  );
}

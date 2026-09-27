# LIFEGRID: SIH 2026 Presentation & Demonstration Guide

**Project Tagline:** *"Connect. Coordinate. Respond."*

---

## 1. Executive Summary & Problem Statement

In India and globally, existing systems (like ERSS-112) perform well at answering phone calls and dispatching ambulances. However, **the fatal bottleneck in the "Golden Hour" is coordination fragmentation**:

- The ambulance driver has no real-time priority at traffic junctions.
- The hospital emergency department receives no clinical pre-arrival packet until the patient physically arrives at the door.
- Vital medical allergies (e.g. penicillin contraindication) are lost in verbal telephone relays.
- Panicked family members make repeated phone calls trying to find which hospital the patient was diverted to.

**LIFEGRID introduces a Patient-Centric Digital Coordination Layer** that brings all 8 emergency stakeholders onto a single shared telematics and AI interface.

---

## 2. The 16-Step SIH Live Demonstration Flow

During the jury evaluation, click the green **"START SIMULATION"** button on the top banner. The system will automatically execute the 16 stages in real time:

1. **Accident Created**: High-speed road collision registered in Connaught Place, New Delhi.
2. **Patient Detected**: Digital health passport loads patient Rahul Sharma (28 yrs, O+). Penicillin allergy flagged.
3. **Ambulance Searched**: Fleet geosearch scans 5 closest ALS units with transport ventilators.
4. **Ambulance Assigned**: Unit DL-01-EMS-1004 dispatched. Driver Suresh Kumar and Paramedic Anjali Rao acknowledge.
5. **Ambulance Starts**: Siren telemetry begins; speed rises to 52 km/h.
6. **GPS Moves**: Live coordinates stream across radial arterial roads via WebSockets.
7. **Traffic Detected**: Heavy congestion detected at Mandi House junction.
8. **Route Recalculated**: Multi-factor route engine switches to Route B (Green Priority Corridor), saving ~4 minutes.
9. **Hospital Selected**: Multi-factor matching engine selects AIIMS Apex Trauma Center (Level-1 trauma center, 12 ICU beds free).
10. **Hospital Receives Alert**: Pre-arrival alert pops up on the hospital ER dashboard with patient vitals and allergy warnings.
11. **Doctor Receives Patient Summary**: Attending Trauma Surgeon Dr. Vikram Seth receives AI clinical brief; reserves Resuscitation Bay 1.
12. **Family Receives Update**: Family Portal synchronizes live location, vehicle ETA, and hospital name.
13. **Ambulance Arrives**: Emergency crew touches down on scene; cervical collar and IV access initiated.
14. **Patient Transferred**: Patient secured in ambulance and transported to AIIMS ER.
15. **Treatment Record Added**: CT scan and sonography logged; analgesics administered (penicillin avoided).
16. **Emergency Completed**: Handover finalized; ambulance resets to AVAILABLE status.

---

## 3. Interactive Persona Switching for Judges

Use the **"Active Persona"** selector in the top navbar to instantly demonstrate any of the 8 stakeholder dashboards:
- **Patient View**: One-click SOS trigger, GPS correction, medical passport.
- **Family View**: Privacy-protected timeline, ambulance contact, and basic status.
- **Ambulance Crew View**: Route A vs Route B comparison, status milestones, ambulance transfer protocol.
- **Hospital ER View**: Pre-arrival alert cards, bed/ICU capacity management.
- **Doctor View**: Digital chart, diagnostic tests, medications with allergy safeguards.
- **Traffic Control**: Simulated green wave signals and manual intersection overrides.
- **Blood Bank Ops**: 8-group ABO stock grid, proximity search ("Find O- blood near hospital").
- **Control Room (Admin)**: City-wide Leaflet telemetry map, KPI metrics, and manual dispatch override.

# LIFEGRID — AI-Powered Emergency Response & Coordination Network

> **TAGLINE:** *"Connect. Coordinate. Respond."*  
> **Smart India Hackathon (SIH) Prototype**

---

## 1. Project Vision & Strategic Positioning

**LIFEGRID** is a patient-centric emergency coordination layer designed to dramatically reduce coordination delays during the critical **"Golden Hour"**.

> [!NOTE]  
> **Important Architecture Positioning:**  
> LIFEGRID does **NOT** attempt or claim to replace existing emergency response systems (such as India's **ERSS-112** or 108 EMS). Rather, LIFEGRID operates as a **digital coordination layer** integrating:
> 
> $$\text{Patient} \longleftrightarrow \text{Ambulance} \longleftrightarrow \text{Traffic Control} \longleftrightarrow \text{Hospital} \longleftrightarrow \text{Doctor} \longleftrightarrow \text{Family} \longleftrightarrow \text{Blood Bank}$$
> 
> Bringing multiple fragmented workflows together into one unified interface with real-time telematics and an AI voice/chat assistant.

---

## 2. Core Stakeholder Roles & Access Control

LIFEGRID implements strict **Role-Based Access Control (RBAC)** across 8 stakeholder portals:

1. **Patient / User** (`/user/dashboard`): One-click emergency intake, GPS verification, medical passport (allergies, conditions, medications).
2. **Family Member** (`/family/dashboard`): Privacy-safe emergency overview (vehicle ETA, destination hospital, milestone timeline, without exposing unrestricted medical files).
3. **Ambulance Driver & Paramedic** (`/ambulance/dashboard`): Mobile telematics, dynamic route recommendation (Route A vs Route B), live status milestones, and the **Emergency Ambulance Transfer** protocol.
4. **Hospital Emergency Department** (`/hospital/dashboard`): Pre-arrival trauma alerts, bed/ICU capacity sliders, bay reservations.
5. **Attending Doctor** (`/doctor/dashboard`): AI pre-arrival summaries (decision support only), digital resuscitation chart (diagnosis, tests, medications with allergy safeguards, treatment notes).
6. **Traffic Control** (`/traffic/dashboard`): Simulated emergency green corridors (turning approaching signals green) and manual overrides.
7. **Blood Bank** (`/bloodbank/dashboard`): ABO reserve inventory management and proximity search (*"Find O- blood near hospital"*).
8. **Admin / Central Control Room** (`/admin/dashboard`): City-wide single-pane-of-glass dispatch map, fleet management, manual dispatch overrides, and audit trails.
9. **LIFEGRID AI**: Floating assistant supporting natural language intake (English, Hindi, Hinglish), voice-to-text, text-to-voice, and controlled backend tool calling.

---

## 3. Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS, Lucide Icons, Leaflet (interactive maps & GPS tracks), Web Speech API.
- **Backend**: Python 3.14, FastAPI, SQLAlchemy ORM, WebSockets (real-time telemetry broadcast), Pydantic v2, PyJWT, Bcrypt.
- **Database**: SQLite (built-in zero-setup local execution) & PostgreSQL + PostGIS (`database/schema.sql`).
- **Simulation**: Dedicated 16-step SIH demo engine (`backend/services/simulation_manager.py`) and standalone CLI (`simulation/traffic_simulator.py`).

---

## 4. Quick Start Guide

### Instant Unified Launch (Recommended)
Run the entire platform (Frontend, Backend, WebSockets, Database, AI Tools) with a single command from the project root:

```bash
# Windows
.\backend\.venv\Scripts\python.exe run.py

# Or with virtual environment activated:
python run.py
```
> This starts the unified scalable server on **`http://127.0.0.1:8000`** and opens the web portal in your browser automatically!

### Options:
```bash
python run.py --port 8000 --host 0.0.0.0 --reload
```

---

### Separate Development Mode (Optional)
If modifying frontend JSX files with live hot-reloading:
```bash
# Terminal 1: Backend
cd backend && .\.venv\Scripts\Activate.ps1 && python -m uvicorn main:app --reload --port 8000

# Terminal 2: Frontend Dev Server
cd frontend && npm run dev
```

---

## 5. Running the Automated SIH 16-Step Live Demo

Click the green **"START SIMULATION"** button on the top presentation banner. The platform will automatically execute the end-to-end 16-step emergency workflow:

1. Accident created $\rightarrow$ 2. Patient identified $\rightarrow$ 3. Ambulance searched $\rightarrow$ 4. Ambulance assigned $\rightarrow$ 5. Ambulance starts $\rightarrow$ 6. GPS moves $\rightarrow$ 7. Traffic detected $\rightarrow$ 8. Route recalculated (Route B Green Corridor) $\rightarrow$ 9. Hospital matched $\rightarrow$ 10. Hospital receives pre-arrival alert $\rightarrow$ 11. Doctor briefed $\rightarrow$ 12. Family updated $\rightarrow$ 13. Ambulance arrives $\rightarrow$ 14. Patient transferred $\rightarrow$ 15. Clinical treatment record added $\rightarrow$ 16. Emergency completed.

---

## 6. Running Unit & Integration Tests

```bash
cd backend
.\.venv\Scripts\pytest.exe ..\tests\test_backend.py
```
All 8 test suites covering API endpoints, hospital matching, blood search, AI safety guardrails, and simulation states will execute.

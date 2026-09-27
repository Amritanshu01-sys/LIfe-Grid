# LIFEGRID API Architecture & Controlled Tools Reference

**LIFEGRID — AI-Powered Emergency Response & Coordination Network**
Tagline: *"Connect. Coordinate. Respond."*

---

## 1. Authentication & RBAC

| Method | Endpoint | Description | Allowed Roles |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | Public |
| `POST` | `/api/auth/login` | Login with username/password | Public |
| `POST` | `/api/auth/demo-persona` | Immediate persona switcher for SIH demo | Public |
| `GET` | `/api/auth/me` | Current authenticated user profile | All |

---

## 2. Emergency Intake & Lifecycle

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/emergency` | Create emergency intake (triggers ambulance search, hospital matching, green corridor, family alerts) |
| `GET` | `/api/emergency` | List active and historical emergencies |
| `GET` | `/api/emergency/{id}` | Full emergency telemetry (ambulance, hospital, patient, doctor, timeline) |
| `PATCH` | `/api/emergency/{id}/status` | Transition emergency milestone (`EN_ROUTE`, `ARRIVED`, `TRANSPORTING`, `COMPLETED`, etc.) |
| `POST` | `/api/emergency/{id}/transfer` | Request emergency ambulance transfer if unit gets stuck |
| `GET` | `/api/emergency/{id}/timeline` | Milestone audit log |

---

## 3. Fleet & Telematics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ambulances` | List all 24+ fleet ambulances |
| `GET` | `/api/ambulances/{id}` | Get ambulance telematics & crew details |
| `PATCH` | `/api/ambulances/{id}/location` | Live GPS coordinate push |
| `PATCH` | `/api/ambulances/{id}/status` | Update fleet availability status |

---

## 4. Hospitals & Bed Capacity

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/hospitals` | List all 22+ hospitals with live bed/ICU status |
| `GET` | `/api/hospitals/{id}/pre-alerts` | Fetch active incoming emergency pre-arrival alerts |
| `PATCH` | `/api/hospitals/{id}/capacity` | Update available beds, ICU bays, and ER load |
| `POST` | `/api/hospitals/{id}/emergency/{eid}/accept` | Accept emergency intake and reserve resuscitation bay |

---

## 5. Attending Physician Charting

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/doctor/list` | List doctors on duty |
| `GET` | `/api/doctor/patient/{eid}` | Authorized pre-arrival brief & vitals |
| `POST` | `/api/doctor/patient/{eid}/diagnosis` | Log clinical diagnosis and outcome |
| `POST` | `/api/doctor/patient/{eid}/test` | Order diagnostic test & result |
| `POST` | `/api/doctor/patient/{eid}/medication` | Administer drug (with allergy safety check) |
| `POST` | `/api/doctor/patient/{eid}/note` | Add clinical treatment note |

---

## 6. Traffic & Signal Priority

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/traffic/signals` | List all monitored intersections |
| `GET` | `/api/traffic/active-corridors` | Get ambulances on priority route |
| `POST` | `/api/traffic/override/{id}` | Manual signal override (Red, Yellow, Green) |

---

## 7. Blood Bank Logistics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bloodbank` | List all blood banks and 8-group inventory |
| `GET` | `/api/bloodbank/search` | Search specific blood group (`O-`, `A+`, etc.) near hospital |
| `PATCH` | `/api/bloodbank/inventory/{id}` | Update blood units count |

---

## 8. Controlled AI Assistant Tools

The AI assistant operates strictly through bounded Python tool methods:
- `create_emergency()`: Initiates emergency intake
- `get_emergency_status()`: Queries live telemetry and timeline
- `get_ambulance_status()`: Queries ambulance crew and speed
- `find_blood_availability()`: Searches ABO blood reserves
- `get_hospital_capacity()`: Queries available beds and ICU bays
- `find_suitable_hospital()`: Executes multi-factor matching engine
- `get_patient_summary()`: Retrieves verified allergies and history

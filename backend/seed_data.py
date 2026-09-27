import random
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models.all_models import (
    User, Patient, FamilyMember, Ambulance, Hospital, Doctor,
    Emergency, EmergencyEvent, BloodBank, BloodInventory, TrafficSignal,
    MedicalRecord, TestResult, Medication, TreatmentNote, Notification
)
from auth.jwt_handler import get_password_hash

# Center coordinates: New Delhi NCR grid
CENTER_LAT = 28.6139
CENTER_LNG = 77.2090

def random_coord(base_lat=CENTER_LAT, base_lng=CENTER_LNG, delta=0.08):
    return (
        round(base_lat + (random.random() - 0.5) * delta * 2, 6),
        round(base_lng + (random.random() - 0.5) * delta * 2, 6)
    )

def seed_database():
    print("Dropping and recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding Users for all 8+ roles...")
        default_pwd = get_password_hash("lifegrid123")

        # 1. Users for Roles
        roles_data = [
            ("patient@lifegrid.org", "patient_user", "patient", "Rahul Sharma", "+91-9876543210"),
            ("family@lifegrid.org", "family_user", "family", "Pooja Sharma", "+91-9876543211"),
            ("admin@lifegrid.org", "admin_user", "admin", "Central Dispatch Admin", "+91-9876543212"),
            ("ambulance@lifegrid.org", "ambulance_user", "ambulance", "Paramedic Rakesh Verma", "+91-9876543213"),
            ("doctor@lifegrid.org", "doctor_user", "doctor", "Dr. Vikram Seth", "+91-9876543214"),
            ("hospital@lifegrid.org", "hospital_user", "hospital", "AIIMS Emergency Desk", "+91-9876543215"),
            ("traffic@lifegrid.org", "traffic_user", "traffic", "Delhi Traffic Control Unit", "+91-9876543216"),
            ("bloodbank@lifegrid.org", "bloodbank_user", "bloodbank", "Red Cross Blood Bank Lead", "+91-9876543217"),
        ]

        users_map = {}
        for email, uname, role, name, phone in roles_data:
            u = User(
                email=email,
                username=uname,
                hashed_password=default_pwd,
                role=role,
                full_name=name,
                phone=phone
            )
            db.add(u)
            db.flush()
            users_map[role] = u

        # 2. Seed 20+ Hospitals
        print("Seeding 22 Hospitals...")
        hospitals_info = [
            ("AIIMS Apex Trauma Center", "AIIMS-TRM", "Ring Road, Safdarjung Enclave", 28.5672, 77.2100, 350, 45, 60, 12, True, True, True, False, "NORMAL", "+91-11-26593677"),
            ("Safdarjung Hospital Emergency", "SJH-EMERG", "Ansari Nagar West", 28.5700, 28.5700, 280, 22, 40, 4, True, True, True, True, "HIGH_LOAD", "+91-11-26165060"),
            ("Max Super Speciality Hospital", "MAX-SAKET", "1 2 Press Enclave Marg, Saket", 28.5273, 77.2141, 200, 38, 35, 9, True, True, True, False, "NORMAL", "+91-11-26515050"),
            ("Fortis Escorts Heart Institute", "FEHI-OKHLA", "Okhla Road, Sukhdev Vihar", 28.5614, 77.2764, 180, 15, 45, 8, False, True, False, False, "NORMAL", "+91-11-47135000"),
            ("Indraprastha Apollo Hospital", "APOLLO-SAR", "Sarita Vihar, Delhi Mathura Road", 28.5385, 77.2882, 320, 52, 50, 14, True, True, True, True, "NORMAL", "+91-11-26925858"),
            ("Sir Ganga Ram Hospital", "SGRH-RNR", "Rajinder Nagar, New Delhi", 28.6389, 77.1894, 250, 18, 38, 2, True, True, True, False, "HIGH_LOAD", "+91-11-25750000"),
            ("Lok Nayak Jai Prakash Hospital (LNJP)", "LNJP-DL", "Jawaharlal Nehru Marg, Delhi Gate", 28.6375, 77.2403, 300, 8, 40, 0, True, False, True, True, "CRITICAL", "+91-11-23233000"),
            ("Ram Manohar Lohia Hospital (RML)", "RML-CP", "Baba Kharak Singh Marg, Connaught Place", 28.6258, 77.2023, 260, 25, 36, 6, True, True, True, False, "NORMAL", "+91-11-23365525"),
            ("BLK-Max Super Speciality Hospital", "BLK-PUSA", "Pusa Road, Karol Bagh", 28.6441, 77.1793, 220, 30, 30, 5, True, True, False, False, "NORMAL", "+91-11-30403040"),
            ("Moolchand Medcity", "MOOL-LAJPAT", "Lajpat Nagar III", 28.5670, 77.2350, 150, 12, 20, 3, True, True, True, False, "NORMAL", "+91-11-42000000"),
            ("Holy Family Hospital", "HFH-OKH", "Okhla, Jamia Nagar", 28.5619, 77.2831, 160, 19, 24, 4, True, True, True, False, "NORMAL", "+91-11-26845900"),
            ("Bara Hindu Rao Hospital", "BHRH-MKA", "Malka Ganj, Civil Lines", 28.6728, 77.2069, 180, 5, 20, 0, True, False, False, False, "CRITICAL", "+91-11-23919476"),
            ("St. Stephen's Hospital", "SSH-TSH", "Tis Hazari, Kashmiri Gate", 28.6653, 77.2185, 200, 28, 28, 7, True, True, True, False, "NORMAL", "+91-11-23966021"),
            ("Fortis Flt. Lt. Rajan Dhall Hospital", "FFLRD-VK", "Vasant Kunj Sector B", 28.5202, 77.1577, 140, 16, 22, 4, True, True, False, False, "NORMAL", "+91-11-42776222"),
            ("Venkateshwar Hospital", "VENK-DWA", "Sector 18A, Dwarka", 28.5888, 77.0422, 190, 34, 30, 8, True, True, True, False, "NORMAL", "+91-11-48555555"),
            ("Manipal Hospital Dwarka", "MANIP-DWA", "Sector 6, Dwarka", 28.5912, 77.0610, 240, 42, 36, 11, True, True, True, False, "NORMAL", "+91-11-49674967"),
            ("Dharamshila Narayana Super Speciality", "DNSS-VAS", "Vasundhara Enclave, East Delhi", 28.6015, 77.3228, 170, 26, 25, 5, True, True, False, False, "NORMAL", "+91-11-43066666"),
            ("Max Super Speciality Hospital Patparganj", "MAX-PATP", "108 A, I.P. Extension, Patparganj", 28.6294, 77.3075, 210, 33, 32, 7, True, True, True, False, "NORMAL", "+91-11-43033333"),
            ("Guru Teg Bahadur Hospital (GTB)", "GTB-DIL", "Dilshad Garden, Shahdara", 28.6844, 77.3117, 320, 14, 45, 1, True, True, True, True, "HIGH_LOAD", "+91-11-22586262"),
            ("Rajiv Gandhi Super Speciality Hospital", "RGSSH-TAH", "Taharpur, Dilshad Garden", 28.6811, 77.3188, 230, 40, 35, 10, False, True, False, False, "NORMAL", "+91-11-22890600"),
            ("Action Balaji Hospital", "ABH-PAS", "Paschim Vihar, Rohtak Road", 28.6756, 77.1025, 180, 29, 26, 6, True, True, True, False, "NORMAL", "+91-11-49222222"),
            ("Kasturba Hospital", "KAST-DAR", "Daryaganj, Old Delhi", 28.6480, 77.2389, 130, 2, 15, 0, False, False, True, False, "CRITICAL", "+91-11-23275023")
        ]

        hospitals = []
        for name, code, addr, lat, lng, tb, ab, ti, ai, tr, cr, pr, bu, st, ph in hospitals_info:
            h = Hospital(
                name=name, code=code, address=addr, lat=lat, lng=lng,
                total_beds=tb, available_beds=ab, total_icu=ti, available_icu=ai,
                trauma_ready=tr, cardiac_ready=cr, pediatric_ready=pr, burn_unit=bu,
                status=st, phone=ph, email=f"emergency@{code.lower()}.org"
            )
            db.add(h)
            db.flush()
            hospitals.append(h)

        # 3. Seed 24 Ambulances (Available, Busy, Offline, BLS, ALS, Mobile ICU)
        print("Seeding 24 Ambulances across grid...")
        ambulance_types = ["ALS", "BLS", "Mobile ICU", "ALS", "ALS", "BLS"]
        ambulance_statuses = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "BUSY", "EN_ROUTE", "OFFLINE"]
        ambulances = []
        for i in range(1, 25):
            lat, lng = random_coord(CENTER_LAT, CENTER_LNG, 0.07)
            amb_type = ambulance_types[i % len(ambulance_types)]
            status = ambulance_statuses[i % len(ambulance_statuses)]
            v_num = f"DL-01-EMS-{1000 + i}"
            amb = Ambulance(
                vehicle_number=v_num,
                ambulance_type=amb_type,
                driver_name=f"Driver Suresh Kumar #{i}",
                driver_phone=f"+91-98110{1000 + i}",
                paramedic_name=f"Paramedic Anjali Rao #{i}",
                status=status,
                current_lat=lat,
                current_lng=lng,
                speed=48.0 if status in ["EN_ROUTE", "TRANSPORTING"] else 0.0,
                equipment="Defibrillator, Multi-para Monitor, Transport Ventilator, Trauma Bag, Oxygen"
            )
            db.add(amb)
            db.flush()
            ambulances.append(amb)

        # 4. Seed 50+ Doctors across Hospitals
        print("Seeding 55 Doctors...")
        specialties = ["Emergency Medicine", "Trauma Surgery", "Interventional Cardiology", "Critical Care / ICU", "Pediatric Emergency", "Neurotrauma"]
        doctors = []
        doc_first_names = ["Vikram", "Sunita", "Arun", "Priyanka", "Deepak", "Ritu", "Anand", "Meera", "Kabir", "Neha", "Rajesh", "Swati"]
        doc_last_names = ["Seth", "Mehta", "Iyer", "Banerjee", "Kapoor", "Chopra", "Reddy", "Verma", "Malhotra", "Joshi", "Bhatia"]

        for i in range(1, 56):
            fn = doc_first_names[i % len(doc_first_names)]
            ln = doc_last_names[i % len(doc_last_names)]
            hosp = hospitals[i % len(hospitals)]
            spec = specialties[i % len(specialties)]
            doc = Doctor(
                hospital_id=hosp.id,
                name=f"Dr. {fn} {ln}",
                specialty=spec,
                on_duty=(i % 4 != 0), # 75% on duty
                phone=f"+91-98220{2000 + i}",
                room=f"Resus-Bay-{1 + (i % 6)}"
            )
            db.add(doc)
            db.flush()
            doctors.append(doc)

        # 5. Seed 100+ Patients
        print("Seeding 105 Patients...")
        blood_groups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
        allergies_list = [
            "Penicillin, Amoxicillin", "Sulfa drugs, Aspirin", "None known",
            "Latex", "Iodine contrast dye", "NSAIDs (Ibuprofen)", "None known", "None known"
        ]
        conditions_list = [
            "Asthma, Hypertension", "Type-2 Diabetes", "Coronary Artery Disease",
            "None", "COPD", "Hypertension", "None", "Epilepsy"
        ]
        meds_list = [
            "Salbutamol Inhaler, Amlodipine 5mg", "Metformin 500mg", "Aspirin 75mg, Atorvastatin 20mg",
            "None", "Deriphyllin", "Telmisartan 40mg", "None", "Levetiracetam 500mg"
        ]

        patients = []
        # Main Demo Patient: Rahul Sharma
        p_demo = Patient(
            user_id=users_map["patient"].id,
            name="Rahul Sharma",
            age=28,
            gender="Male",
            blood_group="O+",
            emergency_contact="Pooja Sharma (Wife)",
            emergency_phone="+91-9876543211",
            allergies="Penicillin",
            existing_conditions="Asthma",
            current_medications="Salbutamol Inhaler",
            previous_history="Mild sports trauma (2023)",
            notes="Requires fast airway stabilization. Absolute contraindication for beta-lactams.",
            emergency_preferences="Transfer to Level-1 Trauma Center preferred."
        )
        db.add(p_demo)
        db.flush()
        patients.append(p_demo)

        # Link Family Member
        fam = FamilyMember(
            user_id=users_map["family"].id,
            patient_id=p_demo.id,
            relationship_to_patient="Spouse",
            contact_phone="+91-9876543211",
            is_authorized=True
        )
        db.add(fam)

        patient_names = [
            ("Amit", "Patel", "Male", 42), ("Sunil", "Gupta", "Male", 61), ("Aarti", "Verma", "Female", 34),
            ("Rohit", "Kumar", "Male", 23), ("Kavita", "Deshmukh", "Female", 55), ("Manish", "Saxena", "Male", 39),
            ("Sneha", "Reddy", "Female", 29), ("Devendra", "Singh", "Male", 50), ("Pooja", "Nair", "Female", 47),
            ("Tarun", "Bhardwaj", "Male", 31), ("Ananya", "Sen", "Female", 19), ("Harish", "Chaudhary", "Male", 68)
        ]

        for i in range(2, 106):
            fn, ln, gen, base_age = patient_names[i % len(patient_names)]
            age = max(18, min(85, base_age + (i % 15) - 7))
            p = Patient(
                name=f"{fn} {ln} #{i}",
                age=age,
                gender=gen,
                blood_group=blood_groups[i % len(blood_groups)],
                emergency_contact=f"Emergency Kin of {fn}",
                emergency_phone=f"+91-98330{3000 + i}",
                allergies=allergies_list[i % len(allergies_list)],
                existing_conditions=conditions_list[i % len(conditions_list)],
                current_medications=meds_list[i % len(meds_list)],
                previous_history="Documented in national digital health vault.",
                notes="Patient-centric emergency profile linked.",
                emergency_preferences="Nearest available cardiac/trauma unit."
            )
            db.add(p)
            db.flush()
            patients.append(p)

        # 6. Seed Blood Banks and Inventory
        print("Seeding 6 Blood Banks & Stock...")
        blood_banks_data = [
            ("Indian Red Cross Society Central Blood Bank", "1 Red Cross Road, Sansad Marg", 28.6219, 77.2099, "+91-11-23716441"),
            ("Rotary Blood Bank Delhi", "56-57 Tuglakabad Institutional Area", 28.5147, 77.2680, "+91-11-29955577"),
            ("AIIMS Blood Bank & Transfusion Medicine", "Ansari Nagar, New Delhi", 28.5675, 77.2112, "+91-11-26594438"),
            ("Safdarjung Hospital Regional Blood Center", "Ansari Nagar West", 28.5695, 77.2085, "+91-11-26165080"),
            ("Lion Blood Bank", "East of Kailash, New Delhi", 28.5552, 77.2482, "+91-11-42255225"),
            ("Max Hospital Blood Storage Center", "Saket Institutional Area", 28.5270, 77.2145, "+91-11-26515050")
        ]

        for name, addr, lat, lng, ph in blood_banks_data:
            bb = BloodBank(
                name=name, address=addr, lat=lat, lng=lng,
                contact_phone=ph, email=f"info@{name.lower()[:8].replace(' ', '')}.org"
            )
            db.add(bb)
            db.flush()

            # Seed stock for all 8 blood groups
            stock_levels = {
                "A+": random.randint(8, 25), "A-": random.randint(2, 8),
                "B+": random.randint(12, 35), "B-": random.randint(2, 6),
                "O+": random.randint(15, 40), "O-": random.randint(1, 6),
                "AB+": random.randint(5, 14), "AB-": random.randint(1, 4),
            }
            for bg, units in stock_levels.items():
                inv = BloodInventory(
                    blood_bank_id=bb.id,
                    blood_group=bg,
                    units_available=units,
                    last_updated=datetime.utcnow() - timedelta(minutes=random.randint(5, 120))
                )
                db.add(inv)

        # 7. Seed Traffic Intersections across central corridors
        print("Seeding 12 Key Traffic Intersections...")
        intersections = [
            ("Connaught Place Outer Circle / Barakhamba Rd", 28.6304, 77.2215),
            ("Mandi House Roundabout", 28.6258, 77.2341),
            ("ITO Intersection / Bahadur Shah Zafar Marg", 28.6301, 77.2422),
            ("Delhi Gate Chowk", 28.6415, 77.2410),
            ("Safdarjung Hospital Crossing / Ring Road", 28.5710, 77.2078),
            ("AIIMS Flyover Underpass", 28.5685, 77.2120),
            ("Moolchand Hospital Crossing", 28.5665, 77.2345),
            ("Ashram Chowk Underpass", 28.5723, 77.2589),
            ("Dhaula Kuan Interchange", 28.5925, 77.1595),
            ("Karol Bagh Pusa Road Crossing", 28.6445, 77.1820),
            ("RML Hospital / Talkatora Road Jn", 28.6245, 77.1995),
            ("Lajpat Nagar Ring Road Junction", 28.5702, 77.2435),
        ]

        for iname, lat, lng in intersections:
            sig = TrafficSignal(
                intersection_name=iname,
                lat=lat,
                lng=lng,
                current_state=random.choice(["RED", "GREEN", "YELLOW"]),
                emergency_priority_active=False,
                congestion_level=random.choice(["LOW", "MODERATE", "HEAVY"]),
                delay_factor=1.0
            )
            db.add(sig)

        # 8. Seed Sample Active Emergencies
        print("Seeding Initial Active Emergency Cases...")
        em_samples = [
            ("Trauma (High-Speed Vehicle Collision)", "CRITICAL", "AMBULANCE_EN_ROUTE", "Barakhamba Road Intersection, CP", 28.6304, 77.2177, 1, 1, 1, 8, 3.2),
            ("Acute Myocardial Infarction", "CRITICAL", "TRANSPORTING", "Defence Colony Market", 28.5744, 77.2311, 2, 2, 4, 6, 2.1),
            ("Severe Respiratory Distress", "HIGH", "HOSPITAL_ARRIVED", "Lajpat Nagar Central Market", 28.5690, 77.2390, 3, 3, 2, 0, 4.0),
            ("Pediatric Head Trauma", "CRITICAL", "TREATMENT_STARTED", "Vasant Kunj Sector C", 28.5240, 77.1520, 4, 4, 3, 0, 5.1),
        ]

        for etype, prio, st, addr, lat, lng, pid, amb_id, hosp_id, eta, dist in em_samples:
            code = f"LG-2609-{random.randint(1000, 9999)}"
            em = Emergency(
                tracking_code=code,
                patient_id=pid,
                caller_name="Emergency Caller",
                caller_phone="+91-9876543200",
                emergency_type=etype,
                priority=prio,
                status=st,
                pickup_address=addr,
                pickup_lat=lat,
                pickup_lng=lng,
                ambulance_id=amb_id,
                hospital_id=hosp_id,
                doctor_id=1,
                eta_minutes=eta,
                distance_km=dist,
                hospital_selection_reason="Optimal specialty match and bed availability verified."
            )
            db.add(em)
            db.flush()

            # Attach initial timeline events
            e1 = EmergencyEvent(
                emergency_id=em.id,
                event_type="REQUEST_CREATED",
                title="Emergency Call Received",
                description=f"Initial triage priority {prio} assigned for {etype}.",
                timestamp=datetime.utcnow() - timedelta(minutes=25),
                actor_role="PATIENT"
            )
            e2 = EmergencyEvent(
                emergency_id=em.id,
                event_type="AMBULANCE_ASSIGNED",
                title=f"Ambulance Assigned: {ambulances[amb_id-1].vehicle_number}",
                description="Paramedic crew dispatched with active GPS telematics.",
                timestamp=datetime.utcnow() - timedelta(minutes=22),
                actor_role="CONTROL_ROOM"
            )
            e3 = EmergencyEvent(
                emergency_id=em.id,
                event_type="HOSPITAL_ALERT",
                title=f"Pre-Arrival Alert Sent to {hospitals[hosp_id-1].name}",
                description="Trauma and Cath Lab teams placed on stand-by alert.",
                timestamp=datetime.utcnow() - timedelta(minutes=18),
                actor_role="SYSTEM"
            )
            db.add_all([e1, e2, e3])

        db.commit()
        print("Database seeded successfully with all required SIH datasets!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

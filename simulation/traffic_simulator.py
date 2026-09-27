"""
LIFEGRID — Standalone Traffic and Ambulance Corridor Simulator
Simulates emergency green waves, intersection signal coordination, dynamic congestion delays,
and ambulance movement along urban corridors.
"""

import sys
import time
import requests
from pathlib import Path

API_BASE = "http://127.0.0.1:8000/api"

def print_banner():
    print("=" * 65)
    print("   LIFEGRID — TRAFFIC & EMERGENCY PRIORITY SIMULATOR")
    print("   'Connect. Coordinate. Respond.'")
    print("=" * 65)

def get_status():
    try:
        r = requests.get(f"{API_BASE}/simulation/status", timeout=5)
        return r.json()
    except Exception as e:
        return {"error": str(e)}

def start_sim():
    try:
        r = requests.post(f"{API_BASE}/simulation/start", timeout=5)
        print(">> [COMMAND] Simulation started:", r.json().get("message"))
    except Exception as e:
        print(">> Error contacting backend:", e)

def pause_sim():
    try:
        r = requests.post(f"{API_BASE}/simulation/pause", timeout=5)
        print(">> [COMMAND] Simulation paused:", r.json().get("message"))
    except Exception as e:
        print(">> Error contacting backend:", e)

def reset_sim():
    try:
        r = requests.post(f"{API_BASE}/simulation/reset", timeout=5)
        print(">> [COMMAND] Simulation reset:", r.json().get("message"))
    except Exception as e:
        print(">> Error contacting backend:", e)

def step_sim():
    try:
        r = requests.post(f"{API_BASE}/simulation/step", timeout=5)
        print(">> [COMMAND] Executed single step:", r.json())
    except Exception as e:
        print(">> Error contacting backend:", e)

def set_speed(multiplier: float):
    try:
        r = requests.post(f"{API_BASE}/simulation/speed", json={"multiplier": multiplier}, timeout=5)
        print(f">> [COMMAND] Speed adjusted to {multiplier}x")
    except Exception as e:
        print(">> Error:", e)

def set_traffic(level: str):
    try:
        r = requests.post(f"{API_BASE}/simulation/traffic", json={"level": level}, timeout=5)
        print(f">> [COMMAND] Traffic congestion adjusted to {level}")
    except Exception as e:
        print(">> Error:", e)

def print_intersections():
    try:
        r = requests.get(f"{API_BASE}/traffic/signals", timeout=5)
        signals = r.json()
        print("\n--- Upcoming Intersections & Simulated Signal States ---")
        for s in signals[:8]:
            color_mark = "[GREEN]" if s["current_state"] == "GREEN" else "[RED]"
            prio = " [EMERGENCY PRIORITY]" if s["emergency_priority_active"] else ""
            print(f" • {s['intersection_name']:<40} State: {color_mark:<8}{prio}")
        print("-" * 55)
    except Exception as e:
        print("Error fetching signals:", e)

def interactive_cli():
    print_banner()
    print("Controls:")
    print(" 1. Start Simulation")
    print(" 2. Pause Simulation")
    print(" 3. Reset Simulation")
    print(" 4. Advance Single Step (1-16)")
    print(" 5. Increase Speed (2.0x)")
    print(" 6. Normal Speed (1.0x)")
    print(" 7. Traffic Level -> HEAVY")
    print(" 8. Traffic Level -> LOW")
    print(" 9. View Active Traffic Signals")
    print(" s. Check Simulation Status")
    print(" q. Quit CLI")
    print("-" * 65)

    while True:
        try:
            choice = input("\nLIFEGRID-SIM> ").strip().lower()
            if choice == "1":
                start_sim()
            elif choice == "2":
                pause_sim()
            elif choice == "3":
                reset_sim()
            elif choice == "4":
                step_sim()
            elif choice == "5":
                set_speed(2.0)
            elif choice == "6":
                set_speed(1.0)
            elif choice == "7":
                set_traffic("HEAVY")
            elif choice == "8":
                set_traffic("LOW")
            elif choice == "9":
                print_intersections()
            elif choice == "s":
                status = get_status()
                print(f"Status: Running={status.get('is_running')}, Step={status.get('current_step')}/{status.get('total_steps')} ({status.get('step_name')})")
            elif choice == "q":
                break
            else:
                print("Unknown command. Enter 1-9, s, or q.")
        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    interactive_cli()

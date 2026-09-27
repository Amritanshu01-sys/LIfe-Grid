from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.simulation_manager import simulation_manager, DEMO_STEPS

router = APIRouter(prefix="/simulation", tags=["SIH Simulation"])

class SpeedPayload(BaseModel):
    multiplier: float

class TrafficPayload(BaseModel):
    level: str # LOW, MODERATE, HEAVY

@router.get("/status")
def get_simulation_status():
    status = simulation_manager.get_status()
    status["steps_definition"] = DEMO_STEPS
    return status

@router.post("/start")
async def start_simulation():
    await simulation_manager.start()
    return {"message": "Simulation started", "status": simulation_manager.get_status()}

@router.post("/pause")
async def pause_simulation():
    await simulation_manager.pause()
    return {"message": "Simulation paused", "status": simulation_manager.get_status()}

@router.post("/reset")
async def reset_simulation():
    await simulation_manager.reset()
    return {"message": "Simulation reset to initial state", "status": simulation_manager.get_status()}

@router.post("/step")
async def step_simulation():
    await simulation_manager.step()
    return {"message": "Advanced single step", "status": simulation_manager.get_status()}

@router.post("/speed")
def set_speed(payload: SpeedPayload):
    simulation_manager.set_speed(payload.multiplier)
    return {"speed_multiplier": simulation_manager.speed_multiplier}

@router.post("/traffic")
def set_traffic(payload: TrafficPayload):
    simulation_manager.set_traffic(payload.level)
    return {"traffic_level": simulation_manager.traffic_level}

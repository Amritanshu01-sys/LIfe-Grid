from typing import List, Dict, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("lifegrid.websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Active count: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Active count: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts JSON payload to all active clients."""
        payload_str = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload_str)
            except Exception as e:
                logger.warning(f"Error sending message to websocket: {e}")
                self.disconnect(connection)

ws_manager = ConnectionManager()

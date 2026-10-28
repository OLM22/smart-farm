"""
Sync Client for Raspberry Pi Gateway
Uploads local MongoDB sensor records to the PHP Web Server.
"""

import time
import logging
import requests
from bson import json_util

logger = logging.getLogger("SyncClient")

class SyncClient:
    def __init__(self, config: dict, mongo_handler):
        self.cfg = config.get("server_sync", {})
        self.enabled = self.cfg.get("enabled", True)
        self.target_url = self.cfg.get("target_url", "http://localhost/server_php/api/sync.php")
        self.api_key = self.cfg.get("api_key", "")
        self.batch_size = self.cfg.get("batch_size", 50)
        self.timeout = self.cfg.get("timeout_seconds", 5)
        self.mongo = mongo_handler

    def sync_batch(self) -> int:
        if not self.enabled:
            return 0

        unsynced = self.mongo.get_unsynced_records(limit=self.batch_size)
        if not unsynced:
            return 0

        doc_ids = [doc["_id"] for doc in unsynced]

        # Prepare payload for PHP API
        payload = {
            "api_key": self.api_key,
            "count": len(unsynced),
            "records": [
                {
                    "rpi_doc_id": str(doc["_id"]),
                    "node_id": doc.get("node_id"),
                    "node_ts": doc.get("node_ts"),
                    "rssi": doc.get("rssi"),
                    "snr": doc.get("snr"),
                    "received_at": doc.get("received_at").isoformat() if doc.get("received_at") else None,
                    "data": doc.get("data", {})
                }
                for doc in unsynced
            ]
        }

        headers = {
            "Content-Type": "application/json",
            "X-Farm-API-Key": self.api_key
        }

        try:
            response = requests.post(
                self.target_url,
                json=payload,
                headers=headers,
                timeout=self.timeout
            )

            if response.status_code == 200:
                res_json = response.json()
                if res_json.get("status") == "success":
                    self.mongo.mark_records_synced(doc_ids)
                    logger.info(f"Sync successful: {len(doc_ids)} records pushed to Web Server.")
                    return len(doc_ids)
                else:
                    logger.warning(f"Server returned error response: {res_json.get('message')}")
            else:
                logger.warning(f"Server sync failed with HTTP {response.status_code}: {response.text[:120]}")

        except requests.RequestException as e:
            logger.debug(f"Web server unreachable for sync: {e}")

        return 0

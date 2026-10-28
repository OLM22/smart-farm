#!/usr/bin/env python3
"""
=============================================================================
Smart Farm - Raspberry Pi Gateway Daemon
=============================================================================
Manages:
 1. Serial reading from ESP32 LoRa Receiver
 2. Local buffering in MongoDB
 3. Storage health management (SD Card ↔ USB Flash Drive)
 4. Background Sync to PHP Web Server
=============================================================================
"""

import os
import sys
import time
import json
import logging
from threading import Thread

from mongo_handler import MongoHandler
from serial_reader import SerialReader
from storage_manager import StorageManager
from sync_client import SyncClient

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("GatewayMain")

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    logger.warning("config.json not found, using default settings.")
    return {}

def run_sync_worker(sync_client: SyncClient, interval: int):
    logger.info(f"Sync worker started (interval: {interval}s)")
    while True:
        try:
            sync_client.sync_batch()
        except Exception as e:
            logger.error(f"Error in sync worker: {e}")
        time.sleep(interval)

def run_storage_worker(storage_mgr: StorageManager, interval: int):
    logger.info(f"Storage maintenance worker started (interval: {interval}s)")
    while True:
        try:
            storage_mgr.run_storage_maintenance()
        except Exception as e:
            logger.error(f"Error in storage maintenance worker: {e}")
        time.sleep(interval)

def main():
    logger.info("Initializing Smart Farm Gateway on Raspberry Pi...")
    config = load_config()

    mongo_cfg = config.get("mongodb", {})
    mongo = MongoHandler(
        uri=mongo_cfg.get("uri", "mongodb://localhost:27017/"),
        database=mongo_cfg.get("database", "smart_farm"),
        collection=mongo_cfg.get("collection", "sensor_logs")
    )

    reader = SerialReader(config, mongo)
    storage_mgr = StorageManager(config, mongo)
    sync_client = SyncClient(config, mongo)

    # Start background threads for sync & storage management
    sync_interval = config.get("server_sync", {}).get("sync_interval_seconds", 10)
    sync_thread = Thread(target=run_sync_worker, args=(sync_client, sync_interval), daemon=True)
    sync_thread.start()

    storage_interval = config.get("storage", {}).get("check_interval_seconds", 3600)
    storage_thread = Thread(target=run_storage_worker, args=(storage_mgr, storage_interval), daemon=True)
    storage_thread.start()

    # Initial storage check
    storage_mgr.run_storage_maintenance()

    logger.info("Gateway service running. Listening on Serial interface...")
    while True:
        try:
            reader.read_one_line()
        except KeyboardInterrupt:
            logger.info("Gateway shutting down...")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}")
            time.sleep(1.0)

if __name__ == "__main__":
    main()

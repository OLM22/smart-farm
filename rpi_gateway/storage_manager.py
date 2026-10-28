"""
Storage Manager for Raspberry Pi Gateway
Manages disk storage allocation between SD Card and USB Flash Drive.
Protects the Raspberry Pi SD card from wearing out and filling up.
"""

import os
import shutil
import gzip
import json
import logging
from datetime import datetime, timedelta, timezone
from bson import json_util
import psutil

logger = logging.getLogger("StorageManager")

class StorageManager:
    def __init__(self, config: dict, mongo_handler):
        self.cfg = config.get("storage", {})
        self.sd_data_dir = self.cfg.get("sd_data_dir", "/var/smart_farm/data")
        self.sd_threshold = self.cfg.get("sd_threshold_percent", 80.0)
        self.flash_mount = self.cfg.get("flash_drive_mount", "/media/usb")
        self.archive_days = self.cfg.get("archive_after_days", 7)
        self.mongo = mongo_handler

        os.makedirs(self.sd_data_dir, exist_ok=True)

    def get_disk_usage(self, path: str):
        """Returns disk usage percentage and free bytes for a given mount/path."""
        try:
            if not os.path.exists(path):
                return None
            usage = psutil.disk_usage(path)
            return {
                "total_gb": round(usage.total / (1024**3), 2),
                "used_gb": round(usage.used / (1024**3), 2),
                "free_gb": round(usage.free / (1024**3), 2),
                "percent": usage.percent
            }
        except Exception as e:
            logger.error(f"Error checking disk usage for {path}: {e}")
            return None

    def is_flash_drive_mounted(self) -> bool:
        """Checks if the USB flash drive is actively mounted and writable."""
        if not os.path.ismount(self.flash_mount):
            return False
        return os.access(self.flash_mount, os.W_OK)

    def run_storage_maintenance(self):
        """Main maintenance routine executed periodically."""
        logger.info("Starting storage maintenance check...")

        sd_usage = self.get_disk_usage(self.sd_data_dir)
        flash_available = self.is_flash_drive_mounted()
        flash_usage = self.get_disk_usage(self.flash_mount) if flash_available else None

        logger.info(f"SD Card Usage: {sd_usage['percent']}% (Free: {sd_usage['free_gb']} GB)")
        if flash_available:
            logger.info(f"USB Flash Drive Mounted at {self.flash_mount}: {flash_usage['percent']}% (Free: {flash_usage['free_gb']} GB)")
        else:
            logger.warning(f"USB Flash Drive NOT mounted at {self.flash_mount}!")

        # Check if archive threshold is reached or routine archive is due
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.archive_days)
        should_prune = (sd_usage["percent"] >= self.sd_threshold) or True

        if should_prune:
            self._archive_and_prune_old_data(cutoff_date, flash_available)

    def _archive_and_prune_old_data(self, cutoff_date: datetime, flash_available: bool):
        records = self.mongo.get_old_records_for_archive(cutoff_date, limit=1000)
        if not records:
            logger.info("No old records need archiving at this time.")
            return

        date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"smartfarm_archive_{date_str}.json.gz"

        target_dir = os.path.join(self.flash_mount, "archives") if flash_available else os.path.join(self.sd_data_dir, "archives")
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, filename)

        logger.info(f"Archiving {len(records)} records to {target_path}...")

        try:
            # Serialize with bson json_util to preserve ObjectIDs and DateTimes
            serialized_data = json_util.dumps(records)
            with gzip.open(target_path, "wt", encoding="utf-8") as f:
                f.write(serialized_data)

            # Once written safely, delete from MongoDB
            doc_ids = [doc["_id"] for doc in records]
            deleted_count = self.mongo.delete_archived_records(doc_ids)
            logger.info(f"Successfully archived & pruned {deleted_count} records from local database.")

        except Exception as e:
            logger.error(f"Failed to archive records to {target_path}: {e}")

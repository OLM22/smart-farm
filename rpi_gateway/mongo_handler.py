"""
MongoDB Database Handler for Smart Farm Gateway
Handles local storage, sync tracking, and data rotation queries.
"""

import logging
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, PyMongoError

logger = logging.getLogger("MongoHandler")

class MongoHandler:
    def __init__(self, uri="mongodb://localhost:27017/", database="smart_farm", collection="sensor_logs"):
        self.uri = uri
        self.db_name = database
        self.coll_name = collection
        self.client = None
        self.db = None
        self.collection = None
        self.connect()

    def connect(self):
        try:
            self.client = MongoClient(self.uri, serverSelectionTimeoutMS=3000)
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self.collection = self.db[self.coll_name]

            # Indexing for query performance & fast sync
            self.collection.create_index([("synced", ASCENDING), ("received_at", ASCENDING)])
            self.collection.create_index([("id", ASCENDING), ("received_at", DESCENDING)])
            logger.info(f"Connected to MongoDB: {self.db_name}.{self.coll_name}")
            return True
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB at {self.uri}: {e}")
            return False

    def insert_sensor_packet(self, payload: dict) -> bool:
        if self.collection is None:
            if not self.connect():
                return False

        try:
            document = {
                "node_id": payload.get("id"),
                "node_ts": payload.get("ts"),
                "data": payload.get("data", {}),
                "rssi": payload.get("rssi"),
                "snr": payload.get("snr"),
                "received_at": datetime.now(timezone.utc),
                "synced": False,
                "synced_at": None
            }
            res = self.collection.insert_one(document)
            logger.debug(f"Stored packet from node {document['node_id']} [doc_id={res.inserted_id}]")
            return True
        except PyMongoError as e:
            logger.error(f"Error inserting sensor packet into MongoDB: {e}")
            return False

    def get_unsynced_records(self, limit=50):
        if self.collection is None and not self.connect():
            return []

        try:
            cursor = self.collection.find({"synced": False}).sort("received_at", ASCENDING).limit(limit)
            return list(cursor)
        except PyMongoError as e:
            logger.error(f"Error reading unsynced records: {e}")
            return []

    def mark_records_synced(self, doc_ids):
        if not doc_ids or (self.collection is None and not self.connect()):
            return False

        try:
            now = datetime.now(timezone.utc)
            result = self.collection.update_many(
                {"_id": {"$in": doc_ids}},
                {"$set": {"synced": True, "synced_at": now}}
            )
            logger.info(f"Marked {result.modified_count} records as synced.")
            return True
        except PyMongoError as e:
            logger.error(f"Error marking records as synced: {e}")
            return False

    def get_old_records_for_archive(self, before_datetime, limit=500):
        if self.collection is None and not self.connect():
            return []

        try:
            query = {
                "received_at": {"$lt": before_datetime},
                "synced": True
            }
            return list(self.collection.find(query).limit(limit))
        except PyMongoError as e:
            logger.error(f"Error querying old records for archive: {e}")
            return []

    def delete_archived_records(self, doc_ids):
        if not doc_ids:
            return 0
        try:
            res = self.collection.delete_many({"_id": {"$in": doc_ids}})
            return res.deleted_count
        except PyMongoError as e:
            logger.error(f"Error deleting archived records: {e}")
            return 0

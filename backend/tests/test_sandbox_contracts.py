import sys
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.sandbox_contracts import SandboxEventBatch


def event(occurred_at: str) -> dict:
    return {
        "id": "event-1",
        "sessionId": "session-1",
        "manifestId": "menh_de_01_classifier",
        "manifestVersion": "2",
        "type": "control_changed",
        "sequence": 0,
        "payload": {},
        "occurredAt": occurred_at,
    }


class SandboxEventContractTests(unittest.TestCase):
    def test_offset_timestamps_are_stored_as_naive_utc(self):
        batch = SandboxEventBatch.model_validate({"events": [event("2026-10-09T19:30:00+07:00")]})
        self.assertEqual(batch.events[0].occurredAt, datetime(2026, 10, 9, 12, 30))
        self.assertIsNone(batch.events[0].occurredAt.tzinfo)

    def test_browser_iso_strings_in_utc_keep_their_instant(self):
        batch = SandboxEventBatch.model_validate({"events": [event("2026-10-09T12:30:00.000Z")]})
        self.assertEqual(batch.events[0].occurredAt, datetime(2026, 10, 9, 12, 30))


if __name__ == "__main__":
    unittest.main()

"""
Tests de integración para el Time Tracking Service API.
"""
import uuid
from datetime import date
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.time_tracking.models import TimeEntry, Timer
from apps.time_tracking.authentication import VirtualUser

USER_ID = str(uuid.uuid4())
CASE_ID = str(uuid.uuid4())


def auth_client():
    client = APIClient()
    user = VirtualUser(USER_ID, "Test User")
    client.force_authenticate(user=user)
    return client


class TimeEntryListTest(TestCase):
    def setUp(self):
        self.client = auth_client()
        TimeEntry.objects.create(
            case_id=CASE_ID, case_number="EXP-001",
            user_id=USER_ID, user_name="Test User",
            task_type="research", description="Investigación inicial",
            date=date.today(), duration_minutes=90, is_billable=True,
        )

    def test_list_returns_only_own_entries(self):
        resp = self.client.get("/api/time-entries/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)

    def test_unauthenticated_returns_403(self):
        c = APIClient()
        resp = c.get("/api/time-entries/")
        self.assertEqual(resp.status_code, 403)

    def test_other_user_cannot_see_entries(self):
        other = APIClient()
        other.force_authenticate(user=VirtualUser(str(uuid.uuid4())))
        resp = other.get("/api/time-entries/")
        self.assertEqual(resp.data["count"], 0)


class TimeEntryCreateTest(TestCase):
    def setUp(self):
        self.client = auth_client()

    @patch("apps.time_tracking.api.views.publish_event")
    def test_create_entry(self, mock_event):
        mock_event.delay = MagicMock()
        resp = self.client.post("/api/time-entries/", {
            "case_id": CASE_ID,
            "case_number": "EXP-001",
            "task_type": "drafting",
            "description": "Redacción de demanda",
            "date": str(date.today()),
            "duration_minutes": 120,
            "is_billable": True,
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(TimeEntry.objects.count(), 1)

    def test_create_entry_invalid_duration(self):
        resp = self.client.post("/api/time-entries/", {
            "case_id": CASE_ID,
            "task_type": "other",
            "description": "Test",
            "date": str(date.today()),
            "duration_minutes": 0,
            "is_billable": True,
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_create_entry_exceeds_max_duration(self):
        resp = self.client.post("/api/time-entries/", {
            "case_id": CASE_ID,
            "task_type": "other",
            "description": "Test",
            "date": str(date.today()),
            "duration_minutes": 1500,
            "is_billable": True,
        }, format="json")
        self.assertEqual(resp.status_code, 400)


class TimeEntryDeleteTest(TestCase):
    def setUp(self):
        self.client = auth_client()
        self.entry = TimeEntry.objects.create(
            case_id=CASE_ID, case_number="EXP-001",
            user_id=USER_ID, user_name="Test User",
            task_type="review", description="Test",
            date=date.today(), duration_minutes=60, is_billable=False,
        )

    @patch("apps.time_tracking.api.views.publish_event")
    def test_delete_own_entry(self, mock_event):
        mock_event.delay = MagicMock()
        resp = self.client.delete(f"/api/time-entries/{self.entry.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(TimeEntry.objects.count(), 0)

    def test_other_user_cannot_delete(self):
        other = APIClient()
        other.force_authenticate(user=VirtualUser(str(uuid.uuid4())))
        resp = other.delete(f"/api/time-entries/{self.entry.id}/")
        self.assertEqual(resp.status_code, 404)


class StatsTest(TestCase):
    def setUp(self):
        self.client = auth_client()
        TimeEntry.objects.create(
            case_id=CASE_ID, case_number="EXP-001",
            user_id=USER_ID, user_name="Test User",
            task_type="research", description="Research",
            date=date.today(), duration_minutes=60,
            is_billable=True, hourly_rate="100.00",
        )
        TimeEntry.objects.create(
            case_id=CASE_ID, case_number="EXP-001",
            user_id=USER_ID, user_name="Test User",
            task_type="admin", description="Admin",
            date=date.today(), duration_minutes=30,
            is_billable=False,
        )

    def test_stats_totals(self):
        resp = self.client.get("/api/time-entries/stats/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_entries"], 2)
        self.assertEqual(resp.data["total_minutes"], 90)
        self.assertEqual(resp.data["billable_minutes"], 60)


class TimerTest(TestCase):
    def setUp(self):
        self.client = auth_client()

    @patch("apps.time_tracking.api.views.publish_event")
    def test_start_timer(self, mock_event):
        mock_event.delay = MagicMock()
        resp = self.client.post("/api/timers/start/", {
            "case_id": CASE_ID,
            "case_number": "EXP-001",
            "task_type": "court",
            "description": "Actuación en juicio",
            "is_billable": True,
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], "running")

    @patch("apps.time_tracking.api.views.publish_event")
    def test_start_timer_conflict(self, mock_event):
        mock_event.delay = MagicMock()
        self.client.post("/api/timers/start/", {
            "case_id": CASE_ID, "task_type": "research",
            "description": "Test", "is_billable": True,
        }, format="json")
        resp = self.client.post("/api/timers/start/", {
            "case_id": CASE_ID, "task_type": "drafting",
            "description": "Test 2", "is_billable": True,
        }, format="json")
        self.assertEqual(resp.status_code, 409)

    @patch("apps.time_tracking.api.views.publish_event")
    def test_stop_timer_creates_entry(self, mock_event):
        mock_event.delay = MagicMock()
        start_resp = self.client.post("/api/timers/start/", {
            "case_id": CASE_ID, "task_type": "research",
            "description": "Test timer", "is_billable": True,
        }, format="json")
        timer_id = start_resp.data["id"]
        stop_resp = self.client.post(f"/api/timers/{timer_id}/stop/")
        self.assertEqual(stop_resp.status_code, 200)
        self.assertEqual(stop_resp.data["timer"]["status"], "stopped")
        self.assertIn("time_entry", stop_resp.data)
        self.assertEqual(TimeEntry.objects.count(), 1)

    @patch("apps.time_tracking.api.views.publish_event")
    def test_pause_resume_timer(self, mock_event):
        mock_event.delay = MagicMock()
        start = self.client.post("/api/timers/start/", {
            "case_id": CASE_ID, "task_type": "review",
            "description": "Test", "is_billable": True,
        }, format="json")
        timer_id = start.data["id"]

        pause = self.client.post(f"/api/timers/{timer_id}/pause/")
        self.assertEqual(pause.status_code, 200)
        self.assertEqual(pause.data["status"], "paused")

        resume = self.client.post(f"/api/timers/{timer_id}/resume/")
        self.assertEqual(resume.status_code, 200)
        self.assertEqual(resume.data["status"], "running")

    @patch("apps.time_tracking.api.views.publish_event")
    def test_discard_timer(self, mock_event):
        mock_event.delay = MagicMock()
        start = self.client.post("/api/timers/start/", {
            "case_id": CASE_ID, "task_type": "admin",
            "description": "Test", "is_billable": False,
        }, format="json")
        timer_id = start.data["id"]
        resp = self.client.delete(f"/api/timers/{timer_id}/discard/")
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(Timer.objects.count(), 0)
        self.assertEqual(TimeEntry.objects.count(), 0)

    def test_active_timer_not_found(self):
        resp = self.client.get("/api/timers/active/")
        self.assertEqual(resp.status_code, 404)

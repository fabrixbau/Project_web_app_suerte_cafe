from datetime import datetime, time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .attendance import register_check_in
from .models import AttendanceCheckIn, EmployeeWorkSchedule


class AttendanceCheckInTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="barista",
            first_name="Ana",
            last_name="López",
            password="clave-segura-123",
        )

    def local_datetime(self, hour, minute, second=0):
        return timezone.make_aware(
            datetime(2026, 10, 1, hour, minute, second),
            timezone.get_current_timezone(),
        )

    def test_first_login_calculates_lateness_without_tolerance(self):
        EmployeeWorkSchedule.objects.create(
            user=self.user,
            weekday=EmployeeWorkSchedule.Weekday.THURSDAY,
            entry_time=time(8, 0),
        )

        check_in, created = register_check_in(
            self.user,
            self.local_datetime(8, 0, 1),
        )

        self.assertTrue(created)
        self.assertEqual(check_in.status, AttendanceCheckIn.Status.LATE)
        self.assertEqual(check_in.late_minutes, 1)
        self.assertEqual(check_in.scheduled_entry_time, time(8, 0))

    def test_repeated_login_keeps_first_check_in_and_increments_counter(self):
        first_login = self.local_datetime(7, 55)
        later_login = self.local_datetime(12, 30)
        first, _created = register_check_in(self.user, first_login)

        repeated, created = register_check_in(self.user, later_login)

        self.assertFalse(created)
        self.assertEqual(repeated.pk, first.pk)
        self.assertEqual(repeated.first_check_in_at, first_login)
        self.assertEqual(repeated.last_login_at, later_login)
        self.assertEqual(repeated.login_count, 2)

    def test_login_without_schedule_is_recorded(self):
        check_in, _created = register_check_in(
            self.user,
            self.local_datetime(9, 0),
        )

        self.assertEqual(check_in.status, AttendanceCheckIn.Status.NO_SCHEDULE)
        self.assertIsNone(check_in.scheduled_entry_time)
        self.assertEqual(check_in.late_minutes, 0)

    def test_successful_application_login_creates_check_in(self):
        login_at = self.local_datetime(8, 10)
        with patch("accounts.attendance.timezone.now", return_value=login_at):
            response = self.client.post(reverse("login"), {
                "user": self.user.id,
                "password": "clave-segura-123",
            })

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("home"))
        self.assertTrue(
            AttendanceCheckIn.objects.filter(
                user=self.user,
                work_date=login_at.date(),
            ).exists()
        )

    def test_failed_login_does_not_create_check_in(self):
        self.client.post(reverse("login"), {
            "user": self.user.id,
            "password": "incorrecta",
        })

        self.assertFalse(AttendanceCheckIn.objects.exists())


class AttendanceAdministrationTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.admin = user_model.objects.create_superuser(
            username="admin-asistencia",
            password="clave-segura-123",
        )
        self.employee = user_model.objects.create_user(username="cocinero")

    def test_administrator_can_save_weekly_schedule(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("accounts:user_schedule", args=[self.employee.id]),
            {"enabled_0": "on", "entry_time_0": "08:00", "enabled_5": "on", "entry_time_5": "10:30"},
        )

        self.assertRedirects(
            response,
            reverse("accounts:user_schedule", args=[self.employee.id]),
        )
        self.assertEqual(self.employee.work_schedules.count(), 2)

    def test_report_is_restricted_to_administrators(self):
        self.client.force_login(self.employee)
        denied = self.client.get(reverse("orders:attendance_report"))
        self.client.force_login(self.admin)
        allowed = self.client.get(reverse("orders:attendance_report"))

        self.assertEqual(denied.status_code, 403)
        self.assertEqual(allowed.status_code, 200)
        self.assertContains(allowed, "Check-in de empleados")

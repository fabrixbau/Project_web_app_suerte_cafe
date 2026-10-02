import math
from datetime import datetime

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import AttendanceCheckIn, EmployeeWorkSchedule


def employee_display_name(user):
    full_name = user.get_full_name().strip()
    return full_name or user.username


def calculate_attendance(user, login_at):
    local_login = timezone.localtime(login_at)
    work_date = local_login.date()
    schedule = EmployeeWorkSchedule.objects.filter(
        user=user,
        weekday=work_date.weekday(),
    ).first()

    if schedule is None:
        return {
            "work_date": work_date,
            "scheduled_entry_time": None,
            "late_minutes": 0,
            "status": AttendanceCheckIn.Status.NO_SCHEDULE,
        }

    scheduled_at = timezone.make_aware(
        datetime.combine(work_date, schedule.entry_time),
        timezone.get_current_timezone(),
    )
    delay_seconds = max(0, (local_login - scheduled_at).total_seconds())
    late_minutes = math.ceil(delay_seconds / 60) if delay_seconds else 0
    return {
        "work_date": work_date,
        "scheduled_entry_time": schedule.entry_time,
        "late_minutes": late_minutes,
        "status": (
            AttendanceCheckIn.Status.LATE
            if late_minutes
            else AttendanceCheckIn.Status.ON_TIME
        ),
    }


@transaction.atomic
def register_check_in(user, login_at=None):
    login_at = login_at or timezone.now()
    attendance = calculate_attendance(user, login_at)
    check_in, created = AttendanceCheckIn.objects.get_or_create(
        user=user,
        work_date=attendance["work_date"],
        defaults={
            "employee_name_snapshot": employee_display_name(user),
            "scheduled_entry_time": attendance["scheduled_entry_time"],
            "first_check_in_at": login_at,
            "last_login_at": login_at,
            "login_count": 1,
            "late_minutes": attendance["late_minutes"],
            "status": attendance["status"],
        },
    )
    if not created:
        AttendanceCheckIn.objects.filter(pk=check_in.pk).update(
            last_login_at=login_at,
            login_count=F("login_count") + 1,
        )
        check_in.refresh_from_db()
    return check_in, created

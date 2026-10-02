from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    image = models.ImageField(
        upload_to="profiles/",
        blank=True,
    )

    def __str__(self):
        return self.user.username


class EmployeeWorkSchedule(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Lunes"
        TUESDAY = 1, "Martes"
        WEDNESDAY = 2, "Miércoles"
        THURSDAY = 3, "Jueves"
        FRIDAY = 4, "Viernes"
        SATURDAY = 5, "Sábado"
        SUNDAY = 6, "Domingo"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="work_schedules",
    )
    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices)
    entry_time = models.TimeField()

    class Meta:
        ordering = ("weekday",)
        constraints = [
            models.UniqueConstraint(
                fields=("user", "weekday"),
                name="unique_employee_schedule_weekday",
            )
        ]

    def __str__(self):
        return f"{self.user.username} · {self.get_weekday_display()} {self.entry_time:%H:%M}"


class AttendanceCheckIn(models.Model):
    class Status(models.TextChoices):
        ON_TIME = "on_time", "A tiempo"
        LATE = "late", "Retraso"
        NO_SCHEDULE = "no_schedule", "Sin horario"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attendance_check_ins",
    )
    employee_name_snapshot = models.CharField(max_length=255)
    work_date = models.DateField()
    scheduled_entry_time = models.TimeField(null=True, blank=True)
    first_check_in_at = models.DateTimeField()
    last_login_at = models.DateTimeField()
    login_count = models.PositiveIntegerField(default=1)
    late_minutes = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-work_date", "first_check_in_at")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "work_date"),
                name="unique_employee_daily_check_in",
            )
        ]
        indexes = [
            models.Index(fields=("work_date", "status")),
        ]

    def __str__(self):
        return f"{self.employee_name_snapshot} · {self.work_date:%d/%m/%Y}"

import os
from celery import Celery
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mapshow.settings")

app = Celery("mapshow")
app.conf.enable_utc = False
app.conf.update(timezone=settings.TIME_ZONE)
app.conf.update(task_track_started=True)
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")

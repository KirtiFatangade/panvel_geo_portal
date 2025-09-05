from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json
from .models import Log
from datetime import datetime, timedelta

@csrf_exempt
def log_message(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            level = data.get("level", "info")
            message = data.get("message", "")

            # Check if a log with the same level and message exists for the current day
            today = datetime.now().date()
            existing_log = Log.objects.filter(
                level=level, message=message, timestamp__date=today
            ).first()

            if existing_log:
                existing_log.count += 1
                existing_log.save()
            else:
                Log.objects.create(level=level, message=message)
            return JsonResponse({"status": "info"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    else:
        return JsonResponse(
            {"status": "error", "message": "Method not allowed"}, status=405
        )


@csrf_exempt
def get_logs_api(request):
    if request.method == "GET":
        start_date = request.GET.get("start_date", None)
        end_date = request.GET.get("end_date", None)
        logs = Log.objects.all()
        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
            logs = logs.filter(timestamp__gte=start_date)
        else:
            start_date = datetime.now().date()
            logs = logs.filter(timestamp__gte=start_date)
        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            logs = logs.filter(timestamp__lt=end_date)
        logs = logs.order_by("-timestamp")
        log_data = [
            {
                "id": log.id,
                "level": log.level,
                "message": log.message,
                "timestamp": log.timestamp,
                "count": log.count,
            }
            for log in logs
        ]

        return JsonResponse({"logs": log_data})
    else:
        return JsonResponse(
            {"status": "error", "message": "Method not allowed"}, status=405
        )


@csrf_exempt
def delete_log(request, log_id):
    if request.method == "DELETE":
        try:
            log = Log.objects.get(id=log_id)
            log.delete()
            return JsonResponse({"status": "info"})
        except Log.DoesNotExist:
            return JsonResponse(
                {"status": "error", "message": "Log not found"}, status=404
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    else:
        return JsonResponse(
            {"status": "error", "message": "Method not allowed"}, status=405
        )

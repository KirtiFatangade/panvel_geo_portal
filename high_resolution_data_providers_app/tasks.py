from django_celery_results.models import TaskResult
from celery import shared_task
# from .up42_codes import get_up42_products
from map_app.cloud import upload_asset_to_cloud
import traceback
import json


def revoke_task(task_id):
    """
    Revoke (delete) a Celery task using its task_id.
    """
    try:
        task_result = TaskResult.objects.get(task_id=task_id)
        task_result.delete()
        print(f"Task {task_id} has been revoked.")
    except Exception as e:
        traceback.print_exc()


def task_status(task_id):
    try:
        task_result = TaskResult.objects.get(task_id=task_id)
        # Get task state (e.g., PENDING, STARTED, SUCCESS, FAILURE)
        return {
            "task_id": task_id,
            "state": task_result.status,
            "result": json.loads(task_result.result),
        }
    except Exception as e:
        traceback.print_exc()
        return {"task_id": task_id, "state": "STARTED"}


# @shared_task
# def task_up42_get_products(type, geom, dates, cloud):
#     return get_up42_products(type, geom, dates, cloud)


@shared_task
def move_file_to_cloud(url, name, path):
    return upload_asset_to_cloud(url, name, path)

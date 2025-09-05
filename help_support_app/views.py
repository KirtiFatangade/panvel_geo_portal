from django.http import (JsonResponse,HttpResponseServerError)
import traceback
from .models import *
from map_app.models import User
import json


def get_help(request):
    if request.method == "POST":
        data = json.loads(request.body)
        user = User.objects.get(id=data["id"])
        query = Query.objects.create(
            user=user,
            full_name=data["fname"],
            member_email=data["member_email"],
            message=data["message"],
        )
        query.save()
        return JsonResponse(
            {"success": True, "message": "Query stored successfully"},
            status=200,
        )
    else:
        return JsonResponse({"success": False}, status=500)



def manage_support(request, id):
    user = User.objects.get(id=id)
    support_records = Query.objects.filter(user=user)
    support_data = [
        {
            "id": support_record.id,
            "full_name": support_record.full_name,
            "member_email": support_record.member_email,
            "message": support_record.message,
            "resolved": support_record.resolved,
        }
        for support_record in support_records
    ]

    print("support data : ", support_data)
    return JsonResponse({"support_data": support_data}, status=200)


def update_support(request, id):
    try:
        if request.method == "POST":
            data = json.loads(request.body)
            print(data)
            help_support = Query.objects.filter(id=id).first()
            if not help_support:
                return JsonResponse(
                    {"error": "HelpSupport record not found"}, status=404
                )

            if "resolved" in data:
                help_support.resolved = data["resolved"]
                help_support.save()

            return JsonResponse(
                {"message": "Updated HelpSupport successfully", "success": True}
            )

    except Exception as e:
        traceback.print_exc()
        return HttpResponseServerError(str(e))

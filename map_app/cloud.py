import json
import os
import traceback
from django.http import HttpResponse, JsonResponse
from .models import User
from .e2e_bucket_codes import (
    list_bucket,
    remove_object,
    put_object,
    get_object,
    presigned_get_object,
)
import pyshorteners
from .models import User
import requests


def generate_nested_dict(object_details):
    nested_dict = {}
    for obj in object_details:
        path_parts = obj["object_name"].split("/")
        current_dict = nested_dict
        for part in path_parts[:-1]:
            current_dict = current_dict.setdefault(part, {})
        current_dict[path_parts[-1]] = {}
    return nested_dict


def cloud(request, id):
    try:
        # data = json.loads(request.body).get("data", None)
        user = User.objects.get(id=id)
        # bucket_name = user.username
        prefix = f"{user.username}-{user.organization.name}"
        # prefix="admin-VGT"
        # print(prefix)
        total_size, object_details = list_bucket(
            "vgt-portal-2024-bucket", prefix=prefix, recursive=True
        )

        nested_objects = generate_nested_dict(object_details)

        user_data = {"username": user.username, "email": user.email}
        response_data = {
            "user": user_data,
            "bucket_name": os.getenv("E2E_BUCKET_NAME"),
            "total_size": total_size,
            "objects": nested_objects,
            "prefix": prefix,
        }
        return JsonResponse(response_data)

    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    except Exception as e:
        print(e)
        return JsonResponse({"error": "An error occurred"}, status=500)


def deleteCloud(request, id):
    try:
        data = json.loads(request.body)
        bucket_name = data.get("bucket_name")
        object_path = data.get("object_path")

        if not bucket_name or not object_path:
            return JsonResponse(
                {"error": "Bucket name and object path are required."}, status=400
            )

        remove_object(bucket_name, object_path)
        return JsonResponse({"message": "Object removed successfully."}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def Upload_object(request):
    try:
        bucket_name = request.POST.get("bucket_name")
        object_path = request.POST.get("object_path")
        content_type = request.POST.get("content_type", "application/octet-stream")

        if request.method == "POST" and "file" in request.FILES:
            input_file_path = request.FILES["file"]
            with open(
                os.path.join("userUpload", input_file_path.name), "wb"
            ) as destination:
                for chunk in input_file_path.chunks():
                    destination.write(chunk)
        else:
            return JsonResponse({"error": "No file uploaded"}, status=400)

        put_object(
            bucket_name,
            object_path,
            os.path.join("userUpload", input_file_path.name),
            content_type=content_type,
        )

        return JsonResponse(
            {"message": f"Uploaded {input_file_path.name} to {object_path}"}, status=200
        )
    except Exception as e:
        print(e)
        error_message = f"An unexpected error occurred: {str(e)}"
        return JsonResponse({"error": error_message}, status=500)


def download_object(request):
    if request.method == "GET":
        bucket_name = request.GET.get("bucket_name")
        object_path = request.GET.get("object_path")

        try:
            # Temporary file path to store the downloaded object
            temp_file_path = "/tmp/downloaded_file"  # Adjust as per your system's temp file directory

            # Download the object from MinIO to the temporary file
            get_object(bucket_name, object_path, temp_file_path)

            # Open the file and prepare the response for download
            with open(temp_file_path, "rb") as f:
                response = HttpResponse(
                    f.read(), content_type="application/octet-stream"
                )
                response["Content-Disposition"] = (
                    f'attachment; filename="{os.path.basename(object_path)}"'
                )
                return response

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    else:
        return JsonResponse({"error": "Only GET requests are allowed."}, status=405)


def create_object(request):
    try:
        bucket_name = request.POST.get("bucket_name")
        object_path = request.POST.get("object_path")
        file_name = request.POST.get("file_name")
        content_type = request.POST.get("content_type", "application/octet-stream")

        file_content = b""
        file_path = os.path.join("userUpload", "text.txt")

        with open(file_path, "wb") as destination:
            destination.write(file_content)
        print(file_content)
        put_object(bucket_name, object_path, file_path, content_type=content_type)

        return JsonResponse(
            {"message": f"Uploaded {file_name} to {object_path}"}, status=200
        )
    except Exception as e:
        print(e)
        error_message = f"An unexpected error occurred: {str(e)}"
        return JsonResponse({"error": error_message}, status=500)


def upload_image(path, title, id):
    try:
        # Parse the request body
        print(title)
        # Get username from User model
        memb = User.objects.get(id=id)
        image_name = path.split("/")[-1]
        object_path = f"{memb.username}-{memb.organization.name}/{image_name}"
        put_object(
            os.getenv("E2E_BUCKET_NAME"), object_path, path, content_type="image/png"
        )
        # Generate a presigned URL

        return object_path
    except Exception as e:
        print(f"Error in upload_image endpoint: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)


def short_url(object_path):
    try:
        presigned_url = presigned_get_object(os.getenv("E2E_BUCKET_NAME"), object_path)
        s = pyshorteners.Shortener()
        presigned_url = s.tinyurl.short(presigned_url)
    except Exception as e:
        print(e)
        # Return the presigned URL as a JSON response
    return presigned_url


def download_image(request, id):
    try:
        username = User.objects.get(id=id).username
        object_path = f"{username}/Name_1718186143.png"

        presigned_url = presigned_get_object(os.getenv("E2E_BUCKET_NAME"), object_path)

        if presigned_url:
            response = HttpResponse(presigned_url, content_type="image/png")
            response["Content-Disposition"] = (
                f'attachment; filename="Name_1718186143.png"'
            )
            return response
        else:
            return HttpResponse("Image not found", status=404)
    except Exception as e:
        return HttpResponse("Internal server error", status=500)


def upload_asset_to_cloud(url, name, path):
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            temp_file_path = f"media/{name}"
            total_size = int(response.headers.get("content-length", 0))
            chunk_size = 1024
            downloaded_size = 0
            with open(temp_file_path, "wb") as file:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        file.write(chunk)
                        downloaded_size += len(chunk)
                        percent = (downloaded_size / total_size) * 100
                        print(f"\rDownloaded {percent:.2f}%", end="")

            print("\nDownload complete.")
            file_extension = os.path.splitext(name)[1].lower()
            if file_extension == ".zip":
                content_type = "application/zip"
            elif file_extension == ".tif":
                content_type = "image/tiff"
            else:
                content_type = "application/octet-stream"
            put_object(
                os.getenv("E2E_BUCKET_NAME"),
                path,
                temp_file_path,
                content_type=content_type,
            )
            print(f"Uploaded {name} to {path}")
            os.remove(temp_file_path)
    except Exception as e:
        traceback.print_exc()

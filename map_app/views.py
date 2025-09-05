from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.middleware.csrf import get_token
import json
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from PIL import Image
from datetime import datetime
import geopandas as gpd
import pandas as pd
from django.conf import settings
import os
import traceback
import mimetypes
import threading
import requests
import time
from sympy import true
from map_app.geoserver_func import (
    upload_tif,
    upload_file,
    upload_sld_to_geoserver,
    apply_sld,
)
from shapely.geometry import Point, LineString, Polygon
from map_app.test_small_codes import *
from map_app.main_map.sat import (
    get_next_date,
    get_clip_geo,
    thres_change,
    lulc,
)
from map_app.main_map.main import get_sat_layer_data, process_query
from .main_map.forest_fire import get_detections
from .main_map.create_url import get_url
from map_app.gif import make_gif
from .ship import perform_detect
import json
import uuid
import zipfile
import ee
import base64
from .models import *
import geemap
from osgeo import gdal, ogr, osr
from .project import create, fetch, add_layer, update, migrate, add_geo_layer
from .e2e_bucket_codes import list_bucket
from django.core.files.base import ContentFile
import pygsheets
from .uploads import handle_mul_shp, handle_mul_shp_folder, conver_zip_shp
from shapely.geometry import Point, shape, mapping
from shapely.ops import unary_union
import diskcache as dc
import csv
import random
import string
import numpy as np
import rasterio
import shutil
import tempfile
import traceback
from .consts import *


BASELINE_CSV = pd.read_csv("gis_files/adminVector.csv")
DISTRICT_CSV = pd.read_csv("gis_files/district_taluka_dict.csv")
GEOJSON_CONV_LIST = ["shp", "prj", "dbf", "shx"]
TALUKA = "gis_files/Talukas_India/Talukas_India.shp"
AUTH = (os.getenv("GEO_USER"), os.getenv("GEO_PASS"))
CACHE = dc.Cache(os.path.join("media", "earth_engine_cache"))


def extract_hierarchy(zip_file_path):
    """
    Extracts the hierarchical structure of files within a ZIP archive.

    Args:
        zip_file_path (str): The path to the ZIP file.

    Returns:
        dict: A nested dictionary representing the hierarchy of files and folders.
    """
    hierarchy = {}

    # Open the ZIP file for reading
    with zipfile.ZipFile(zip_file_path, "r") as zip_ref:
        # Iterate through the list of files in the ZIP archive
        for file_info in zip_ref.infolist():
            file_path = file_info.filename  # Get the file path
            components = file_path.split("/")  # Split the path into components
            current_level = hierarchy  # Start at the top level of the hierarchy

            # Traverse the components to build the nested structure
            for component in components[:-1]:
                if component not in current_level:
                    current_level[component] = (
                        {}
                    )  # Create a new dictionary for the component
                current_level = current_level[component]  # Move to the next level

            # Add the file at the current level
            current_level[components[-1]] = None  # The last component is the file name

    return hierarchy


def generate_metadata(folder, name):
    """
    Recursively generates metadata for a folder and its contents, including subfolders and files. The metadata
    includes information such as the type of data, bounds, and the structure of the folder.

    Args:
        folder (str): The path to the folder whose metadata needs to be generated.
        name (str): The name of the folder or parent directory.

    Returns:
        dict: A dictionary representing the metadata, including information about the folder, its contents,
              and the children (files or subfolders) within it.
    """
    # Initialize the metadata for the folder
    metadata = {"type": "parent", "name": name, "children": []}

    # Process shapefiles (or other vector files) in the folder
    results = handle_mul_shp_folder(folder)
    if len(results):
        print(folder, results)
        for res in results:
            # Add metadata for each shapefile or vector file found in the results
            metadata["children"].append(
                {
                    "id": res["id"],
                    "name": res["name"],
                    "type": "vector",
                    "bounds": res["bounds"],
                }
            )

    # Recursively process each item in the folder
    for i in os.listdir(folder):
        item_path = os.path.join(folder, i)

        # If the item is a subfolder, recursively call generate_metadata
        if os.path.isdir(item_path):
            metadata["children"].append(generate_metadata(item_path, i))

        # If the item is a supported file type (zip, tif, kml, kmz, geojson), process it
        if os.path.isfile(item_path) and (
            i.endswith(".zip")
            or i.endswith(".tif")
            or i.endswith(".kml")
            or i.endswith(".kmz")
            or i.endswith(".geojson")
        ):
            path = item_path

            # If the file is in KML, KMZ, or GeoJSON format, convert it
            if i.endswith(".kml") or i.endswith(".kmz") or i.endswith(".geojson"):
                print("Processing file:", i)
                path = conver_zip_shp(folder, i)

            print("Processing path:", path)

            try:
                # Upload the file and retrieve its metadata
                name, id, bounds, type = upload_file(path)
                print(
                    f"Uploaded file - Name: {name}, ID: {id}, Bounds: {bounds}, Type: {type}"
                )

                # Add the file's metadata to the folder's metadata
                metadata["children"].append(
                    {"id": id, "name": name, "type": type, "bounds": bounds}
                )
            except Exception as e:
                # In case of failure, continue to the next file
                print(f"Error processing file {path}: {e}")
                continue

    return metadata


def index(request):
    """
    Renders the index.html template when a request is made to the index view.

    Args:
        request: The HTTP request object.

    Returns:
        HttpResponse: The rendered index.html template.
    """
    # Render and return the "index.html" template
    return render(request, "index.html")


def is_session(request):
    """
    Checks if a user session exists and retrieves user information if available.

    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response containing user information with a 200 status
                      if the session is valid, or an empty JSON with a 403 status if not.
    """
    # Check if "user_info" exists in the session
    if "user_info" in request.session:
        # Check if "id" exists in the user_info session data
        if "id" in request.session["user_info"]:
            # Retrieve the User object based on the ID from the session
            user_obj = User.objects.get(id=request.session["user_info"]["id"])

            # Update the session's credits based on user organization details
            request.session["user_info"]["credits"] = (
                user_obj.organization.credits
                if user_obj.email == user_obj.organization.email_address
                else user_obj.credits
            )

        # Return the user information as a JSON response with a 200 status
        return JsonResponse({"user": request.session["user_info"]}, status=200)
    else:
        # Return an empty JSON response with a 403 status if no session exists
        return JsonResponse({}, status=403)


def csrf(request):
    """
    Returns a JSON response containing a CSRF token.

    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response with the CSRF token.
    """
    # Generate and return a CSRF token as a JSON response
    return JsonResponse({"csrfToken": get_token(request)})


def generate_metadata(folder, name):
    print(folder, name)
    metadata = {"type": "parent", "name": name, "children": []}
    results = handle_mul_shp_folder(folder)
    if len(results):
        print(folder, results)
        for res in results:
            metadata["children"].append(
                {
                    "id": res["id"],
                    "name": res["name"],
                    "type": "vector",
                    "bounds": res["bounds"],
                }
            )
    for i in os.listdir(folder):
        if os.path.isdir(os.path.join(folder, i)):
            metadata["children"].append(generate_metadata(os.path.join(folder, i), i))
        if os.path.isfile(os.path.join(folder, i)) and (
            i.endswith(".zip")
            or i.endswith(".tif")
            or i.endswith(".kml")
            or i.endswith(".kmz")
            or i.endswith(".geojson")
        ):
            path = os.path.join(folder, i)
            if i.endswith(".kml") or i.endswith(".kmz") or i.endswith(".geojson"):
                print("hello", i)
                path = conver_zip_shp(folder, i)

            print("p", path)
            try:
                name, id, bounds, type = upload_file(path)
                print(name, id, bounds, type)
                metadata["children"].append(
                    {"id": id, "name": name, "type": type, "bounds": bounds}
                )
            except:
                continue
    return metadata


@csrf_exempt
def admin_get_file(request):
    if request.method == "POST":
        try:
            # Parse the JSON body of the request and retrieve the "data" field
            data = json.loads(request.body).get("data", None)
            print(f"Data received: {data}")

            if data is None:
                return JsonResponse({"message": "Missing 'data' field"}, status=400)

            # Get the color associated with the shapefile using the provided data
            color = get_shp_file(data)
            print(f"Color retrieved: {color}")
            # Return a JSON response containing the color
            return JsonResponse({"color": color})

        except Exception as e:
            # Handle any errors and return a 400 status code with a generic error message
            print(f"Error: {e}")
            return JsonResponse({"message": "Invalid request"}, status=400)

    # If the request method is not POST, return a method not allowed response
    return JsonResponse({"message": "Invalid request method"}, status=405)


def get_shp_file(name):
    """
    Retrieve shapefile data and associated style information based on the provided name.

    This function searches for a shapefile in the BASELINE_CSV DataFrame using the `name` parameter.
    If a match is found, it returns either the GeoJSON representation of the shapefile with color,
    or just the color and stroke information for the specified shape.

    Args:
        name (str): The name of the shapefile to retrieve.

    Returns:
        tuple or list:
            - If `name` is "raigaid_taluka", returns a tuple (geoj, color), where `geoj` is the
              GeoJSON representation of the shapefile and `color` is the associated color.
            - Otherwise, returns a list with color and stroke if stroke is non-zero, or just color if stroke is zero.

    Raises:
        Exception: Logs any exceptions that occur during file reading or data processing.

    """
    try:
        # Filter BASELINE_CSV to find the record that matches the given `name`
        filtered_df = BASELINE_CSV[BASELINE_CSV["name"] == name].to_dict(
            orient="records"
        )

        # Handle the special case for "raigaid_taluka"
        if name == "raigaid_taluka":
            # Load the shapefile using the file name from the filtered DataFrame
            boundry_gdf = gpd.read_file(
                os.path.join("Baseline", filtered_df[0]["file_name"])
            )
            # Convert the shapefile data to GeoJSON format
            geoj = boundry_gdf.to_json()
            # Return the GeoJSON and color information
            return geoj, filtered_df[0]["color"]

        # Check if the stroke value is non-zero and return color and stroke if so
        if filtered_df[0]["stroke"] != "0":
            return [filtered_df[0]["color"], filtered_df[0]["stroke"]]
        else:
            # Return only color if stroke is zero or unspecified
            return filtered_df[0]["color"]

    except Exception as e:
        # Log the exception traceback for debugging purposes
        traceback.print_exc()


def a_tile(request, name, z, x, y):
    filtered_df = BASELINE_CSV[BASELINE_CSV["name"] == name].to_dict(orient="records")

    path = os.path.join(
        os.getcwd(), filtered_df[0]["file_name"], str(z), str(x), f"{y}.png"
    )
    with open(path, "rb") as f:
        return HttpResponse(f.read(), content_type="image/png")


def get_image_data(request, id):
    try:
        data = []
        for filename in os.listdir(os.path.join("JeevitNadi", str(id))):
            image_path = os.path.join("JeevitNadi", str(id), str(filename))
            with Image.open(image_path) as image:
                creation_date = None
                exif_data = image._getexif()
                if exif_data is not None:
                    creation_date = exif_data.get(0x9003)

                if creation_date:
                    creation_date = datetime.strptime(
                        creation_date, "%Y:%m:%d %H:%M:%S"
                    )
                    creation_date_str = creation_date.strftime("%Y-%m-%d")
                else:
                    creation_date_str = "N/A"
            data.append({"name": filename, "date": creation_date_str})
        return JsonResponse({"ImageData": data})
    except:
        return JsonResponse({"message": "Invalid request method"}, status=405)


def serve_image(request, id, name):
    image_path = os.path.join("JeevitNadi", str(id), str(name))
    content_type, _ = mimetypes.guess_type(name)
    with open(image_path, "rb") as image_file:
        return HttpResponse(image_file.read(), content_type=content_type)


def image_serve(request, name):
    image_path = os.path.join("survey", str(name))
    content_type, _ = mimetypes.guess_type(name)
    with open(image_path, "rb") as image_file:
        return HttpResponse(image_file.read(), content_type=content_type)


def process_file(
    id, file_name, file_extension, upload_dir, total_chunks, sld_name=None
):
    try:
        obj = Selfcache.objects.get(cache_id=f"{id}_f")
    except:
        obj = Selfcache(cache_id=f"{id}_f")
    obj.status = {"status": "assemble", "meta": {}}
    obj.save()
    # Assemble the chunks into the final file at the primary location
    final_path = os.path.join(upload_dir, file_name)
    with open(final_path, "wb") as final_file:
        for idx in range(total_chunks):
            temp_chunk_path = os.path.join(upload_dir, f"{file_name}.part{idx}")
            with open(temp_chunk_path, "rb") as temp_chunk_file:
                final_file.write(temp_chunk_file.read())
            os.remove(temp_chunk_path)
    # Assemble the chunks into the final file at the secondary location
    # secondary_final_path = os.path.join(secondary_dir, file_name)
    # with open(secondary_final_path, "wb") as secondary_final_file:
    #     for idx in range(total_chunks):
    #         secondary_chunk_path = os.path.join(secondary_dir, f"{file_name}.part{idx}")
    #         with open(secondary_chunk_path, "rb") as secondary_chunk_file:
    #             secondary_final_file.write(secondary_chunk_file.read())
    #         os.remove(secondary_chunk_path)
    obj.status = {"status": "process", "meta": {}}
    obj.save()
    if file_extension.lower() in [".tif", ".tiff", ".geotiff"]:
        try:
            name, id, bounds, type = upload_file(final_path)
            obj.status = {
                "status": "complete",
                "meta": {
                    "message": "success",
                    "name": id,
                    "bounds": bounds,
                    "path": final_path,
                    "type": type,
                },
            }
            obj.save()
        except Exception as e:
            obj.status = {"status": "error", "meta": {"message": "error"}}
            obj.save()
    elif file_extension.lower() == ".zip":
        try:
            name, id, bounds, type = upload_file(final_path)
            file_url = f"/home/service-vasundharaa/Desktop/vgt-geo-portal-web-app/map_app/useruploads/upload_ae354e/Phulambri_block.shp"
            obj.status = {
                "status": "complete",
                "meta": {
                    "message": "success",
                    "name": id,
                    "bounds": bounds,
                    "path": file_url,
                    "type": type,
                },
            }
            obj.save()

        except Exception as e:
            traceback.print_exc()
            obj.status = {"status": "error", "meta": {"message": "error"}}
            obj.save()
    elif file_extension.lower() == ".csv":
        try:
            csv_content = []
            with open(final_path, "r") as csv_file:
                csv_reader = csv.DictReader(csv_file)
                for row in csv_reader:
                    csv_content.append(row)
            columns = list(csv_content[0].keys())
            obj.status = {
                "status": "complete",
                "meta": {
                    "message": "csv",
                    "file_path": final_path,
                    "csv_content": columns,
                },
            }
            obj.save()
        except Exception as e:
            obj.status = {"status": "error", "meta": {"message": "error"}}
            obj.save()
    elif file_extension.lower() in [".kml", ".kmz", ".geojson"]:
        try:
            path = conver_zip_shp(upload_dir, file_name)
            print(path)
            try:
                name, id, bounds, type = upload_file(path)
                obj.status = {
                    "status": "complete",
                    "meta": {
                        "message": "success",
                        "name": id,
                        "bounds": bounds,
                        "path": final_path,
                        "type": type,
                    },
                }
                obj.save()
            except Exception as e:
                obj.status = {"status": "error", "meta": {"message": "error"}}
                obj.save()
        except Exception as e:
            obj.status = {"status": "error", "meta": {"message": "error"}}
            obj.save()
    elif file_extension.lower() == ".sld":
        style_name = sld_name
        if upload_sld_to_geoserver(final_path, style_name, id):
            obj.status = {
                "status": "complete",
                "meta": {"message": "sld", "status": True},
            }
            obj.save()
        else:
            obj.status = {
                "status": "complete",
                "meta": {"message": "sld", "status": False},
            }
            obj.save()


# def sse(request, id):
#     def event_stream():
#         while True:
#             obj = None
#             status = None
#             try:
#                 obj = Selfcache.objects.get(cache_id=f"{id}_f")
#             except:
#                 pass
#             if obj:
#                 status = obj.status
#             if status:
#                 if isinstance(status, dict):
#                     yield f'data: {json.dumps(status["meta"])}\n\n'
#                 if (
#                     isinstance(status, dict)
#                     and status["status"] == "complete"
#                     or status["status"] == "error"
#                 ):
#                     obj.delete()
#                     break
#             time.sleep(5)

#     response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
#     response["Cache-Control"] = "no-cache"
#     return response


def get_cache_update(request, id):
    obj = None
    status = None
    try:
        obj = Selfcache.objects.get(cache_id=f"{id}_f")
    except Selfcache.DoesNotExist:
        return JsonResponse({"message": "not_found"})

    if obj:
        status = obj.status
        print('obj status', status)

    if status:
        if isinstance(status, dict):
            # Check if the status is complete or error
            if status["status"] == "complete" or status["status"] == "error":
                obj.delete()  # Delete the cache once the task is complete
                return JsonResponse(status["meta"], status=200)
    print('status', status)
    return JsonResponse({"message": "not_found"})



@csrf_exempt
def save_file(request, user_id):
    if request.method == "POST":
        try:
            chunk = request.FILES["chunk"]
            chunk_index = int(request.POST["chunkIndex"])
            total_chunks = int(request.POST["totalChunks"])
            file_name = request.POST["fileName"]
            allowed_extensions = [
                ".tif",
                ".tiff",
                ".geotiff",
                ".zip",
                ".csv",
                ".kml",
                ".kmz",
                ".geojson",
                ".sld",
            ]
            _, file_extension = os.path.splitext(file_name)
            if file_extension.lower() not in allowed_extensions:
                return JsonResponse(
                    {"error": "Unsupported file extension."},
                    status=400,
                )

            # upload_dir = "/v1-data/useruploads"
            # os.makedirs(upload_dir, exist_ok=True)
            # temp_chunk_path = os.path.join(upload_dir, f"{file_name}.part{chunk_index}")
            # # Save the chunk to a temporary file
            # with open(temp_chunk_path, "wb") as temp_chunk_file:
            #     for chunk_part in chunk.chunks():
            #         temp_chunk_file.write(chunk_part)

            # if all(
            #     os.path.exists(os.path.join(upload_dir, f"{file_name}.part{idx}"))
            #     for idx in range(total_chunks)
            # ):
            #     response = JsonResponse(
            #         {"message": "chunk received", "lastChunk": True}
            #     )

            #     # Start processing in a new thread
            #     processing_thread = threading.Thread(
            #         target=process_file,
            #         args=(
            #             user_id,
            #             file_name,
            #             file_extension,
            #             upload_dir,
            #             total_chunks,
            #             request.POST.get("name", ""),
            #         ),
            #     )
            #     processing_thread.start()

            #     return response
            # return JsonResponse({"message": "chunk received"})

            flask_url = f"https://geoserver.vasundharaa.in/flask/upload/{user_id}"

            # Prepare files and data to send to Flask
            files = {"chunk": chunk}
            data = {
                "chunkIndex": chunk_index,
                "totalChunks": total_chunks,
                "fileName": file_name,
                "name": request.POST.get("name", ""),
            }

            # Send POST request to Flask
            response = requests.post(flask_url, files=files, data=data, timeout=3600)

            # Return the response from Flask to the client
            if response.status_code == 200:
                return JsonResponse(response.json())
            else:
                return JsonResponse(
                    {"error": "Failed to process file on Flask server."},
                    status=response.status_code,
                )

        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": "Invalid request."})
    else:
        return JsonResponse({"error": "Invalid request."})


# @csrf_exempt
# def save_files(request):
#     try:
#         if request.method == "POST":
#             res_data = {"path": []}
#             metadata = {"children": []}
#             upload_dir = "/v1-data/useruploads"
#             try:
#                 os.makedirs(upload_dir, exist_ok=True)
#             except Exception as e:
#                 traceback.print_exc()

#             try:
#                 chunk = request.FILES["chunk"]
#                 chunk_index = int(request.POST.get("chunkIndex"))
#                 total_chunks = int(request.POST.get("totalChunks"))
#                 file_name = request.POST.get("fileName")
#                 temp_file_path = os.path.join(
#                     upload_dir, f"{file_name}.part{chunk_index}"
#                 )
#                 with open(temp_file_path, "wb") as temp_file:
#                     for chunk in chunk.chunks():
#                         temp_file.write(chunk)
#                 # secondary_dir = '/v1-data/useruploads'  # Replace with your actual secondary directory
#                 # os.makedirs(secondary_dir, exist_ok=True)
#                 # secondary_chunk_path = os.path.join(secondary_dir, f"{file_name}.part{chunk_index}")

#                 # Copy the chunk to the secondary location
#                 # shutil.copy(temp_file_path, secondary_chunk_path)

#                 if chunk_index == total_chunks - 1:

#                     final_file_path = os.path.join(upload_dir, file_name)

#                     with open(final_file_path, "wb") as final_file:
#                         for i in range(total_chunks):
#                             temp_chunk_path = os.path.join(
#                                 upload_dir, f"{file_name}.part{i}"
#                             )
#                             with open(temp_chunk_path, "rb") as temp_chunk_file:
#                                 final_file.write(temp_chunk_file.read())
#                             os.remove(temp_chunk_path)
#                     # secondary_final_path = os.path.join(secondary_dir, file_name)
#                     # with open(secondary_final_path, "wb") as secondary_final_file:
#                     #     for idx in range(total_chunks):
#                     #         secondary_chunk_path = os.path.join(secondary_dir, f"{file_name}.part{idx}")
#                     #         with open(secondary_chunk_path, "rb") as secondary_chunk_file:
#                     #             secondary_final_file.write(secondary_chunk_file.read())
#                     #         os.remove(secondary_chunk_path)
#                     file_extension = file_name.split(".")[-1].lower()
#                     if file_extension in ["geojson", "kml", "kmz", "csv"]:
#                         path = conver_zip_shp(upload_dir, file_name)
#                         name, id, bounds, type = upload_file(path)
#                         metadata["children"].append(
#                             {
#                                 "id": id,
#                                 "name": name,
#                                 "type": "vector",
#                                 "bounds": bounds,
#                             }
#                         )
#                         res_data["path"].append(final_file_path)

#                     elif file_extension == "zip":
#                         fol = any(
#                             v is not None
#                             for v in extract_hierarchy(final_file_path).values()
#                         )
#                         if not fol:
#                             res = handle_mul_shp(final_file_path)
#                             for i in res:
#                                 metadata["children"].append(
#                                     {
#                                         "id": i["id"],
#                                         "name": i["name"],
#                                         "type": "vector",
#                                         "bounds": i["bounds"],
#                                     }
#                                 )
#                             res_data["path"].append(final_file_path)
#                         else:
#                             extracted_dir = os.path.join(
#                                 final_file_path[:-4], uuid.uuid4().hex
#                             )
#                             os.makedirs(extracted_dir, exist_ok=True)
#                             with zipfile.ZipFile(final_file_path, "r") as zip_ref:
#                                 zip_ref.extractall(extracted_dir)

#                             res = handle_mul_shp_folder(extracted_dir)
#                             for i in res:
#                                 metadata["children"].append(
#                                     {
#                                         "id": i["id"],
#                                         "name": i["name"],
#                                         "type": "vector",
#                                         "bounds": i["bounds"],
#                                     }
#                                 )
#                             for key, value in extract_hierarchy(
#                                 final_file_path
#                             ).items():
#                                 if value:
#                                     data = generate_metadata(
#                                         os.path.join(extracted_dir, key), key
#                                     )
#                                     metadata["children"].append(data)
#                                 else:
#                                     file_path = os.path.join(extracted_dir, key)
#                                     if key.lower().endswith(
#                                         (".kml", ".kmz", ".geojson")
#                                     ):
#                                         path = conver_zip_shp(extracted_dir, key)
#                                     else:
#                                         path = file_path
#                                     try:
#                                         name, id, bounds, type = upload_file(path)
#                                         metadata["children"].append(
#                                             {
#                                                 "id": id,
#                                                 "name": name,
#                                                 "type": type,
#                                                 "bounds": bounds,
#                                             }
#                                         )
#                                     except Exception as upload_exception:
#                                         print(
#                                             f"Error uploading file {key}: {upload_exception}"
#                                         )
#                                         continue
#                             res_data["path"].append(final_file_path)

#                     elif file_extension in ["tif", "tiff", "geotiff"]:
#                         print("tif")
#                         name = "upload_" + uuid.uuid4().hex[:6]
#                         bounds = upload_tif(final_file_path, name)
#                         if bounds:
#                             metadata["children"].append(
#                                 {
#                                     "id": name,
#                                     "name": os.path.splitext(file_name)[0],
#                                     "type": "raster",
#                                     "bounds": bounds,
#                                 }
#                             )
#                             res_data["path"].append(final_file_path)
#                             print(file_name)
#                         else:
#                             os.remove(final_file_path)
#                 else:
#                     return JsonResponse({}, status=200)

#             except Exception as file_exception:
#                 print(f"Error processing file {file_name}: {file_exception}")

#             return JsonResponse(
#                 {"message": "success", "metadata": metadata, "data": res_data}
#             )
#     except Exception as e:
#         traceback.print_exc()
#         return JsonResponse({"error": "Invalid request."})


@csrf_exempt
def save_files(request):
    try:
        if request.method == "POST":
            flask_url = (
                "https://geoserver.vasundharaa.in/flask/save_files"
            )
            chunk = request.FILES.get("chunk")
            chunk_index = request.POST.get("chunkIndex")
            total_chunks = request.POST.get("totalChunks")
            file_name = request.POST.get("fileName")

            # Prepare data to send to Flask
            data = {
                "chunkIndex": chunk_index,
                "totalChunks": total_chunks,
                "fileName": file_name,
            }

            # Send the chunk directly to Flask server
            files = {
                "chunk": chunk,
            }

            # Forward the request to Flask with chunk and metadata
            flask_response = requests.post(flask_url, data=data, files=files)

            # Handle response from Flask
            if flask_response.status_code == 200 or flask_response.status_code == 201:
                flask_data = flask_response.json()
                print(f'flask data: {flask_data}')
                return JsonResponse(flask_data)
            else:
                return JsonResponse(
                    {"error": "Error while processing file on Flask server."},
                    status=flask_response.status_code,
                )
        else:
            return JsonResponse({"error": "Invalid request method."}, status=405)

    except Exception as e:
        print(f"Error in save_files: {e}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def save_file_convert(request):
    if request.method == "POST":
        try:
            chunk = request.FILES["chunk"]
            chunk_index = int(request.POST["chunkIndex"])
            total_chunks = int(request.POST["totalChunks"])
            file_name = request.POST["fileName"]
            allowed_extensions = [".kml", ".gpx"]
            _, file_extension = os.path.splitext(file_name)

            if file_extension.lower() not in allowed_extensions:
                return JsonResponse({"error": "Unsupported file extension."})

            upload_dir = "media/useruploads"
            os.makedirs(upload_dir, exist_ok=True)
            temp_chunk_path = os.path.join(upload_dir, f"{file_name}.part{chunk_index}")

            # Save the chunk to a temporary file
            with open(temp_chunk_path, "wb") as temp_chunk_file:
                for chunk_part in chunk.chunks():
                    temp_chunk_file.write(chunk_part)

            # Check if all chunks have been uploaded
            if all(
                os.path.exists(os.path.join(upload_dir, f"{file_name}.part{idx}"))
                for idx in range(total_chunks)
            ):
                final_path = os.path.join(upload_dir, file_name)
                with open(final_path, "wb") as final_file:
                    for idx in range(total_chunks):
                        temp_chunk_path = os.path.join(
                            upload_dir, f"{file_name}.part{idx}"
                        )
                        with open(temp_chunk_path, "rb") as temp_chunk_file:
                            final_file.write(temp_chunk_file.read())
                        os.remove(temp_chunk_path)

                # Prepare for SHP creation and zipping
                output_shp_dir = os.path.join(upload_dir, file_name.split(".")[0])
                os.makedirs(output_shp_dir, exist_ok=True)

                if file_name.endswith(".kml") or file_name.endswith(".kmz"):
                    input_file = final_path
                    input_ds = ogr.Open(input_file)
                    layer = input_ds.GetLayer()
                    driver = ogr.GetDriverByName("ESRI Shapefile")
                    output_ds = driver.CreateDataSource(
                        os.path.join(output_shp_dir, file_name.split(".")[0] + ".shp")
                    )
                    output_layer = output_ds.CopyLayer(
                        layer, f'{file_name.split(".")[0]}'
                    )
                    input_ds = None
                    output_ds = None

                elif file_name.endswith(".gpx"):
                    input_file = final_path
                    input_ds = ogr.Open(input_file)
                    layer = input_ds.GetLayer()
                    driver = ogr.GetDriverByName("ESRI Shapefile")
                    output_ds = driver.CreateDataSource(
                        os.path.join(output_shp_dir, file_name.split(".")[0] + ".shp")
                    )
                    output_layer = output_ds.CopyLayer(
                        layer, f'{file_name.split(".")[0]}'
                    )
                    input_ds = None
                    output_ds = None

                # Create zip file
                output_zip_path = os.path.join(
                    upload_dir, f"{file_name.split('.')[0]}.zip"
                )
                with zipfile.ZipFile(output_zip_path, "w") as zip_file:
                    for root, _, files in os.walk(output_shp_dir):
                        for file in files:
                            zip_file.write(
                                os.path.join(root, file),
                                os.path.relpath(
                                    os.path.join(root, file),
                                    os.path.join(output_shp_dir, ".."),
                                ),
                            )

                return JsonResponse(
                    {
                        "message": "File converted and zipped.",
                        "zip_file": output_zip_path,
                        "lastChunk": True,
                    }
                )

            return JsonResponse({"message": "Chunk received."})
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": "Invalid request."})
    else:
        return JsonResponse({"error": "Invalid request."})


@csrf_exempt
def upload_image_georef(request):
    try:
        if request.method == "POST":
            upload_dir = "media/useruploads"
            os.makedirs(upload_dir, exist_ok=True)

            try:
                chunk = request.FILES["chunk"]
                chunk_index = int(request.POST.get("chunkIndex"))
                total_chunks = int(request.POST.get("totalChunks"))
                original_file_name = request.POST.get("fileName")

                # Generate a random key and append it to the filename

                # Save the chunk temporarily
                temp_file_path = os.path.join(
                    upload_dir, f"{original_file_name}.part{chunk_index}"
                )
                with open(temp_file_path, "wb") as temp_file:
                    for chunk in chunk.chunks():
                        temp_file.write(chunk)

                # If this is the last chunk, combine all chunks into the final file
                if chunk_index == total_chunks - 1:
                    random_key = uuid.uuid4().hex  # Generate a unique random key
                    file_name = f"{random_key}_{original_file_name}"
                    final_file_path = os.path.join(upload_dir, file_name)

                    with open(final_file_path, "wb") as final_file:
                        for i in range(total_chunks):
                            temp_chunk_path = os.path.join(
                                upload_dir, f"{original_file_name}.part{i}"
                            )
                            with open(temp_chunk_path, "rb") as temp_chunk_file:
                                final_file.write(temp_chunk_file.read())
                            os.remove(temp_chunk_path)  # Remove temp chunk

                    # Get the image size using Pillow
                    try:
                        with Image.open(final_file_path) as img:
                            width, height = img.size
                    except Exception as e:
                        print(f"Error reading image size: {e}")
                        width, height = None, None

                    # Return success response with file path and image size
                    return JsonResponse(
                        {
                            "message": "success",
                            "path": final_file_path,
                            "width": width,
                            "height": height,
                        }
                    )
                else:
                    # Return partial upload success response
                    return JsonResponse({}, status=200)

            except Exception as e:
                print(f"Error during chunk handling: {e}")
                return JsonResponse({"error": str(e)}, status=500)

    except Exception as e:
        print(f"Error in upload_image_georef: {e}")
        return JsonResponse({"error": "Invalid request."}, status=400)


# @csrf_exempt
# def upload_csv(request):
#     try:
#         if request.method == "POST":
#             uploaded_file = request.POST.get("path")
#             latitude = request.POST.get("latitude")
#             longitude = request.POST.get("longitude")
#             if not (latitude and longitude):
#                 return JsonResponse(
#                     {"error": "Latitude and longitude are required."}, status=400
#                 )

#             path = conver_zip_shp(
#                 "/v1-data/useruploads",
#                 uploaded_file.split("/")[-1],
#                 latitude,
#                 longitude,
#             )
#             name, id, bounds, type = upload_file(path)
#             print(name, id, bounds, type)
#             if name and id and bounds and type:
#                 return JsonResponse(
#                     {
#                         "message": "success",
#                         "name": id,
#                         "bounds": bounds,
#                         "path": uploaded_file,
#                         "type": type,
#                     }
#                 )

#     except IOError as e:
#         return JsonResponse(
#             {"error": "An error occurred while processing the file."}, status=500
#         )

#     except Exception as e:
#         traceback.print_exc()
#         return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def upload_csv(request):
    try:
        if request.method == "POST":
            uploaded_file = request.POST.get("path")
            latitude = request.POST.get("latitude")
            longitude = request.POST.get("longitude")

            # Validate latitude and longitude
            if not (latitude and longitude):
                return JsonResponse(
                    {"error": "Latitude and longitude are required."}, status=400
                )

            # Define Flask URL where the request will be redirected
            flask_url = "https://geoserver.vasundharaa.in/flask/upload_csv"

            # Prepare data for forwarding to Flask
            data = {"path": uploaded_file, "latitude": latitude, "longitude": longitude}

            # Send POST request to Flask server
            response = requests.post(flask_url, data=data)

            # Handle response from Flask server
            if response.status_code == 200:
                return JsonResponse(response.json())
            else:
                return JsonResponse(
                    {"error": "Failed to process CSV file on Flask server."},
                    status=response.status_code,
                )

    except IOError as e:
        return JsonResponse(
            {"error": "An error occurred while processing the file."}, status=500
        )

    except Exception as e:
        print(e)
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def save_file_to_db(request, id):
    if request.method == "POST":
        try:
            uploaded_file = request.FILES["file"]  # Change to a single file input
            file_name = uploaded_file.name
            allowed_extensions = [
                ".zip",
                ".kml",
                ".kmz",
                ".geojson",
            ]

            upload_dir = "userUpload"
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, file_name)

            # Save the uploaded file to the specified path
            with open(file_path, "wb") as destination_file:
                for chunk in uploaded_file.chunks():
                    destination_file.write(chunk)

            file_name, file_extension = os.path.splitext(file_name)
            if file_extension.lower() not in allowed_extensions:
                return JsonResponse({"error": "Unsupported file extension."})
            print(file_name, file_extension)
            path = None
            if file_extension.lower() in [".kml", ".kmz", ".geojson"]:
                path = conver_zip_shp(upload_dir, uploaded_file.name)
                print(path)
            if file_extension == ".zip":
                temp_dir = os.path.join("userUpload", file_name)
                os.makedirs(temp_dir, exist_ok=True)

                with zipfile.ZipFile(file_path, "r") as zfile:
                    zfile.extractall(temp_dir)

                path = temp_dir
            print(path)
            from chatbot_app.mode1_codes import upload_shp

            upload_shp(User.objects.get(id=id).organization.id, path, file_name)
            if os.path.exists(file_path):
                os.remove(file_path)  # Remove the uploaded file

            if path and os.path.exists(path):
                shutil.rmtree(path)  #
            return HttpResponse(status=200)

        except Exception as e:
            traceback.print_exc()
            return HttpResponse(status=400)
    else:
        return JsonResponse({"error": "Invalid request."})


@csrf_exempt
def get_building_data(request):
    if request.method == "POST":
        data = json.loads(request.body).get("data", None)
        dataset = ee.FeatureCollection(
            "GOOGLE/Research/open-buildings/v3/polygons"  # GOOGLE/Research/open-buildings/v3/polygons_FeatureView
        ).filterBounds(ee.Geometry.Rectangle(data["extent"]))
        dataset = dataset.style(fillColor="0000", color="red", width=1.0)
        url = get_url(dataset, {})
        if ("project") in data:
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            vis = {
                "box": data["extent"] if "extent" in data else None,
            }
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            print(parent)
            act = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url,
                    "date": None,
                    "name": "Building Footprint Extraction",
                    "vis": vis,
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act.save()
        return JsonResponse({"url": url, "id": act.id})
        # return JsonResponse({"res":[{"type":"url","name":"Building Footprint Extraction","id":act.id,"data":url}]})

    else:
        return JsonResponse({"error": "Invalid request."})


@csrf_exempt
def get_gif(request):
    if request.method == "POST":
        data = json.loads(request.body).get("data", None)
        x1, y1, x2, y2 = (
            data["aoi"]["_southWest"]["lng"],
            data["aoi"]["_southWest"]["lat"],
            data["aoi"]["_northEast"]["lng"],
            data["aoi"]["_northEast"]["lat"],
        )
        aoi = ee.Geometry.Rectangle([x1, y1, x2, y2])
        try:
            name = make_gif(
                data["start_date"],
                data["end_date"],
                aoi,
                (
                    "COPERNICUS/S2_SR_HARMONIZED"
                    if data["dataset"] == "sen"
                    else "LANDSAT/LC08/C02/T1_L2"
                ),
                (data["width"], data["height"]),
                data["fps"],
            )
            with open(name, "rb") as file:
                encoded_gif = base64.b64encode(file.read()).decode("utf-8")
            os.remove(name)
            return JsonResponse({"gif": encoded_gif})
        except:
            return HttpResponse(status=403)


def get_taluka(request, dis):
    try:
        filtered_df = DISTRICT_CSV[DISTRICT_CSV["District"] == dis].to_dict(
            orient="records"
        )
        gdf = gpd.read_file(TALUKA)
        filter = gdf[gdf["NAME_2"] == dis]
        return JsonResponse({"taluka": filter["NAME_3"].tolist()})
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=403)


def get_water_body(request, type_name, name):
    try:
        dataframe = (
            gpd.read_file(os.path.join(os.getcwd(), "MH_TQ", "MH_TQ.shp"))
            if type_name == "tal"
            else gpd.read_file(
                os.path.join(os.getcwd(), "MH_District_wise", "District_wise.shp")
            )
        )
        water = gpd.read_file(
            os.path.join(os.getcwd(), "MH_water_bodies", "MH_water_bodies.shp")
        )
        selected_tq = (
            dataframe[dataframe["NAME_3"] == name]
            if type_name == "tal"
            else dataframe[dataframe["d_name"] == name]
        )
        op_water = water[water.intersects(selected_tq.unary_union)].to_json()
        return JsonResponse({"geo": op_water})
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=405)


def get_dis_list(request):
    try:
        main = ee.FeatureCollection("FAO/GAUL/2015/level2")
        india = main.filterMetadata("ADM0_NAME", "equals", "India")
        disList = ee.List(india.aggregate_array("ADM2_NAME")).distinct()
        return JsonResponse({"district": disList.getInfo()})
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=405)


def get_clip_list(request, type_name=None, name=None):
    try:
        main = ee.FeatureCollection("FAO/GAUL/2015/level2")
        countryList = (
            ee.List(main.aggregate_array("ADM0_NAME"))
            .distinct()
            .filter(
                ee.Filter.inList(
                    "item", ["Jammu and Kashmir", "Aksai Chin", "Arunachal Pradesh"]
                ).Not()
            )
        )
        if type_name == "state":
            selectedCountry = main.filterMetadata("ADM0_NAME", "equals", name)
            stateNames = (
                ee.List(
                    selectedCountry.filterMetadata(
                        "ADM1_NAME", "not_equals", ""
                    ).aggregate_array("ADM1_NAME")
                )
                .distinct()
                .sort()
            )
            stateNames = (
                stateNames.cat(ee.List(["Jammu and Kashmir", "Ladakh"]))
                if name == "India"
                else stateNames
            )
            return JsonResponse({"state": stateNames.getInfo()})
        elif type_name == "dis":
            selectedState = main.filterMetadata("ADM1_NAME", "equals", name)
            districtNames = (
                ee.List(
                    selectedState.filterMetadata(
                        "ADM2_NAME", "not_equals", ""
                    ).aggregate_array("ADM2_NAME")
                )
                .distinct()
                .sort()
            )
            return JsonResponse({"district": districtNames.getInfo()})
        elif type_name == "tal":
            print("tal")
            gdf = gpd.read_file(TALUKA)
            filter = gdf[gdf["NAME_2"] == name]
            fil_list = filter["NAME_3"].tolist()
            if name in fil_list:
                fil_list.remove(name)

            return JsonResponse({"taluka": fil_list})
        return JsonResponse({"country": countryList.getInfo()})
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=405)


@csrf_exempt
def get_ship_od(request):
    if request.method == "POST":
        data = json.loads(request.body).get("data", None)
        print(data)
        geo, url, start = perform_detect(data["date"], data["box"])
        return JsonResponse({"geo": geo, "url": url, "date": start})
    else:
        return HttpResponse(status=405)


@csrf_exempt
def upload_activity(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            file_obj = None
            if "add" in data and not data["add"]:
                file_obj = FilePaths.objects.create(path=data["path"])
                file_obj.save()

            act = Activity(
                member_id=memb,
                project_id=pro,
                type="upload",
                data={
                    "type": data["type"],
                    "id": data["id"],
                    "added": data["pro"],
                    "bounds": data["bounds"],
                    "file-path": file_obj.id if file_obj else None,
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act.save()
            return JsonResponse({"parent": act.id}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def draw_activity(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            print(parent)
            act = Activity(
                member_id=memb,
                project_id=pro,
                type="draw",
                data={
                    "type": data["type"],
                    "name": data["lname"],
                    "bound": data["bound"],
                    "coords": data["coords"],
                    "parent": data["parent"] if "parent" in data else None,
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act.save()
            return JsonResponse({"parent": act.id}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def remove_layer_act(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            print(parent)
            act = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "delete",
                    "parent": data["parent"] if "parent" in data else None,
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act.save()
            return JsonResponse({"parent": act.id}, status=200)
    except Exception as e:
        return JsonResponse({}, status=400)


def fetch_act(request, id, date):
    try:
        acts = Activity.objects.filter(
            member_id=id, created_at__date=datetime.strptime(date, "%Y-%m-%d")
        ).order_by("id")
        if acts:

            data = [
                {
                    "type": act.type,
                    "project": act.project_id.id if act.project_id else None,
                    "tab": act.tab,
                    "parent": act.parent_id,
                    "data": act.data,
                    "id": act.id,
                }
                for act in acts
            ]
            return JsonResponse({"act": data}, status=200)
        else:
            return JsonResponse({"act": []}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


def is_valid_url(url, timeout=2000):
    # Replace placeholders in the URL
    url = url.replace("{z}", "1").replace("{x}", "1").replace("{y}", "1")

    # Convert timeout from milliseconds to seconds
    timeout = timeout / 1000.0

    try:
        response = requests.get(url, timeout=timeout)
        return response.status_code == 200
    except requests.exceptions.Timeout:
        return True
    except Exception as error:
        print("URL validation failed:", error)
        return False


def fetch_act_view(request):
    try:
        data = json.loads(request.body).get("data", None)
        data_meta = []
        obj = None
        print(data)
        # try:
        #     obj = Selfcache.objects.get(cache_id=data["ids"][-1])
        # except:
        #     pass
        for i in data["ids"][:-1]:
            act = Activity.objects.get(id=i)
            # if obj:
            new_act = Activity(
                member_id=act.member_id,
                project_id=act.project_id,
                type="view",
                parent_id=act.id,
                tab=act.tab,
            )
            new_act.save()
            if act.type == "layer":
                if not (is_valid_url(act.data["url"])):
                    print(False)
                    url = get_sat_layer_data(act.data)
                    if url["url"]:
                        act.data["url"] = url["url"]
                        act.save()

            data_meta.append(
                {
                    "type": act.type,
                    "project": act.project_id.id if act.project_id else None,
                    "tab": act.tab,
                    "parent": act.parent_id,
                    "data": act.data,
                    "id": new_act.id,
                }
            )
        # if not obj:
        #     obj = Selfcache(cache_id=data["ids"][-1])
        #     obj.save()
        # else:
        #     obj.delete()
        print(data_meta)
        return JsonResponse({"act": data_meta}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def delete_objects(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            path = data["path"]
            if not isinstance(path, list):
                path = [path]
            for i in path:
                if os.path.exists(i):
                    os.remove(i)
            return HttpResponse(status=200)
        else:
            return HttpResponse(status=400)
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=400)


@csrf_exempt
def create_project(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            print(data)
            return create(
                data["id"], data["owner"], data["name"], data["child"], data["path"]
            )
        else:
            return HttpResponse(status=400)
    except:
        return HttpResponse(status=400)


def delete_project(request, id):
    try:
        pro = Project.objects.get(id=id)
        pro.delete()
        return HttpResponse(status=200)
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=400)


def layer_to_pro(request):
    try:
        data = json.loads(request.body).get("data", None)
        return add_layer(
            data["project"],
            data["user"],
            data["name"],
            data["id"],
            data["bounds"],
            data["type"],
            data["path"],
        )
    except:
        return HttpResponse(status=400)


@csrf_exempt
def geo_to_pro(request):
    try:
        data = json.loads(request.body).get("data", None)
        print(data)
        return add_geo_layer(
            data["id"],
            data["layer_name"],
            data["type"],
            data["name"],
        )
    except:
        return HttpResponse(status=400)


def send_metadata(request, id):
    try:
        return fetch(id)
    except:
        return JsonResponse({"error:Unexpected Error"}, status=400)


def update_project(request, id):
    try:
        data = json.loads(request.body)
        return update(id, data["update"])
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=400)


def migrate_project(request, id):
    try:
        data = json.loads(request.body).get("data", None)
        print(data)
        return migrate(id, data["acts"])
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=400)


def check_project(request, id, pro_id):
    try:
        user_obj = User.objects.get(id=id)
        user_project_ids = Project.objects.filter(member_id=id).values_list(
            "id", flat=True
        )
        org_project_ids = Project.objects.filter(
            org_id=user_obj.organization.id
        ).values_list("id", flat=True)
        if int(pro_id) in user_project_ids or int(pro_id) in org_project_ids:
            return HttpResponse(status=200)
        else:
            return HttpResponse(status=404)

    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=500)


def fetch_space(request, id):
    try:
        memb = User.objects.get(id=id)
        size = list_bucket(
            os.getenv("E2E_BUCKET_NAME"),
            f"{memb.username}-{memb.organization.name}",
            True,
        )
        return JsonResponse({"space": size[0]}, status=200)
    except:
        return JsonResponse({"error:Unexpected Error"}, status=400)


@csrf_exempt
def upload_survey(request):
    if request.method == "POST":
        data = json.loads(request.body).get("data", None)
        no, theme, loc = data["number"], data["theme"], data["loc"]
        metadata = data["data"]
        print(theme)
        if data["imageData"]:
            # Decode base64 image data
            format, imgstr = data["imageData"].split(";base64,")
            ext = format.split("/")[-1]
            current_datetime = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"{no}_image_{current_datetime}.{ext}"
            data = ContentFile(base64.b64decode(imgstr), filename)
            # Save the image to your desired location
            # Example: (Assuming you have a 'uploads' directory in your MEDIA_ROOT)
            with open("survey/" + data.name, "wb+") as destination:
                for chunk in data.chunks():
                    destination.write(chunk)

            try:
                gc = pygsheets.AUTHorize(service_file="sheet_AUTH.json")
                sh = gc.open_by_url(
                    "https://docs.google.com/spreadsheets/d/1U8KlUNgGt3AWutcwXoEXgwKvV2yIMZx9C9Ss3mX5n-w/edit#gid=0"
                )
                url = f"https://portal.vasundharaa.in/maps/survey/image/{data.name}"
                if theme == "Buildings":
                    worksheet1 = sh.worksheet("title", "Build")
                    worksheet1.append_table(
                        values=[
                            no,
                            metadata[0],
                            metadata[1],
                            metadata[2],
                            loc["lat"],
                            loc["lng"],
                            url,
                        ]
                    )
                elif theme == "Trees":
                    worksheet1 = sh.worksheet("title", "Tree")
                    worksheet1.append_table(
                        values=[
                            no,
                            metadata[0],
                            metadata[1],
                            metadata[2],
                            loc["lat"],
                            loc["lng"],
                            url,
                        ]
                    )
            except Exception as e:
                traceback.print_exc()

            return JsonResponse({"success": True})
        else:
            return JsonResponse({"success": False, "error": "No image file found"})

    else:
        return JsonResponse({"success": False, "error": "Invalid request method"})


@csrf_exempt
def forest_fire(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            print('data for forest fire', data)
            if "box" in data:
                box = ee.Geometry.Polygon(json.loads(data["box"][0]))
            else:
                gdf = gpd.read_file(TALUKA)
                filter = gdf[gdf["NAME_2"] == data["tal"][0]]
                filter = filter[filter["NAME_3"] == data["tal"][1]]
                bounds = filter.total_bounds  # [minx, miny, maxx, maxy]
                minx, miny, maxx, maxy = bounds
                bounding_box = {
                    "_southWest": {"lat": miny, "lng": minx},
                    "_northEast": {"lat": maxy, "lng": maxx},
                }
                top_left = [
                    bounding_box["_northEast"]["lng"],
                    bounding_box["_southWest"]["lat"],
                ]
                top_right = [
                    bounding_box["_northEast"]["lng"],
                    bounding_box["_northEast"]["lat"],
                ]
                bottom_right = [
                    bounding_box["_southWest"]["lng"],
                    bounding_box["_northEast"]["lat"],
                ]
                bottom_left = [
                    bounding_box["_southWest"]["lng"],
                    bounding_box["_southWest"]["lat"],
                ]
                polygon_coordinates = [
                    top_left,
                    top_right,
                    bottom_right,
                    bottom_left,
                    top_left,
                ]
                bbox = [miny, minx, maxy, maxx]
                box = ee.Geometry.Polygon(polygon_coordinates)
            print('date',data["date"])
            exp_date = get_next_date(data["date"], "COPERNICUS/S2_SR_HARMONIZED", box)
            dataset_main = exp_date.select(["B12", "B8A", "B4"]).mean().clip(box)
            dataset_norm = exp_date.select(["B4", "B3", "B2"]).mean().clip(box)
            url_1 = get_url(
                dataset_main,
                {
                    "bands": ["B12", "B8A", "B4"],
                    "min": 0,
                    "max": 4000,
                },
            )
            url_2 = get_url(
                dataset_norm,
                {
                    "bands": ["B4", "B3", "B2"],
                    "min": 0,
                    "max": 4000,
                },
            )
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url_1,
                    "date": data["date"],
                    "name": "10m Satellite data (Sentinel 2)",
                    "vis": {
                        "bands": ["B12", "B8A", "B4"],
                        "box": json.loads(data["box"][0]),
                    },
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url_2,
                    "date": data["date"],
                    "name": "10m Satellite data (Sentinel 2)",
                    "vis": {
                        "bands": ["B4", "B3", "B2"],
                        "box": json.loads(data["box"][0]),
                    },
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_1.save()
            act_2.save()
            characters = string.ascii_letters + string.digits
            random_string = "".join(random.choice(characters) for _ in range(6))
            geemap.ee_export_image(
                dataset_main,
                filename=f"{random_string}_forestfire.tif",
                scale=20,
                region=box,
            )
            convert_to_8bit(f"{random_string}_forestfire.tif")
            path = get_detections(f"{random_string}_forestfire.tif")
            print('path',path)
            gdf = gpd.read_file(path)
            act = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={"type": "Forest-Fire", "format": "geo", "geo": gdf.to_json()},
                parent_id=None,
                tab=data["tab"],
            )
            act.save()
            os.remove(f"{random_string}_forestfire.tif")
            return JsonResponse(
                {
                    "geo": [gdf.to_json(), act.id],
                    "norm": [url_2, act_2.id],
                    "fire": [url_1, act_1.id],
                },
                status=200,
            )

        else:
            return JsonResponse({"error": str(e)}, status=500)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def fire_detection(start, box):
    print("llm called fire")
    # print(attributes)
    # box=attributes["box"]
    # date=attributes["start"]
    box = ee.Geometry.Rectangle(box)
    exp_date = get_next_date(start, "COPERNICUS/S2_SR_HARMONIZED", box)
    dataset_main = exp_date.select(["B12", "B8A", "B4"]).mean().clip(box)
    dataset_norm = exp_date.select(["B4", "B3", "B2"]).mean().clip(box)
    url_1 = get_url(
        dataset_main,
        {
            "bands": ["B12", "B8A", "B4"],
            "min": 0,
            "max": 4000,
        },
    )
    url_2 = get_url(
        dataset_norm,
        {
            "bands": ["B4", "B3", "B2"],
            "min": 0,
            "max": 4000,
        },
    )
    characters = string.ascii_letters + string.digits
    random_string = "".join(random.choice(characters) for _ in range(6))
    geemap.ee_export_image(
        dataset_main,
        filename=f"{random_string}_forestfire.tif",
        scale=20,
        region=box,
    )
    convert_to_8bit(f"{random_string}_forestfire.tif")
    path = get_detections(f"{random_string}_forestfire.tif")
    os.remove(f"{random_string}_forestfire.tif")
    resp = {
        "data": [
            {"data": path, "type": "geo"},
            {"type": "url", "data": url_2},
            {"type": "url", "data": url_1},
        ]
    }
    print(resp)
    return resp


def get_geo(data):
    vec_geo = []
    get_info = data.getInfo()
    a = len(get_info["features"])
    print(a)
    for i in range(a):
        feat = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": get_info["features"][i]["geometry"]["coordinates"],
            },
        }
        vec_geo.append(feat)
    return vec_geo


@csrf_exempt
def water_change(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            if "box" in data:
                box = ee.Geometry.Polygon(json.loads(data["box"][0]))
            one_date = get_next_date(data["Sdate"], "COPERNICUS/S2_SR_HARMONIZED", box)
            two_date = get_next_date(
                data["Edate"], "COPERNICUS/S2_SR_HARMONIZED", box, true, data["Sdate"]
            )
            dataset_first = one_date.mean().clip(box)
            dataset_second = two_date.mean().clip(box)

            nir = dataset_first.select("B8")
            green = dataset_first.select("B3")
            ndwi = green.subtract(nir).divide(green.add(nir))
            url_1 = get_url(
                ndwi,
                {
                    "min": -1,
                    "max": 1,
                    "palette": [
                        "#00441b",
                        "#EBF3E9",
                        "#5E5AF2",
                    ],
                },
            )
            waterbodies = ndwi.gt(0.0)
            waterbodies = waterbodies.eq(1).selfMask()
            vectors_0 = waterbodies.reduceToVectors(
                **{
                    "geometry": box,
                    "crs": waterbodies.projection(),
                    "scale": 30,
                    "geometryType": "polygon",
                    "eightConnected": True,
                    "maxPixels": 1e17,
                }
            )

            vec0_geo = {"type": "FeatureCollection", "features": get_geo(vectors_0)}
            print("vec0")

            nir = dataset_second.select("B8")
            green = dataset_second.select("B3")
            ndwi = green.subtract(nir).divide(green.add(nir))
            url_2 = get_url(
                ndwi,
                {
                    "min": -1,
                    "max": 1,
                    "palette": [
                        "#00441b",
                        "#EBF3E9",
                        "#5E5AF2",
                    ],
                },
            )
            waterbodies = ndwi.gt(0.0)
            waterbodies = waterbodies.eq(1).selfMask()
            vectors_1 = waterbodies.reduceToVectors(
                **{
                    "geometry": box,
                    "crs": waterbodies.projection(),
                    "scale": 30,
                    "geometryType": "polygon",
                    "eightConnected": True,
                    "maxPixels": 1e17,
                }
            )

            vec1_geo = {"type": "FeatureCollection", "features": get_geo(vectors_1)}
            print("vec1")
            a_b = None
            b_a = None
            try:

                def geojson_to_shapely(geojson):
                    return [
                        shape(feature["geometry"]) for feature in geojson["features"]
                    ]

                def shapely_to_geojson(shapely_geoms):
                    return {
                        "type": "FeatureCollection",
                        "features": [
                            {"type": "Feature", "geometry": mapping(geom)}
                            for geom in shapely_geoms
                        ],
                    }

                def get_unique_geometries(geoms1, geoms2):
                    union1 = unary_union(geoms1)
                    union2 = unary_union(geoms2)

                    positive_change = union2.difference(union1)
                    negative_change = union1.difference(union2)

                    return positive_change, negative_change

                geoms1 = geojson_to_shapely(vec0_geo)
                geoms2 = geojson_to_shapely(vec1_geo)
                positive_change, negative_change = get_unique_geometries(geoms1, geoms2)
                positive_change_geojson = shapely_to_geojson([positive_change])
                negative_change_geojson = shapely_to_geojson([negative_change])
            except Exception as e:
                traceback.print_exc()
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url_1,
                    "date": data["Sdate"],
                    "name": "10m Satellite data (Sentinel 2)",
                    "vis": {"indices": ["B8", "B3"], "box": json.loads(data["box"][0])},
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url_2,
                    "date": data["Edate"],
                    "name": "10m Satellite data (Sentinel 2)",
                    "vis": {"indices": ["B8", "B3"], "box": json.loads(data["box"][0])},
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_vec_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={"type": "vector", "format": "geo", "geo": vec0_geo},
                parent_id=None,
                tab=data["tab"],
            )
            act_vec_1.save()
            act_vec_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={"type": "vector", "format": "geo", "geo": vec1_geo},
                parent_id=None,
                tab=data["tab"],
            )
            act_vec_2.save()
            act_change_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={
                    "type": "vector",
                    "format": "geo",
                    "geo": positive_change_geojson,
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_change_1.save()
            act_change_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={
                    "type": "vector",
                    "format": "geo",
                    "geo": negative_change_geojson,
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_change_2.save()
            act_1.save()
            act_2.save()
            return JsonResponse(
                {
                    "url_1": [url_1, act_1.id],
                    "url_2": [url_2, act_2.id],
                    "geo_1": [vec0_geo, act_vec_1.id],
                    "geo_2": [vec1_geo, act_vec_2.id],
                    "change_1": [positive_change_geojson, act_change_1.id],
                    "change_2": [negative_change_geojson, act_change_2.id],
                },
                status=200,
            )

        else:
            return JsonResponse({"error": str(e)}, status=500)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def ndvi_change(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            if "box" in data:
                box = ee.Geometry.Polygon(json.loads(data["box"][0]))
            else:
                gdf = gpd.read_file(TALUKA)
                filter = gdf[gdf["NAME_2"] == data["tal"][0]]
                filter = filter[filter["NAME_3"] == data["tal"][1]]
                bounds = filter.total_bounds  # [minx, miny, maxx, maxy]
                minx, miny, maxx, maxy = bounds
                bounding_box = {
                    "_southWest": {"lat": miny, "lng": minx},
                    "_northEast": {"lat": maxy, "lng": maxx},
                }
                top_left = [
                    bounding_box["_northEast"]["lng"],
                    bounding_box["_southWest"]["lat"],
                ]
                top_right = [
                    bounding_box["_northEast"]["lng"],
                    bounding_box["_northEast"]["lat"],
                ]
                bottom_right = [
                    bounding_box["_southWest"]["lng"],
                    bounding_box["_northEast"]["lat"],
                ]
                bottom_left = [
                    bounding_box["_southWest"]["lng"],
                    bounding_box["_southWest"]["lat"],
                ]
                polygon_coordinates = [
                    top_left,
                    top_right,
                    bottom_right,
                    bottom_left,
                    top_left,
                ]
                bbox = [miny, minx, maxy, maxx]
                box = ee.Geometry.Polygon(polygon_coordinates)
            one_date = get_next_date(data["Sdate"], "COPERNICUS/S2_SR_HARMONIZED", box)
            two_date = get_next_date(
                data["Edate"], "COPERNICUS/S2_SR_HARMONIZED", box, true, data["Sdate"]
            )

            dataset_first = one_date.mean().normalizedDifference(["B8", "B4"]).clip(box)
            dataset_second = (
                two_date.mean().normalizedDifference(["B8", "B4"]).clip(box)
            )
            url_1 = get_url(
                dataset_first,
                {"min": -1, "max": 1, "palette": ["#5E5AF2", "#EBF3E9", "#00441b"]},
            )
            url_2 = get_url(
                dataset_second,
                {"min": -1, "max": 1, "palette": ["#5E5AF2", "#EBF3E9", "#00441b"]},
            )
            print(url_1, url_2)
            dataset_first = dataset_first.gt(0.34)
            dataset_second = dataset_second.gt(0.34)
            vec0 = dataset_first.eq(1).selfMask()
            vectors_0 = vec0.reduceToVectors(
                **{
                    "geometry": box,
                    "crs": vec0.projection(),
                    "scale": 30,
                    "geometryType": "polygon",
                    "eightConnected": True,
                    "maxPixels": 1e17,
                }
            )

            vec0_geo = {"type": "FeatureCollection", "features": get_geo(vectors_0)}
            print("vec0")
            vec1 = dataset_second.eq(1).selfMask()
            vectors_1 = vec1.reduceToVectors(
                **{
                    "geometry": box,
                    "crs": vec0.projection(),
                    "scale": 30,
                    "geometryType": "polygon",
                    "eightConnected": True,
                    "maxPixels": 1e17,
                }
            )

            vec1_geo = {"type": "FeatureCollection", "features": get_geo(vectors_1)}
            print("vec1")
            a_b = None
            b_a = None
            try:

                def geojson_to_shapely(geojson):
                    return [
                        shape(feature["geometry"]) for feature in geojson["features"]
                    ]

                def shapely_to_geojson(shapely_geoms):
                    return {
                        "type": "FeatureCollection",
                        "features": [
                            {"type": "Feature", "geometry": mapping(geom)}
                            for geom in shapely_geoms
                        ],
                    }

                def get_unique_geometries(geoms1, geoms2):
                    union1 = unary_union(geoms1)
                    union2 = unary_union(geoms2)

                    positive_change = union2.difference(union1)
                    negative_change = union1.difference(union2)

                    return positive_change, negative_change

                geoms1 = geojson_to_shapely(vec0_geo)
                geoms2 = geojson_to_shapely(vec1_geo)
                positive_change, negative_change = get_unique_geometries(geoms1, geoms2)
                positive_change_geojson = shapely_to_geojson([positive_change])
                negative_change_geojson = shapely_to_geojson([negative_change])
            except Exception as e:
                traceback.print_exc()
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url_1,
                    "date": data["Sdate"],
                    "name": "10m Satellite data (Sentinel 2)",
                    "vis": {"indices": ["B8", "B4"], "box": json.loads(data["box"][0])},
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url_2,
                    "date": data["Edate"],
                    "name": "10m Satellite data (Sentinel 2)",
                    "vis": {"indices": ["B8", "B4"], "box": json.loads(data["box"][0])},
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_vec_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={"type": "vector", "format": "geo", "geo": vec0_geo},
                parent_id=None,
                tab=data["tab"],
            )
            act_vec_1.save()
            act_vec_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={"type": "vector", "format": "geo", "geo": vec1_geo},
                parent_id=None,
                tab=data["tab"],
            )
            act_vec_2.save()
            act_change_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={
                    "type": "vector",
                    "format": "geo",
                    "geo": positive_change_geojson,
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_change_1.save()
            act_change_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="analysis",
                data={
                    "type": "vector",
                    "format": "geo",
                    "geo": negative_change_geojson,
                },
                parent_id=None,
                tab=data["tab"],
            )
            act_change_2.save()
            act_1.save()
            act_2.save()
            return JsonResponse(
                {
                    "url_1": [url_1, act_1.id],
                    "url_2": [url_2, act_2.id],
                    "geo_1": [vec0_geo, act_vec_1.id],
                    "geo_2": [vec1_geo, act_vec_2.id],
                    "change_1": [positive_change_geojson, act_change_1.id],
                    "change_2": [negative_change_geojson, act_change_2.id],
                },
                status=200,
            )

        else:
            return JsonResponse({"error": str(e)}, status=500)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def contrast_stretch(
    band,
):
    low, high = np.percentile(band, (2, 98))
    stretched = np.interp(band, (low, high), (0, 255))
    return stretched.astype(np.uint8)


def convert_to_8bit(
    input_file,
    valid_nodata=0,
):
    temp_dir = tempfile.mkdtemp()
    temp_output = os.path.join(temp_dir, "temp_output.tif")

    try:
        with rasterio.open(input_file) as src:
            nodata = src.nodata if src.nodata is not None else valid_nodata
            profile = src.profile.copy()
            profile.update(dtype=rasterio.uint8, count=src.count, nodata=valid_nodata)

            with rasterio.open(temp_output, "w", **profile) as dst:
                for i in range(1, src.count + 1):
                    band = src.read(i, masked=True)
                    band.data[band.mask] = valid_nodata
                    stretched_band = contrast_stretch(band)
                    dst.write(stretched_band, i)
        shutil.move(temp_output, input_file)

    except Exception as e:
        traceback.print_exc()
        traceback.print_exc()

    finally:
        shutil.rmtree(temp_dir)


def get_bands(request, key):
    try:
        image_meta = CACHE[key]
        image = image_meta["data"]
        # if "bands" in image_meta["vis"]:
        #     image = image.select(image_meta["vis"]["bands"])
        return JsonResponse({"bands": image.bandNames().getInfo()}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


def get_bands_add(request):
    try:
        add = request.GET.get("add")
        try:
            image = ee.ImageCollection(add).mean()
        except:
            image = ee.Image(add)
            print("image 1", image)
        # if "bands" in image_meta["vis"]:
        #     image = image.select(image_meta["vis"]["bands"])

        band_names = image.bandNames().getInfo()
        # print("band_names", image.bandNames().getInfo())
        descriptions = [BANDS_DESCRIPTION.get(band, band) for band in band_names]
        # print("image 2", descriptions)

        # return JsonResponse({"bands": image.bandNames().getInfo()}, status=200)
        return JsonResponse({"bands_description": BANDS_DESCRIPTION }, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def get_pixel_value(request):
    try:

        data = json.loads(request.body).get("data", None)
        image_meta = CACHE[data["key"]]
        image = image_meta["data"]
        if "bands" in image_meta["vis"]:
            image = image.select(image_meta["vis"]["bands"])
        point = ee.Geometry.Point(data["coords"]["lng"], data["coords"]["lat"])
        values = image.reduceRegion(ee.Reducer.first(), point, 10)
        return JsonResponse(values.getInfo(), status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def filter_pixel(request):
    try:

        data = json.loads(request.body).get("data", None)
        print(data)
        image_meta = CACHE[data["key"]]
        image = image_meta["data"]
        add = None
        try:
            add = image_meta["add"]
        except:
            pass
        if not add:
            add = "COPERNICUS"
        if "bands" in data:
            image = image.select(data["bands"])
        box = None
        if "box" in data:
            box = ee.Geometry.Polygon(json.loads(data["box"][0]))
            image = image.clip(box)
        if "clip" in data:
            box = get_clip_geo(data["clip"][0], data["clip"][1])
            image = image.clipToCollection(box)
        if "layer" in data:
            work = "useruploads" if "upload" in data["layer"] else "VGT"
            url_get_layer = f'https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{data["layer"]}'
            headers = {"accept": "application/json", "content-type": "application/json"}
            response = requests.get(url_get_layer, headers=headers, AUTH=AUTH)
            if response.status_code == 200:
                ge = json.loads(response.content)
                ge = ge["featureType"]["latLonBoundingBox"]
                box = ee.Geometry.Rectangle(
                    [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                )
                image = image.clip(box)
        image_clone = image
        for i in range(len(data["query"])):
            p = data["query"][i]
            match p:
                case "<":
                    image = image.lt(float(data["query"][i + 1]))
                    i += 1
                case ">":
                    image = image.gt(float(data["query"][i + 1]))
                    i += 1
                case "<=":
                    image = image.gte(float(data["query"][i + 1]))
                    i += 1
                case ">=":
                    image = image.lte(float(data["query"][i + 1]))
                    i += 1
                case "=":
                    image = image.eq(float(data["query"][i + 1]))
                    i += 1
                case _:
                    continue
        image_clone = image_clone.updateMask(image)
        #     print(image_clone.getInfo())
        if "Area" in data and data["Area"]:
            # if not box:
            #     extent=ee.List(image.geometry().bounds().coordinates().get(0))
            #     box=ee.Geometry.Polygon(extent)
            if "COPERNICUS" in add:
                scale = 10
            if "LANDSAT" in add:
                scale = 30
            pixel_count_1 = image_clone.eq(1).reduceRegion(
                reducer=ee.Reducer.count(), geometry=box, scale=scale, maxPixels=1e17
            )
            count = pixel_count_1.getInfo()[data["bands"]] * (scale**2)
            print("count", pixel_count_1.getInfo()[data["bands"]], count)

        url = get_url(image_clone, {"palette": [data["color-1"]]})
        act_ras = None
        if ("project" and "parent") in data:
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            act_parent = Activity.objects.get(id=data["parent"])
            vis = act_parent.data["vis"]
            vis["filter_band"] = data["bands"]
            vis["query"] = data["query"]
            vis["1"] = data["color-1"]
            if "box" in data:
                vis["filterBox"] = json.loads(data["box"][0])
            if "clip" in data:
                vis["filterClip"] = data["clip"]
            if "layer" in data:
                vis["filterLayer"] = data["layer"]
            act_ras = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "filter",
                    "url": url,
                    "parent": act_parent.id,
                    "date": act_parent.data["date"],
                    "name": act_parent.data["name"],
                    "vis": vis,
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_ras.save()
        cache_key = url.split("/")[7]
        print(cache_key)
        CACHE.set(
            cache_key,
            {"data": image, "vis": {"bands": [data["bands"]]}},
            expire=3600,
        )
        resp = {}
        resp["url"] = url
        resp["ras_id"] = act_ras.id if act_ras else None
        if "Area" in data and data["Area"]:
            resp["area"] = count / (10**6)
            # if(act_0):
            #     resp["vec0"]=[vec0_geo,act_0.id]
            # if(act_1):
            #     resp["vec1"]=[vec1_geo,act_1.id]
        return JsonResponse(resp, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def calc_pixel(request):
    try:

        data = json.loads(request.body).get("data", None)
        print(data)
        image, act_dict = process_query(data["query"], data["key-dict"])
        box = None
        if "box" in data:
            box = ee.Geometry.Polygon(json.loads(data["box"][0]))
            image = image.clip(box)
        if "clip" in data: 
            box = get_clip_geo(data["clip"][0], data["clip"][1])
            image = image.clipToCollection(box)
        if "layer" in data:
            work = "useruploads" if "upload" in data["layer"] else "VGT"
            url_get_layer = f'https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{data["layer"]}'
            headers = {"accept": "application/json", "content-type": "application/json"}
            response = requests.get(url_get_layer, headers=headers, AUTH=AUTH)
            if response.status_code == 200:
                ge = json.loads(response.content)
                ge = ge["featureType"]["latLonBoundingBox"]
                box = ee.Geometry.Rectangle(
                    [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                )
                image = image.clip(box)
        url = get_url(image, {})
        act_ras = None
        if ("project") in data:
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            vis = {}
            vis["query"] = data["query"]
            vis["act_dict"] = act_dict
            if "box" in data:
                vis["filterBox"] = json.loads(data["box"][0])
            if "clip" in data:
                vis["filterClip"] = data["clip"]
            if "layer" in data:
                vis["filterLayer"] = data["layer"]
            act_ras = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "name": "calc",
                    "date": [],
                    "type": "calc",
                    "url": url,
                    "vis": vis,
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_ras.save()
        cache_key = url.split("/")[7]
        CACHE.set(
            cache_key,
            {"data": image, "vis": {}},
            expire=3600,
        )
        resp = {}
        resp["url"] = url
        resp["ras_id"] = act_ras.id if act_ras else None
        return JsonResponse(resp, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def get_thres_change(request):
    try:
        data = json.loads(request.body).get("data", None)
        print(data)
        masks = thres_change(data["box"], data["dates"][0], data["dates"][1])
        if ("project") in data:
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            act_ras = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": masks[0],
                    "parent": parent,
                    "date": data["dates"],
                    "name": "Change Detection",
                    "vis": {"box": data["box"]},
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_ras.save()
            act_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": masks[1],
                    "parent": parent,
                    "date": data["dates"],
                    "name": "Change Detection-1",
                    "vis": {
                        "bands": ["B4", "B3", "B2"],
                        "box": data["box"],
                        "max": 0.4,
                        "min": 0.09,
                    },
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_1.save()
            act_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": masks[2],
                    "parent": parent,
                    "date": data["dates"],
                    "name": "Change Detection-2",
                    "vis": {
                        "bands": ["B4", "B3", "B2"],
                        "box": data["box"],
                        "max": 0.4,
                        "min": 0.07,
                    },
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_2.save()
        return JsonResponse(
            {
                "change": [masks[0], act_ras.id],
                "earl": [masks[1], act_1.id],
                "later": [masks[2], act_2.id],
                "virs1": masks[3],
                "virs2": masks[4],
            },
            status=200,
        )
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def get_lulc(request):
    try:
        data = json.loads(request.body).get("data", None)
        print(data)
        url1, url2, url3, area = lulc(data)
        if ("project") in data:
            pro = (
                Project.objects.get(id=data["project"])
                if data["project"] != "global"
                else None
            )
            memb = User.objects.get(id=data["memb"])
            act_old = (
                Activity.objects.filter(member_id=memb, project_id=pro)
                .order_by("-id")
                .first()
            )
            parent = None
            if act_old:
                if act_old.tab == data["tab"]:
                    parent = act_old.id
            vis = {}
            act_ras = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "analysis",
                    "url": url1,
                    "parent": parent,
                    "date": data["dates"],
                    "name": "LULC",
                    "vis": {
                        "palette": [
                            "419bdf",
                            "397d49",
                            "88b053",
                            "7a87c6",
                            "e49635",
                            "dfc35a",
                            "c4281b",
                            "a59b8f",
                            "b39fe1",
                        ],
                        "bands": ["label"],
                        "min": 0,
                        "max": 8,
                        "clip": data["clip"] if "clip" in data else None,
                        "box": data["box"] if "box" in data else None,
                        "layer": data["layer"] if "layer" in data else None,
                        "layer_name": (
                            data["layer_name"] if "layer_name" in data else None
                        ),
                    },
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_ras.save()
            act_1 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url2,
                    "parent": parent,
                    "date": data["dates"],
                    "name": "LULC - TCC",
                    "vis": {
                        "bands": ["B4", "B3", "B2"],
                        "max": 4000,
                        "min": 0,
                        "clip": data["clip"] if "clip" in data else None,
                        "box": data["box"] if "box" in data else None,
                        "layer": data["layer"] if "layer" in data else None,
                        "layer_name": (
                            data["layer_name"] if "layer_name" in data else None
                        ),
                    },
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_1.save()
            act_2 = Activity(
                member_id=memb,
                project_id=pro,
                type="layer",
                data={
                    "type": "create",
                    "url": url3,
                    "parent": parent,
                    "date": data["dates"],
                    "name": "LULC - FCC",
                    "vis": {
                        "bands": ["B8", "B4", "B3"],
                        "clip": data["clip"] if "clip" in data else None,
                        "box": data["box"] if "box" in data else None,
                        "layer": data["layer"] if "layer" in data else None,
                        "layer_name": (
                            data["layer_name"] if "layer_name" in data else None
                        ),
                        "max": 4000,
                        "min": 0,
                    },
                },
                parent_id=parent,
                tab=data["tab"],
            )
            act_2.save()

        return JsonResponse(
            {
                "lulc": [url1, act_ras.id],
                "sat_1": [url2, act_1.id],
                "sat_2": [url3, act_2.id],
                "area": area,
            },
            status=200,
        )
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


def all_tables(request, table, column, table2):
    try:
        values = None

        if column != "0" and table != "0":
            df_1 = get_dataframe_from_table(table)
            if table2 != "0":
                df_2 = get_dataframe_from_table(table2)

                geom = classify_geometry(get_first_row_lat_long(table2))
                if geom == Polygon:
                    _, df = filter_polygon_with_polygon(df_2, df_1)
                elif geom == LineString:
                    _, df = filter_linestring_with_polygon(df_2, df_1)
                elif geom == Point:
                    _, df = filter_point_with_polygon(df_2, df_1)
            else:
                df = df_1
            values = get_unique_values_from_dataframe(df, column)
        elif table != "0":
            values = get_unique_columns(table2 if table2 != "0" else table)
        else:
            values = get_table_names_sqlalchemy_reflection()

        return JsonResponse({"values": values}, status=200)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


def table_type(request, table):
    try:
        values = None
        if table:
            coords = get_first_row_lat_long(table)

            return JsonResponse({"type": classify_geometry(coords, true)}, status=200)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def BuildBuffer(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            print(data)
            build_df = get_dataframe_from_table("pune_building_with_fsi")
            match data["geom"]:
                case "polygon":
                    geom = Polygon
                case "linestring":
                    geom = LineString
            if "table" in data:
                table_df, _ = filter_rows_by_unique_values(
                    data["table"], data["column"], [data["unique"]]
                )
                coords = table_df["latitude_longitude_geometry"].tolist()
                coords = convert_str_to_list(coords)
                list_buffer = create_buffer(geom, coords, data["buffer"])
                buffer_geojson = gpd.GeoDataFrame(
                    geometry=list_buffer, crs="EPSG:4326"
                ).to_json()
                count1, count2, out, build = check_build_inside_buffer(
                    build_df, list_buffer
                )
                return JsonResponse(
                    {
                        "total": count1,
                        "buffer": count2,
                        "buffer": json.loads(buffer_geojson),
                        "build": json.loads(build),
                    },
                    status=200,
                )
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


@csrf_exempt
def BuildResult(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body).get("data", None)
            print(data)
            if "table" in data:
                table_df, _ = filter_rows_by_unique_values(
                    data["table"], data["column"], [data["unique"]]
                )
                coords = table_df["latitutde_longitude_geometry"].tolist()
                coords = convert_str_to_list(coords)
                geometries = [Polygon(coord) for coord in coords]
                gdf = gpd.GeoDataFrame(geometry=geometries, crs="EPSG:4326")
                geojson = gdf.to_json()
                return JsonResponse({"geo": json.loads(geojson)})
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


def sendSld(request, id):
    try:
        user_obj = User.objects.get(id=id)
        if user_obj:
            return JsonResponse({"sld": user_obj.sld}, status=200)
        else:
            return JsonResponse({}, status=400)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=400)


def applySLD(request, id, layer, style):
    try:
        sld_name = None
        if not style == "default":
            sld_name = f"useruploads:{style}"
        else:
            sld_name = "raster"
        print(sld_name)
        if sld_name:
            if apply_sld(layer, sld_name):
                return HttpResponse(status=200)
            else:
                return HttpResponse(status=400)

    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=400)


@csrf_exempt
def add_feature(request, id):
    """
    Adds or updates a feature in the database based on the provided request data.

    If 'editMode' is False, a new feature is created. If 'editMode' is True, the
    existing feature with the given id is updated. In case of a new feature, if the
    id provided is not "0", it is added as a sub-feature of the main feature.

    Args:
        request: The HTTP request object containing the feature data in JSON format.
        id (str): The ID of the feature to add or update. If "0", a new feature is added.

    Returns:
        HttpResponse: An HTTP response with status 200 if the operation is successful,
                      or status 400 if an error occurs.
    """
    try:
        # Parse the incoming JSON request body and extract the 'data' field
        data = json.loads(request.body).get("data", None)
        print(data)

        # If 'editMode' is False, create a new feature
        if not data["editMode"]:
            feature_obj = Feature.objects.create(
                name=data["name"],
                comp_type=data["compType"],
                comp=data["comp"],
                type=data["type"],
                url=data["url"],
                url_params=data["urlParams"],
                address=data["address"],
                visuals=data["visuals"],
                params=(
                    eval(data["params"].replace('""', '"'))
                    if data["params"] != ""
                    else {}
                ),
                sub_bool=data["sub_bool"],
                credit=data["credit"] if data["credit"] != "" else 0,
                render=id == "0",
                plan=data["selectedPlans"],
                info=data["info"],
            )

        # If 'editMode' is True, update the existing feature
        else:
            feature_obj = Feature.objects.get(id=id)
            feature_obj.name = data["name"]
            feature_obj.comp_type = data["compType"]
            feature_obj.comp = data["comp"]
            feature_obj.type = data["type"]
            feature_obj.url = data["url"]
            feature_obj.url_params = data["urlParams"]
            feature_obj.address = data["address"]
            feature_obj.visuals = data["visuals"]
            feature_obj.params = (
                eval(data["params"].replace('""', '"')) if data["params"] != "" else {}
            )
            feature_obj.sub_bool = data["sub_bool"]
            feature_obj.credit = data["credit"] if data["credit"] != "" else 0
            feature_obj.plan = data["selectedPlans"]
            feature_obj.info = data["info"]

        # Save the feature object to the database
        feature_obj.save()

        # If it's a new sub-feature (id != "0" and not in editMode)
        if id != "0" and not data["editMode"]:
            main_feature = Feature.objects.get(id=id)
            if main_feature.sub:
                main_feature.sub.append(feature_obj.id)
            else:
                main_feature.sub = [feature_obj.id]
            main_feature.save()

        # Return 200 OK if the operation is successful
        return HttpResponse(status=200)

    except Exception as e:
        # Print the stack trace to console for debugging
        traceback.print_exc()
        # Return 400 Bad Request status if an error occurs
        return HttpResponse(status=400)


def get_features(request, id):
    """
    Retrieve feature details based on the provided id. If the id is "0", all features with render=True are returned.
    Otherwise, the function retrieves a specific feature and its associated sub-features.

    Args:
        request: The HTTP request object.
        id (str): The ID of the feature to retrieve. If the id is "0", all renderable features are fetched.

    Returns:
        JsonResponse: A JSON response containing the list of features or an error message.
    """
    # initialising objects list
    objs = []
    try:
        # Fetch all features where render is True if id is "0", ordered by their id
        if id == "0":
            objs = Feature.objects.all().filter(render=True).order_by("id")
        else:
            # Fetch the main feature by id
            main_feature = Feature.objects.get(id=id)
            # Retrieve sub-features related to the main feature if sub-features are available
            if main_feature.sub:
                objs = Feature.objects.filter(id__in=main_feature.sub).order_by("id")

        # Initialize an empty list to hold the feature data
        features = []

        # Iterate through the query result and construct the feature dictionary
        for obj in objs:
            features.append(
                {
                    "id": obj.id,
                    "name": obj.name,
                    "comp_type": obj.comp_type,
                    "comp": obj.comp,
                    "type": obj.type,
                    "add": obj.address,
                    "url": obj.url,
                    "url_params": obj.url_params,
                    "visuals": obj.visuals,
                    "sub": obj.sub_bool,
                    "info": obj.info,
                    "plan": obj.plan,
                }
            )

        # Return the list of features as a JSON response with a 200 OK status
        return JsonResponse({"success": True, "features": features}, status=200)

    except Exception as e:
        # Print the stack trace to console for debugging
        traceback.print_exc()
        # Return an error response with a 400 status and the error message
        return JsonResponse(
            {"success": False, "error": f"Something went wrong: {e}"}, status=400
        )


def del_feature(request, id):
    """
    Deletes a specific feature based on the provided id.

    Args:
        request: The HTTP request object.
        id (str): The ID of the feature to delete.

    Returns:
        HttpResponse: An HTTP response with status 200 if deletion is successful,
                      or status 400 if an error occurs.
    """
    try:
        # Retrieve the feature object by its id
        obj = Feature.objects.get(id=id)

        # Delete the feature object from the database
        obj.delete()

        # Return a 200 OK status if the deletion is successful
        return HttpResponse(status=200)

    except Exception as e:
        # Print the stack trace to console for debugging
        traceback.print_exc()
        # Return a 400 Bad Request status if any error occurs
        return HttpResponse(status=400)


@csrf_exempt
def get_georeferenced_image(request):
    if request.method == "POST":
        body = json.loads(request.body)
        lines = body.get("lines")
        path = body.get("path")
        print('body', body)

        # Create the GeoTIFF filename from the base name
        base_name, _ = os.path.splitext(path)
        tiff_path = f"{base_name}.tif"

        # Check if the GeoTIFF already exists, if not, create it
        if not os.path.exists(tiff_path):
            print(f"Creating GeoTIFF: {tiff_path}")
            convert_to_geotiff(path, tiff_path)

        # Open the GeoTIFF image for update
        ds = gdal.Open(tiff_path, gdal.GA_Update)

        # Collect pixel and geographic coordinates
        pixel_coords = []
        lat_coords = []
        lng_coords = []

        height = ds.RasterYSize

        for line in lines:
            lat_lng = line["latLngs"]
            pixel_coords_item = line["pixelCoords"]

            column_index = pixel_coords_item["x"]
            row_index = (
                height - pixel_coords_item["y"]
            )  # Convert to GDAL coordinate system

            pixel_coords.append([row_index, column_index])
            lat_coords.append(lat_lng["lat"])
            lng_coords.append(lat_lng["lng"])
        
        print(pixel_coords)
        print(lat_coords)
        print(lng_coords)

        # Convert to numpy arrays
        pixel_coords = np.array(pixel_coords)
        lat_coords = np.array(lat_coords)
        lng_coords = np.array(lng_coords)

        # Fit polynomial transformations
        degree = 1  # Change the degree as needed
        poly_lat = np.polyfit(pixel_coords[:, 0], lat_coords, degree)
        poly_lng = np.polyfit(pixel_coords[:, 1], lng_coords, degree)

        # Calculate new bounds
        new_bounds = calculate_new_bounds(
            poly_lat, poly_lng, ds.RasterYSize, ds.RasterXSize
        )

        # Set GeoTransform using polynomial coefficients
        pixel_lng = poly_lng[0]
        pixel_lat = poly_lat[0]
        lat = new_bounds[0]
        lng = new_bounds[3]
        geotransform = calculate_geotransform(lat, lng, pixel_lat, pixel_lng)
        ds.SetGeoTransform(geotransform)

        # Set coordinate system (optional, using WGS84)
        set_coordinate_system(ds)

        # Save new bounds as metadata
        ds.SetMetadataItem("NEW_BOUNDS", json.dumps(new_bounds))

        # Close the dataset to flush changes
        ds = None

        return JsonResponse({"new_bounds": new_bounds})
    else:
        return JsonResponse({}, status=400)


def convert_to_geotiff(input_path, output_path):
    """Convert an image to GeoTIFF."""
    ds = gdal.Open(input_path, gdal.GA_ReadOnly)
    driver = gdal.GetDriverByName("GTiff")
    driver.CreateCopy(output_path, ds)
    ds = None  # Close the dataset


def calculate_new_bounds(poly_lat, poly_lng, width, height):
    """Calculate the new bounds based on polynomial transformations."""
    min_lat = float("inf")
    max_lat = float("-inf")
    min_lng = float("inf")
    max_lng = float("-inf")

    # Calculate new bounds for each corner of the image
    for i in range(height):
        for j in [0, width - 1]:
            lat_new = np.polyval(poly_lat, j)
            lng_new = np.polyval(poly_lng, i)

            min_lat = min(min_lat, lat_new)
            max_lat = max(max_lat, lat_new)
            min_lng = min(min_lng, lng_new)
            max_lng = max(max_lng, lng_new)

    for j in range(width):
        for i in [0, height - 1]:
            lat_new = np.polyval(poly_lat, j)
            lng_new = np.polyval(poly_lng, i)

            min_lat = min(min_lat, lat_new)
            max_lat = max(max_lat, lat_new)
            min_lng = min(min_lng, lng_new)
            max_lng = max(max_lng, lng_new)

    return min_lng, min_lat, max_lng, max_lat


def calculate_geotransform(lat, lng, pixel_lat, pixel_lng):
    """Calculate GeoTransform matrix based on polynomial transformations."""
    # Polynomial coefficients: a0 + a1 * x + a2 * x^2

    # Build GeoTransform:
    # [ top-left x, pixel size in x, rotation, top-left y, rotation, pixel size in y ]
    geotransform = (
        lat,  # Top-left longitude
        pixel_lng,  # Pixel width (scale factor in x)
        0,  # Rotation (0 if north is up)
        lng,  # Top-left latitude
        0,  # Rotation (0 if north is up)
        -pixel_lat,  # Pixel height (negative to account for image coordinates)
    )
    return geotransform


def set_coordinate_system(ds):
    """Set the coordinate system of the dataset to WGS84."""
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)  # WGS84 EPSG code
    ds.SetProjection(srs.ExportToWkt())


# def compute_gcps(lines, ds):
#     """Convert latitude/longitude and pixel coordinates to GDAL GCPs."""
#     gcps = []
#     height = ds.RasterYSize
#     for line in lines:
#         lat_lng = line["latLngs"]
#         pixel_coords = line["pixelCoords"]

#         # Convert pixel y-coordinate to row index (since y=0 is at the top)
#         column_index = pixel_coords["x"]
#         row_index = height - pixel_coords["y"]

#         # Create the GCP using lat/lng and the transformed pixel coordinates
#         gcp = gdal.GCP(
#             lat_lng["lng"],  # Longitude
#             lat_lng["lat"],  # Latitude
#             0,  # Elevation (optional, use 0 if not needed)
#             column_index,  # X in pixel space
#             row_index,  # Y in pixel space (transformed)
#         )
#         gcps.append(gcp)

#         print(
#             f"Lat/Lng: ({lat_lng['lat']}, {lat_lng['lng']}) -> Row: {row_index}, Column: {column_index}"
#         )

#     return gcps


# def apply_gcps_and_get_bounds(output_fn, gcps, ds):
#     """Convert JPG/PNG to GeoTIFF, apply GCPs, and return georeferenced bounds."""
#     # Open the original image

#     if not ds:
#         raise ValueError(f"Unable to open image")

#     # Create a temporary GeoTIFF in memory or disk
#     driver = gdal.GetDriverByName("GTiff")
#     temp_fn = tempfile.NamedTemporaryFile(suffix=".tif").name
#     temp_ds = driver.CreateCopy(temp_fn, ds)

#     # Set spatial reference (EPSG:4326)
#     sr = osr.SpatialReference()
#     sr.ImportFromEPSG(4326)  # Modify EPSG if needed
#     temp_ds.SetGCPs(gcps, sr.ExportToWkt())

#     # Get the georeferenced bounds
#     ulx, xres, xskew, uly, yskew, yres = temp_ds.GetGeoTransform()
#     lrx = ulx + (ds.RasterXSize * xres)
#     lry = uly + (ds.RasterYSize * yres)

#     # Close datasets to flush changes
#     ds = None
#     temp_ds = None
#     out_ds = None

#     return ulx, uly, lrx, lry


# def get_image_bounds(ds):
#     width = ds.RasterXSize
#     height = ds.RasterYSize

#     corners = [
#         (0, 0),  # Upper-left
#         (width, 0),  # Upper-right
#         (width, height),  # Lower-right
#         (0, height),  # Lower-left
#     ]

#     transformer = gdal.Transformer(ds, None, ["METHOD=GCP_TPS"])

#     transformed_corners = [transformer.TransformPoint(0, x, y)[:2] for x, y in corners]

#     x_coords = [pt[0] for pt in transformed_corners]
#     y_coords = [pt[1] for pt in transformed_corners]

#     ulx, lrx = min(x_coords), max(x_coords)
#     uly, lry = max(y_coords), min(y_coords)

#     return ulx, uly, lrx, lry


@csrf_exempt
def download_georeferenced_image(request):
    if request.method == "POST":
        try:
            # Parse the JSON request body
            body = json.loads(request.body)
            path = body.get("path")

            # Create the GeoTIFF filename from the base name
            base_name, _ = os.path.splitext(path)
            tiff_path = f"{base_name}.tif" 

            # Open and stream the GeoTIFF as a response
            with open(tiff_path, "rb") as f:
                response = HttpResponse(f.read(), content_type="image/tiff")
                response["Content-Disposition"] = (
                    f'attachment; filename="{os.path.basename(tiff_path)}"'
                )
                return response

        except Exception as e:
            print(f"Error generating GeoTIFF: {e}")
            return JsonResponse({"error": str(e)}, status=500)

    # If not a POST request, return a 400 response
    return JsonResponse({"error": "Invalid request method."}, status=400)


#------------- this is temporary -----------------------

from .shp_file_codes import *

def get_nested_shp_file_structure(request):
    try:
        shapefile_path = "/home/service-vasundharaa/Desktop/vgt-geo-portal-web-app/map_app/Total_Builtup_May_2019_TotalConverted/Total_Builtup_May_2019_TotalConverted.shp"
        # shapefile_path = "/home/service-vasundharaa/Desktop/vgt-geo-portal-web-app/map_app/prposed_scheme_converted_crs/propsed_scheme.shp"
        return JsonResponse(data={"data": build_nested_structure(shapefile_path)}, json_dumps_params={"indent": 2})
    except Exception as e:
        traceback.print_exc()
        return {}
    

@csrf_exempt
def visualize_filtered_shp_data(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            division = data.get("division")
            jurisdiction = data.get("jurisdiction")
            prabhag = data.get("prabhag")
            village = data.get("village")

            shapefile_path = "/home/service-vasundharaa/Desktop/vgt-geo-portal-web-app/map_app/Total_Builtup_May_2019_TotalConverted/Total_Builtup_May_2019_TotalConverted.shp"
            output_geojson = "filtered_output.geojson"

            if division == "-1":
                division = None
            if jurisdiction == "-1":
                jurisdiction = None
            if prabhag == "-1":
                prabhag = None
            if village == "-1":
                village = None
                
            filtered_file = filter_and_save_geojson(
                shapefile_path,
                output_geojson,
                division=division,
                jurisdiction=jurisdiction,
                prabhag=prabhag,
                village=village,
            )

            if filtered_file:
                with open(filtered_file, "r") as geojson_file:
                    geojson_data = json.load(geojson_file)

                return JsonResponse({
                    "message": "GeoJSON file successfully filtered and saved.",
                    "file": filtered_file,
                    "geojson": geojson_data
                })
            else:
                return JsonResponse({"message": "No data matched the filter criteria."}, status=404)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data"}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)


@csrf_exempt
def save_geojson(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print(f"Received data: {data}")

            dataset_type = data.get('dataset_type', None)
            geojson_data = data.get('data', None)
            print(f"Dataset type received from frontend: {dataset_type}")

            if not dataset_type or not geojson_data:
                return JsonResponse({"error": "Missing dataset_type or data"}, status=400)

            # Define the new folder path
            folder_path = os.path.join(settings.MEDIA_ROOT, "final_Scheme_", "final_Scheme_")
            
            # Make sure the directory exists, create it if not
            os.makedirs(folder_path, exist_ok=True)

            # Define the file name based on dataset type
            file_name = f"{dataset_type}.geojson"
            file_path = os.path.join(folder_path, file_name)
            
            # Save GeoJSON to a file
            with open(file_path, "w", encoding="utf-8") as geojson_file:
                json.dump(geojson_data, geojson_file, indent=4)

            return JsonResponse({"message": f"{dataset_type} GeoJSON saved successfully", "file_path": file_path})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=400)



# test
from django.shortcuts import render, redirect, reverse
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.core.files.storage import FileSystemStorage
from django.contrib.auth.decorators import login_required

import os
import time
from datetime import datetime
from PIL import Image
from django.db.models import Max

from .consts import *
from .models import *


# def visualise_past_image(request, pk):
#     extracted_info = dict()
#     image_info = ImageInformation.objects.get(id=pk)
#     image_short_name = image_info.image_name.split(".")[0]
#     image_file_path = os.path.join(IMAGE_DATA_FOLDER, image_info.image_name)
#     image_bounds = [
#         [image_info.bottom_cord, image_info.left_cord],
#         [image_info.top_cord, image_info.right_cord],
#     ]
#     extracted_info[image_short_name] = {
#         "id": image_info.id,
#         "width": image_info.width,
#         "height": image_info.height,
#         "crs": image_info.crs,
#         "bounds": {
#             "top": image_info.top_cord,
#             "bottom": image_info.bottom_cord,
#             "left": image_info.left_cord,
#             "right": image_info.right_cord,
#         },
#     }
    # object_detection_info_image = ObjectDetectionInformation.objects.filter(
    #     image=image_info,
    #     deleted_at=None,
    # )
    # os.makedirs(TEMP_FOLDER, exist_ok=True)
    # csv_file_path = os.path.join(UPLOAD_FOLDER, image_short_name + ".csv")
    # geojson_file_path = os.path.join(UPLOAD_FOLDER, image_short_name + ".geojson")
    # if len(object_detection_info_image) != 0:
    #     # messages.error(request, f"No Detections Availabe for {image_short_name}!")
    #     # return redirect("perform_annotations")
    #     detection_infos_to_csv(
    #         object_detection_info_image, csv_file_path, DETECTION_TYPE_OD
    #     )
    # if len(object_detection_info_image) != 0:
    #     features, detected_objects_count = csv_to_geojson_od(
    #         csv_file_path,
    #         geojson_file_path,
    #         extracted_info[image_short_name]["crs"],
    #         extracted_info[image_short_name]["width"],
    #         extracted_info[image_short_name]["height"],
    #         extracted_info[image_short_name]["bounds"],
    #     )
    # request.session["input_file_bounds"] = image_bounds
    # request.session["image_id"] = image_info.id
    # # request.session["result_geojson_file_path"] = geojson_file_path
    # target_url = reverse("perform_annotations")
    # # target_url += f"?input_file_path={image_file_path}&result_geojson_file_path={geojson_file_path}"
    # extracted_info["image_file_path"] = image_file_path
    # return redirect(target_url)


from django.http import JsonResponse
import os

def visualise_past_image(request):
    images_info = []
    
    # Fetch all images stored in the database
    image_records = ImageInformation.objects.all().order_by("-id")  # Get the latest images first
    
    for image_info in image_records:
        image_short_name = image_info.image_name.split(".")[0]
        image_file_path = os.path.join(IMAGE_DATA_FOLDER, image_info.image_name)
        
        # Ensure the file exists
        if not os.path.exists(image_file_path):
            continue 
        
        images_info.append({
            "id": image_info.id,
            "name": image_info.image_name,
            "width": image_info.width,
            "height": image_info.height,
            "crs": image_info.crs,
            "bounds": {
                "top": image_info.top_cord,
                "bottom": image_info.bottom_cord,
                "left": image_info.left_cord,
                "right": image_info.right_cord,
            },
            "image_url": f"/media/all_images/{image_info.image_name}",  # Assuming media is served properly
        })

    return JsonResponse({"images": images_info})


@csrf_exempt
def perform_annotations(request):
    context = dict()
    if request.GET.get("input_file_path"):
        context["input_file_path"] = split_char.join(
            request.GET.get("input_file_path").split(split_char)[-3:]
        )
        context["input_file_bounds"] = request.session.get("input_file_bounds", None)
    if request.GET.get("result_geojson_file_path"):
        context["result_geojson_file_path"] = split_char.join(
            request.GET.get("result_geojson_file_path").split(split_char)[-3:]
        )
    context["input_file_bounds"] = request.session.get("input_file_bounds") 
    context["input_filename"] = request.session.get("input_filename") 
    context["image_id"] = request.session.get("image_id")
    context["class_options"] = LABELS_TO_ID_OD.keys()
    print('this is the context that we have:',context)
   
    return JsonResponse({"context": context}, status=200)

def get_latest_file(directory, extension="*"):
    """Returns the latest file from a directory matching the given extension."""
    files = glob.glob(os.path.join(directory, f"*.{extension}"))
    if not files:
        return None
    latest_file = max(files, key=os.path.getmtime)  
    return latest_file


@csrf_exempt
def upload_tif_image(request):
    if request.method == "POST":
        uploaded_images = request.FILES.getlist("input_image")  
        print('image list',uploaded_images)
        file_paths = [] 
        bounds_data = []

        if not uploaded_images:
            return JsonResponse({"error": "No files uploaded!"}, status=400)

        # Ensure that all folders exist
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(IMAGE_DATA_FOLDER, exist_ok=True)

        # Process each file
        for uploaded_image in uploaded_images:
            if not uploaded_image.name.lower().endswith(SUPPORTED_IMAGE_FORMATS):
                return JsonResponse({"error": "Unsupported image format!"}, status=400)

            fs = FileSystemStorage(location=UPLOAD_FOLDER)
            filename = fs.save(uploaded_image.name, uploaded_image)
            file_path = os.path.join(UPLOAD_FOLDER, filename)

            # Process the image
            with rasterio.open(file_path) as dataset:
                count = dataset.count
                data_type = dataset.dtypes[0]
                crs = str(dataset.crs)

            # Validate and perform annotations
            validate_image_georeferenced(request, crs, data_type, file_path, count, "perform_annotations")

            # Read the image and create the JPG file
            with rasterio.open(file_path) as dataset:
                width = dataset.width
                height = dataset.height
                count = dataset.count
                data_type = dataset.dtypes[0]
                crs = str(dataset.crs)
                transform = str(dataset.transform)
                bounds = dataset.bounds
                image_array = dataset.read()

            jpg_path = os.path.splitext(file_path)[0] + ".jpg"
            img = Image.fromarray(image_array.astype("uint8").transpose(1, 2, 0))
            img = check_img_res(img)
            img.convert("RGB").save(jpg_path, "JPEG")

            # Save the file to the IMAGE_DATA_FOLDER
            main_data_destination_filename = (
                "".join(uploaded_image.name.split(".")[:-1])
                + f".jpg"
            )
            destination_path = os.path.join(IMAGE_DATA_FOLDER, main_data_destination_filename)
            shutil.copy(jpg_path, destination_path)

            # Create ImageInformation for each image
            image_information = ImageInformation.objects.create(
                image_name=main_data_destination_filename,
                user=request.user,
                width=width,
                height=height,
                bands=count,
                crs=crs,
                transform_info=transform,
                left_cord=bounds.left,
                right_cord=bounds.right,
                top_cord=bounds.top,
                bottom_cord=bounds.bottom,
                purpose=DETECTION_TYPE_OD,
                is_annotated=True,
            )

            # Add processed file path to the list
            file_paths.append(destination_path)
            bounds_data.append({
                "left_cord": bounds.left,
                "right_cord": bounds.right,
                "top_cord": bounds.top,
                "bottom_cord": bounds.bottom
            })

        response_data = {
            "file_paths": file_paths, 
             "bounds": bounds_data,
            # "latest_file_path": latest_file_path,  # The latest file in IMAGE_DATA_FOLDER
        }
        print('response_data', response_data)
        return JsonResponse(response_data)
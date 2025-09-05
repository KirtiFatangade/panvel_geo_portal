import json
import ee
import traceback
import pandas as pd
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import RequestAborted
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from .create_url import get_url
from map_app.models import Selfcache, Activity, Project, User
import diskcache as dc
from .segment import process_data, detect, download, detect_llm, process_data_segment
from .maxar import maxar_list, maxar_get_dates, get_geo, get_highlight
from .sat import (
    sat_list,
    sat_geo_id,
    sat_geo_df,
    get_dates,
    get_clip_geo,
    thres_change,
    get_dates_old,
)
from .ndvi import trends
from .water_change import get_change
import requests
import os

GEE_DATASETS_DF = pd.read_csv("config_files/geeDF.csv")
GEE_DATASETS_DF_DERIVE = pd.read_csv("config_files/geeDF_derive.csv")
MEDIA_FOLDER = os.path.join("media", "earth_engine_cache")
GEOSERVER_AUTH = (os.getenv("GEO_USER"), os.getenv("GEO_PASS"))


if not os.path.exists(MEDIA_FOLDER):
    os.makedirs(MEDIA_FOLDER)
cache = dc.Cache(MEDIA_FOLDER)


def test(request):
    return JsonResponse({"mdg": "2!"})


def debug_status(request):
    return JsonResponse({"debug": settings.DEBUG})


def get_map(request):
    """
    Returns map configuration data as a JSON response.

    The map is centered at the given latitude and longitude, with a predefined zoom level.

    Args:
        request: The incoming HTTP request object.

    Returns:
        JsonResponse: A JSON response containing the map center coordinates and zoom level.
    """
    map_data = {
        "center": [27.891535, 78.078743],  # Latitude and longitude for the map center
        "zoom": 4.0,  # Initial zoom level
    }
    return JsonResponse(map_data)


@csrf_exempt
def segment_box(request):
    """
    Handles POST requests to segment an image based on provided data and returns the segmented TIFF image.

    Args:
        request (HttpRequest): The HTTP request object containing the data for segmentation.

    Returns:
        HttpResponse: The segmented TIFF image or a JSON response with an error message.
    """
    if request.method == "POST":
        try:
            # Parse JSON data from the request body
            data = json.loads(request.body)
            array_data = data.get("data", [])

            # Process the data to perform segmentation
            ret = process_data(array_data)

            # Read the segmented TIFF file and return it in the response
            with open(ret, "rb") as tif_file:
                response = HttpResponse(tif_file.read(), content_type="image/tiff")

            return response
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "error": "invalid JSON format"})
    else:
        return JsonResponse({"success": False, "error": "invalid request method"})


def get_segmentation(class_options_to_segment, box):

    try:
        print("llm called od", class_options_to_segment)
        resp = {
            "data": [
                {
                    "type": "geo",
                    "data": process_data_segment(class_options_to_segment, box),
                }
            ]
        }
        return resp
    except Exception as e:
        traceback.print_exc()
        return None


@csrf_exempt
def object_detection(request):
    """
    Handles POST requests for object detection based on provided data.

    Args:
        request (HttpRequest): The HTTP request object containing the data for detection.

    Returns:
        JsonResponse: A JSON response containing the detection results or an error message.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            array_data = data.get("data", [])

            return JsonResponse({"layer": detect(array_data)})
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "error": "Invalid JSON format"})
    else:
        return JsonResponse({"success": False, "error": "Invalid request method"})


def get_object_detection(classes, box):
    try:
        print("llm called od", classes)
        resp = {"data": [{"type": "geo", "data": detect_llm(box, classes)}]}
        return resp
    except Exception as e:
        traceback.print_exc()
        return None


def send_maxar_list(request):
    """
    Handles a request to retrieve the Maxar list.

    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response containing the Maxar list.
    """
    return JsonResponse({"maxar": maxar_list()})


@csrf_exempt
def send_maxar_dates(request):
    """
    Handles a POST request to retrieve Maxar dates based on the selected dataset.

    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response containing the pre and post dates or an error message.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body).get("data", None)

           
            if data != "Select Dataset":
                pre, post = maxar_get_dates(data)
                return JsonResponse({"pre": pre, "post": post}, status=200)

            return JsonResponse({"message": "Invalid dataset selection"}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({"message": "Invalid JSON format"}, status=400)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse(
                {"message": "An error occurred while processing the request"},
                status=500,
            )

    return JsonResponse({"message": "Invalid request method"}, status=405)


@csrf_exempt
def send_geo(request):
    """
    Handle POST requests to fetch geographical data based on the provided dataset and collection.

    Args:
        request: The HTTP request object containing data in JSON format.

    Returns:
        JsonResponse: A JSON response containing the pre and post files associated with the dataset and collection,
                      or an error message with an appropriate HTTP status code.
    """
    if request.method == "POST":
        try:
        
            data = json.loads(request.body).get("data", None)

            if data is None or "dataset" not in data or "collection" not in data:
                return JsonResponse(
                    {"message": "Missing dataset or collection"}, status=400
                )

            pre_file, post_file = get_geo(data["dataset"], data["collection"])
            return JsonResponse({"pre_file": pre_file, "post_file": post_file})

        except json.JSONDecodeError:
            return JsonResponse({"message": "Invalid JSON format"}, status=400)
        
        except KeyError as e:
            # Handle missing 'tiles' or other keys
            return JsonResponse({"message": f"Missing key: {str(e)}"}, status=500)
        
        except Exception as e:      
            traceback.print_exc()
            print(f"Error processing request: {e}")
            return JsonResponse({"message": "Internal server error"}, status=500)

    return JsonResponse({"message": "Invalid request method"}, status=405)



def get_highlights_list(request, type, dataset):
    return JsonResponse({"highlight": get_highlight(dataset, type)})


def send_sat_list(request, name):
    """
    Handle the request to retrieve satellite data related to a specific name.

    Args:
        request (HttpRequest): The incoming HTTP request object.
        name (str): The name for which satellite data is being requested.

    Returns:
        JsonResponse: A JSON response containing the satellite names,
                      whether they are images, and the start date.
    """
    
    names, is_image, start_date = sat_list(name)

    
    print(name, names, is_image, start_date)

   
    return JsonResponse(
        {"names": names, "is_image": is_image, "start_date": start_date}, status=200
    )


@csrf_exempt
def get_sat_layer(request):
    """
    Handles POST requests to retrieve satellite layer data based on the input provided.

    Expects the request body to contain JSON data with the following structure:
    - data (dict): A dictionary containing parameters necessary to fetch satellite layer information.

    Returns:
        JsonResponse: A JSON response containing the satellite layer data.
                      On success, returns status code 200 with the relevant data.
                      On failure, returns an empty JSON object with status code 400.
    """
    try:
        
        data = json.loads(request.body).get("data", None)
        print(data)

    
        return JsonResponse(get_sat_layer_data(data), status=200)

    except Exception as e:
       
        traceback.print_exc()
        
        return JsonResponse({}, status=400)


@csrf_exempt
def get_region_area(request):
    """
    Handles POST requests to calculate the area of a specified geographic region.

    Expects the request body to contain JSON data with the following fields:
    - clip (list): A list containing two elements that represent the clipping parameters.
                   The first element is used to identify the clipping region.

    Returns:
        JsonResponse: A JSON response containing the area of the clipped region in square kilometers
                      and a message indicating the result of the operation.
                      If a valid clip is found, returns status code 200.
                      If no clip is found, returns an area of 0 with an appropriate message.
    """
    try:
        # Parse the JSON body of the request and extract the "data" field
        data = json.loads(request.body).get("data", None)
        print(data)  # Print the received data for debugging

        # Check if the clip parameter is provided in the data
        clip = data["clip"] if "clip" in data else None

        if clip:
            # Retrieve the geographic object based on the clipping parameters
            geoj = get_clip_geo(clip[0], clip[1])

            # Calculate the area of the geographic object
            area = geoj.geometry().area().getInfo()  # Area in square meters
            area_sq_km = area / 1_000_000  # Convert area to square kilometers

            return JsonResponse(
                data={"area": area_sq_km, "message": "clip found!"}, status=200
            )
        else:
            # If no clip is found, return an area of 0 and a corresponding message
            return JsonResponse(data={"area": 0, "message": "no clip found!"})

    except Exception as e:
        # Print the stack trace of the exception for debugging
        traceback.print_exc()
        # Optionally, you can return an error message or status code here
        return JsonResponse({"message": "An error occurred"}, status=500)


def process_query(data, key_dict):
    print("process", data)
    image_new = None
    act_dict = {}
    i = 0
    while i < len(data):
        if isinstance(data[i], list):
            image, act_dict_ = process_query(data[i], key_dict)
            act_dict.update(act_dict_)
            if image_new is None:
                image_new = image
            if (
                0 <= i - 1 < len(data)
                and isinstance(data[i - 1], str)
                and data[i - 1] in ["+", "-", "/", "*", "log10", "logn"]
            ):
                match data[i - 1]:
                    case "+":
                        image_new = image_new.add(image)
                    case "-":
                        image_new = image_new.subtract(image)
                    case "/":
                        image_new = image_new.divide(image)
                    case "*":
                        image_new = image_new.multiply(image)
                    case "log10":
                        image_new = image_new.log10()
                    case "logn":
                        image_new = image_new.log()
        elif isinstance(data[i], str):
            if "{" in data[i] and "}" in data[i]:
                image_meta = cache[key_dict[data[i][1:-1]]]
                if "id" in image_meta:
                    act_dict[data[i][1:-1]] = image_meta["id"]
                image = image_meta["data"]
                image = image.select(data[i + 1][1:])
                if image_new is None:
                    image_new = image
                if (
                    0 <= i - 1 < len(data)
                    and isinstance(data[i - 1], str)
                    and data[i - 1] in ["+", "-", "/", "*", "log10", "logn"]
                ):
                    match data[i - 1]:
                        case "+":
                            image_new = image_new.add(image)
                        case "-":
                            image_new = image_new.subtract(image)
                        case "/":
                            image_new = image_new.divide(image)
                        case "*":
                            image_new = image_new.multiply(image)
                        case "log10":
                            image_new = image_new.log10()
                        case "logn":
                            image_new = image_new.log()
                i += 1
        i += 1
    return image_new, act_dict


def get_sat_layer_data(data):
    print(data)
    try:
        # Check if the 'type' field is present and handle accordingly

        if "act_dict" in data["vis"]:
            key_dict = {}
            for act_name, act_id in data["vis"]["act_dict"].items():
                act = Activity.objects.get(id=act_id)
                url = None
                try:
                    url = cache.get(act.data["url"].split("/")[7])
                except KeyError:
                    pass
                if not url:
                    url = get_sat_layer_data(act.data).get("url")
                else:
                    url = act.data["url"]
                if url:
                    key_dict[act_name] = url.split("/")[7]
            image, _ = process_query(data["vis"]["query"], key_dict)
            url = get_url(image, {})

            # Cache the processed image
            cache_key = url.split("/")[7]
            cache.set(cache_key, {"data": image, "vis": {}}, expire=3600)
            print(url)
            return {"url": url}

        else:
            # Handle other types of data, such as layers
            if data["name"] in GEE_DATASETS_DF["display_name"].values:
                rown = "open"
            elif data["name"] in GEE_DATASETS_DF_DERIVE["display_name"].values:
                rown = "derive"

            send_data = None

            if data["name"] not in [
                "Building Footprint Extraction",
                "Change Detection",
                "Change Detection-1",
                "Change Detection-2",
            ]:
                if "feat_id" in data:
                    send_data = sat_geo_id(
                        data["name"],
                        data["date"],
                        data["feat_id"],
                        bands=data["vis"].get("bands"),
                        indices=data["vis"].get("indices"),
                        grad=data["vis"].get("grad"),
                        clip=data["vis"].get("clip"),
                        bound=False,
                        box=data["vis"].get("box"),
                        layer=data["vis"].get("layer"),
                    )
                else:
                    send_data = sat_geo_df(
                        data["name"],
                        data["date"],
                        rown,
                        bands=data["vis"].get("bands"),
                        indices=data["vis"].get("indices"),
                        grad=data["vis"].get("grad"),
                        clip=data["vis"].get("clip"),
                        bound=False,
                        box=data["vis"].get("box"),
                        layer=data["vis"].get("layer"),
                    )

            # Handle specific case for "Building Footprint Extraction"
            if data["name"] == "Building Footprint Extraction":
                dataset = ee.FeatureCollection(
                    "GOOGLE/Research/open-buildings/v3/polygons"
                ).filterBounds(ee.Geometry.Rectangle(data["vis"]["box"]))
                dataset = dataset.style(fillColor="0000", color="red", width=1.0)
                send_data = [get_url(dataset, {})]
            if data["name"] in [
                "Change Detection",
                "Change Detection-1",
                "Change Detection-2",
            ]:
                masks = thres_change(
                    data["vis"]["box"], data["date"][0], data["date"][1]
                )
                if data["name"] == "Change Detection":
                    send_data = [masks[0]]
                if data["name"] == "Change Detection-1":
                    send_data = [masks[1]]
                if data["name"] == "Change Detection-2":
                    send_data = [masks[2]]

            image_clone = None

            if (
                send_data
                and len(send_data) >= 4
                and send_data[3]
                and "filter_band" in data["vis"]
            ):

                image = send_data[3]

                image = image.select(data["vis"]["filter_band"])

                if "filterBox" in data["vis"]:
                    box = ee.Geometry.Polygon(data["vis"]["filterBox"])
                    image = image.clip(box)

                if "filterClip" in data["vis"]:
                    box = get_clip_geo(
                        data["vis"]["filterClip"][0], data["vis"]["filterClip"][1]
                    )
                    image = image.clipToCollection(box)

                if "filterLayer" in data["vis"]:
                    work = (
                        "useruploads"
                        if "upload" in data["vis"]["filterLayer"]
                        else "VGT"
                    )
                    url_get_layer = f'https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{data["vis"]["filterLayer"]}'
                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(
                        url_get_layer, headers=headers, auth=GEOSERVER_AUTH
                    )
                    if response.status_code == 200:
                        ge = json.loads(response.content)["featureType"][
                            "latLonBoundingBox"
                        ]
                        box = ee.Geometry.Rectangle(
                            [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                        )
                        image = image.clip(box)

                # Apply query filters
                image_clone = image
                for i in range(len(data["vis"]["query"])):
                    p = data["vis"]["query"][i]
                    match p:
                        case "<":
                            image = image.lt(float(data["vis"]["query"][i + 1]))
                        case ">":
                            image = image.gt(float(data["vis"]["query"][i + 1]))
                        case "<=":
                            image = image.gte(float(data["vis"]["query"][i + 1]))
                        case ">=":
                            image = image.lte(float(data["vis"]["query"][i + 1]))
                        case "=":
                            image = image.eq(float(data["vis"]["query"][i + 1]))
                        case _:
                            continue

                image_clone = image_clone.updateMask(image)
                url_clone = get_url(image_clone, {"palette": [data["vis"]["1"]]})

            if send_data and len(send_data) >= 4 and send_data[3]:

                image_metadata = send_data[3] if not image_clone else image_clone
                image_vis = send_data[4] if not image_clone else {}
                cache_key = send_data[0].split("/")[7]
                cache.set(
                    cache_key,
                    {"data": image_metadata, "vis": image_vis, "add": send_data[5]},
                    expire=3600,
                )

            print(send_data)
            return {"url": url_clone if image_clone else send_data[0]}

    except Exception as e:
        print("this", e)
        return None


@csrf_exempt
def send_sat_geo(request, id):
    """
    Handles a POST request to retrieve satellite geospatial data based on the provided dataset and parameters.

    Args:
        request: The HTTP request object.
        id (str): The ID of the satellite feature being requested.

    Returns:
        JsonResponse: A JSON response containing the URL of the geospatial data, dataset name,
                      date, and other relevant metadata. Returns a 405 error for invalid requests.
    """
    if request.method == "POST":
        try:
            # Parse the JSON data from the request body
            data = json.loads(request.body).get("data", None)
            print('data:', data)

            # Determine the function to call based on the id value
            send_data = (
                sat_geo_id(
                    data["dataset"],
                    data["dates"],
                    id,
                    bands=data.get("bands"),
                    indices=data.get("indices"),
                    grad=data.get("grad"),
                    clip=data.get("clip"),
                    bound=data.get("bound", True),
                    box=data.get("box"),
                    layer=data.get("layer"),
                    cloud_filter=data.get("cloud_filter", None),
                )
                if id not in ["open", "derive", "weather"]
                else sat_geo_df(
                    data["dataset"],
                    data["dates"],
                    id,
                    bands=data.get("bands"),
                    indices=data.get("indices"),
                    grad=data.get("grad"),
                    clip=data.get("clip"),
                    bound=data.get("bound", True),
                    box=data.get("box"),
                    layer=data.get("layer"),
                    cloud_filter=data.get("cloud_filter", None),
                )
            )
            print('send data',send_data)

            if send_data is None:
                print(f"{id} returned None")
            else:
                print(f"send_data: {send_data}")

            # Handle project data if present in the request
            if "project" in data:
                pro = (
                    Project.objects.get(id=data["project"])
                    if data["project"] != "global"
                    else None
                )
                # Prepare visualization parameters
                vis = {
                    "bands": (
                        [
                            send_data[4]["bands"][0],
                            send_data[4]["bands"][1],
                            send_data[4]["bands"][2],
                        ]
                        if "bands" in data
                        else None
                    ),
                    "indices": data.get("indices"),
                    "grad": data.get("grad"),
                    "clip": data.get("clip"),
                    "bound": data.get("bound", True),
                    "box": data.get("box"),
                    "layer": data.get("layer"),
                    "layer_name": data.get("layer_name"),
                }

                # Get member and activity information
                memb = User.objects.get(id=data["memb"])
                act_old = (
                    Activity.objects.filter(member_id=memb, project_id=pro)
                    .order_by("-id")
                    .first()
                )

                # Determine parent activity if it exists
                parent = act_old.id if act_old and act_old.tab == data["tab"] else None
                print(parent)

                # Create a new activity record
                act = Activity(
                    member_id=memb,
                    project_id=pro,
                    type="layer",
                    data={
                        "type": "create",
                        "url": send_data[0],
                        "date": data["dates"],
                        "name": data["dataset"],
                        "vis": vis,
                        "feat_id": id,
                    },
                    parent_id=parent,
                    tab=data["tab"],
                )
                act.save()

                # if id != "open" and id != "derive" and id != "weather":
                #     obj = Feature.objects.get(id=id)
                #     credit = obj.credit
                #     memb.credits -= credit
                #     memb.save()
                #     if memb.email == memb.organization.email_address:
                #         memb.organization.credits -= credit
                #         memb.organization.save()
                #     obj = CTransaction.objects.create(
                #         memb=memb,
                #         org=memb.organization,
                #         amount=credit,
                #         type=1,
                #         feature=obj,
                #     )
                #     obj.save()

                # Cache image metadata if available
                try:
                    if send_data[3]:
                        image_metadata = send_data[3]
                        image_vis = send_data[4]
                        cache_key = send_data[0].split("/")[7]
                        cache.set(
                            cache_key,
                            {
                                "data": image_metadata,
                                "vis": image_vis,
                                "add": send_data[5],
                                "id": act.id,
                            },
                            expire=3600,
                        )
                except Exception:
                    pass

            # Return the response with relevant data
            return JsonResponse(
                {
                    "url": send_data[0],
                    "name": data["dataset"],
                    "date": send_data[1],
                    "bands": (
                        [
                            send_data[4]["bands"][0],
                            send_data[4]["bands"][1],
                            send_data[4]["bands"][2],
                        ]
                        if "bands" in data
                        else None
                    ),
                    "indices": data.get("indices"),
                    "grad": data.get("grad"),
                    "clip": data["clip"][1] if "clip" in data else None,
                    "geoj": (
                        send_data[2] if "clip" in data and "bound" in data else None
                    ),
                    "act_id": act.id if "project" in data else None,
                },
                status=200,
            )
        except Exception as e:
            # Print the exception traceback for debugging
            traceback.print_exc()
            return JsonResponse({"message": "Invalid request method"}, status=405)


@csrf_exempt
def get_sat_dates(request):
    """
    Handles POST requests to retrieve satellite image dates based on the specified parameters.

    Expects the request body to contain JSON data with the following fields:
    - month (int): The month for which to retrieve dates.
    - year (int): The year for which to retrieve dates.
    - dataset (str): The name of the dataset to use.
    - extent (str): The geographic extent for the satellite images.
    - add (str): Additional parameters or modifiers (if any).
    - cloud (str): Cloud cover parameter (if applicable).

    Returns:
        JsonResponse: A JSON response containing the retrieved dates under the "day" key.
        HttpResponse: A response with status code 499 if the request is aborted,
                      or status code 405 if an invalid request method is detected.
    """
    if request.method == "POST":  # Check if the request method is POST
        try:
            # Parse the JSON body of the request and extract the "data" field
            data = json.loads(request.body).get("data", None)
            return JsonResponse(
                {
                    "day": get_dates(  # Call the get_dates function to retrieve the dates
                        data["month"],
                        data["year"],
                        data["dataset"],
                        data["extent"],
                        data["add"],
                        data["cloud"],
                    )
                }
            )

        except RequestAborted:
            # Handle the case where the request is aborted
            return HttpResponse(status=499)
        except Exception as e:
            # Catch all other exceptions and return a 405 response for invalid request method
            return JsonResponse({"message": "Invalid request method"}, status=405)

    # If the request method is not POST, return a 405 error (this is redundant due to the previous check)
    return JsonResponse({"message": "Invalid request method"}, status=405)


@csrf_exempt
def get_sat_dates_old(request, name):
    if request.method == "POST":
        try:
            data = json.loads(request.body).get("data", None)
            return JsonResponse(
                {
                    "day": get_dates_old(
                        data["month"],
                        data["year"],
                        data["dataset"],
                        data["extent"],
                        name,
                        data["cloud"],
                    )
                }
            )

        except RequestAborted:
            return HttpResponse(status=499)
        except:
            return JsonResponse({"message": "Invalid request method"}, status=405)


@csrf_exempt
def get_water_change(request):
    """
    Handles POST requests to retrieve water change data based on specified parameters.

    Expects JSON payload with keys:
    - "start": Start date of the analysis period.
    - "end": End date of the analysis period.
    - "box": Geographic bounding box for the area to be analyzed.

    Calls the `get_change` function with these parameters and returns the result URLs in a JSON response.

    Parameters:
    - request (HttpRequest): The HTTP request object containing JSON data.

    Returns:
    - JsonResponse: A JSON response with the URLs if successful, or an error message if there was an issue.
    """
    if request.method == "POST":
        try:
            # Parse JSON data from the request body
            data = json.loads(request.body).get("data", None)
            print(data)  # Debugging line to print received data

            # Call `get_change` function with the specified start date, end date, and bounding box
            urls = get_change(data["start"], data["end"], data["box"])

            # Return the URLs as a JSON response
            return JsonResponse(urls)

        except Exception as e:
            # Print the traceback to debug any exceptions
            traceback.print_exc()

            # Return error response with 405 status if any exception occurs
            return JsonResponse({"message": f"error occured: {e}"}, status=500)
    else:
        # Return error response if request method is not POST
        return JsonResponse({"message": "Invalid request method"}, status=405)


@csrf_exempt
def Download(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body).get("data", None)
            download(data["aoi"], data["url"], data["format"])
            if data["format"] == "tif":
                with open("download.tif", "rb") as tif_file:
                    content = tif_file.read()
                response = HttpResponse(content, content_type="image/tiff")
                response["Content-Disposition"] = f'attachment; filename="download.tif"'
                return response
            else:
                with open("download.png", "rb") as png_file:
                    content = png_file.read()
                response = HttpResponse(content, content_type="image/png")
                response["Content-Disposition"] = f'attachment; filename="download.png"'

                return response

        except:
            return JsonResponse({"message": "Invalid request method"}, status=405)


@csrf_exempt
def ndvi_trends(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body).get("data", None)
            a = Selfcache(cache_id=data["key"], progress=0)
            a.save()
            print(data)
            data = trends(
                data["aoi"], data["start_date"], data["end_date"], data["key"]
            )
            a.delete()
            return JsonResponse(dict(sorted(data.items())))
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"message": "Invalid request method"}, status=405)


def ndvi_progress(request, key):
    cache_obj = Selfcache.objects.get(cache_id=key)
    return JsonResponse({"percent": cache_obj.progress})

from django.http import JsonResponse, HttpResponse
from map_app.models import User
from .tasks import *
from .models import *
# from .up42_codes import *
from .skywatch_codes import *

import json


def get_skywatch_results(request):
    """
    Handles the search request for Skywatch data based on the provided date range and geometry.

    Args:
        request (HttpRequest): The HTTP request object containing the search parameters.

    Returns:
        JsonResponse: A JSON response containing the search results, or an empty response with error status if no results are found or an exception occurs.
    """
    if request.method == "POST":
        try:
            # Parse the request body to retrieve the search parameters (dates and geometry)
            body = json.loads(request.body)

            # Extract start and end dates, and the geometry (bounding box) from the request body
            start_date = body["dates"][0]
            end_date = body["dates"][1]
            geometry = body["box"]["geometry"]

            # Perform the search using the extracted parameters
            searches, id = get_search_results(start_date, end_date, geometry)

            # Check if any search results were found
            if searches:
                # Return a JSON response with the search results, id, and date range
                return JsonResponse(
                    {
                        "results": searches,
                        "id": id,
                        "start": start_date,
                        "end": end_date,
                    },
                    status=200,
                )
            else:
                # If no results are found, return an empty response with a 200 status code
                return JsonResponse({}, status=200)
        except Exception as e:
            # Print the exception traceback for debugging purposes
            traceback.print_exc()
            # Return a generic error response with a 500 status code if an exception occurs
            return JsonResponse({}, status=500)


def place_order_skywatch(
    request,
    user_id,
):
    """
    Places an order for Skywatch data and updates the user's Skywatch information.

    Args:
        request (HttpRequest): The HTTP request object containing the order details.
        id (int): The user ID for the order placement.

    Returns:
        HttpResponse: A response indicating the success or failure of the order placement.
    """
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            start = body["dates"][0]
            end = body["dates"][1]
            geom = body["box"]["geometry"]
            prod_id = body["id"]
            prod_cost = body["cost"]
            prod_res = body["res"]
            search_id = body["search_id"]
            type = body["type"]
            order_id, status = place_order_sky(
                start,
                end,
                geom,
                prod_id,
                prod_cost,
                prod_res,
                search_id,
                type,
            )
            if user_id and order_id:
                user = User.objects.get(id=user_id)
                SkywatchOrder.objects.create(
                    user=user,
                    order_id=order_id,
                    status=status,
                )
                return HttpResponse(status=200)
            else:
                return HttpResponse(status=500)
        except Exception as e:
            traceback.print_exc()
            return HttpResponse(status=500)


def fetch_order_skywatch(
    request,
    user_id,
):
    try:
        response_orders = []
        user = User.objects.get(id=user_id)
        orders = user.skywatch_orders.all()
        for order in orders:
            if order.status != "complete":
                status = get_order_status_sky(order.order_id)
                if status:
                    order.status = status
                    order.save()
            response_orders.append(
                {
                    "id": order.order_id,
                    "status": order.status,
                    "time": order.time,
                }
            )
        return JsonResponse({"orders": response_orders}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": "An error occurred."}, status=500)


def downlaod_order_assets_skywatch(
    request,
    order_id,
):
    try:
        asset_urls = download_asset_skywatch(order_id)
        return JsonResponse({"assets": asset_urls}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": "Failed to fetch order assets."}, status=500)


def skywatch_to_cloud(
    request,
    user_id,
    order_id,
):
    try:
        user = User.objects.get(id=user_id)
        order = SkywatchOrder.objects.get(order_id=order_id)
        asset_url = download_asset_skywatch(order_id)
        if asset_url:
            name = f"skywatch_{order.time}_{order_id}.tif"
            if user.organization.name == "global":
                path = f"Paid-Datasets/{user.username}/{name}"
            else:
                path = f"Paid-Datasets/{user.organization.name}/{user.username}/{name}"
            task = move_file_to_cloud.delay(asset_url, name, path)
        return HttpResponse(status=200)
    except Exception as e:
        print(f"Error fetching assets for order {order_id}: {e}")
        return HttpResponse(status=500)


def get_up42_results(request):
    if request.method == "POST":
        body = json.loads(request.body)
        geom = body["box"]
        dates = body["dates"]
        max_cloudcover = body.get("maxCloud", 20)
        type = body.get("type", "")
        task = task_up42_get_products.delay(
            type,
            geom,
            dates,
            max_cloudcover,
        )
        return JsonResponse({"task_id": task.id}, status=200)


def get_up42_image_preview(request):
    """
    Handles HTTP POST requests to retrieve a preview image for a specified scene.

    This function processes a JSON body from a POST request, extracts the collection
    name and scene ID, and calls the `get_image` function to retrieve the preview image.
    It returns the preview image path in a JSON response or an error message if the input
    is invalid.

    Parameters:
    - request: The HTTP request object containing the POST data.

    Returns:
    - JsonResponse: A JSON response containing the preview image path or an error message.
    """
    if request.method == "POST":
        try:
            # Load the JSON body from the request
            body = json.loads(request.body)
            # Extract parameters from the request body
            name = body["name"]
            scene_id = body["sceneId"]
            # Call the function to get the preview image
            preview_path = get_image(name, scene_id)
            # Return the preview path in JSON format
            return JsonResponse({"previewPath": preview_path})

        except (KeyError, json.JSONDecodeError):
            # Return an error message with a 400 Bad Request status for invalid input
            return JsonResponse({"error": "Invalid input"}, status=500)


def get_up42_images(request):
    """
    Handles HTTP POST requests to retrieve images based on specified parameters.

    This function processes a JSON body from a POST request, extracts parameters for the
    image retrieval (collection name, geometry, date range, and maximum cloud cover),
    and calls the `get_images` function to fetch the images. It returns the images in a
    JSON response or an error message if an exception occurs.

    Parameters:
    - request: The HTTP request object containing the POST data.

    Returns:
    - JsonResponse: A JSON response containing the fetched images or an error message.
    """
    if request.method == "POST":
        try:
            # Load the JSON body from the request
            body = json.loads(request.body)
            # Extract parameters from the request body
            name = body["name"]
            geom = body["box"]
            dates = body["dates"]
            max_cloudcover = body.get("maxCloud", 20)
            # Call the function to fetch images based on the provided parameters
            images = get_images(name, geom, dates, max_cloudcover)
            # Return the images in JSON format
            return JsonResponse(images, safe=False)
        except Exception as e:
            # Log the exception traceback for debugging
            traceback.print_exc()
            # Return an empty JSON response with a 400 Bad Request status
            return JsonResponse({}, status=500)


def get_up42_estimate(request):
    """
    Handles HTTP POST requests to retrieve an estimate for an order on the UP42 platform.

    This function processes a JSON body from a POST request, extracts the product ID,
    scene ID, and geometry, and calls the `get_order_estimate` function to retrieve
    the estimated order cost. It returns the estimate in a JSON response or an error
    message if the input is invalid.

    Parameters:
    - request: The HTTP request object containing the POST data.

    Returns:
    - JsonResponse: A JSON response containing the estimated order cost or an error message.
    """
    if request.method == "POST":
        try:
            # Load the JSON body from the request
            body = json.loads(request.body)
            # Extract parameters from the request body
            product = body["productId"]
            scene_id = body["sceneId"]
            geom = body["geom"]

            # Call the function to fetch the order estimate
            estimate = get_order_estimate(product, scene_id, geom)

            # Return the estimate in JSON format
            return JsonResponse({"estimate": estimate})

        except Exception as e:
            # Log the exception traceback for debugging
            traceback.print_exc()
            # Return an error message with a 400 Bad Request status for invalid input
            return JsonResponse({"error": "Invalid input"}, status=500)


def place_order_up42(
    request,
    user_id,
):
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            product = body["productId"]
            scene_id = body["sceneId"]
            geom = body["geom"]
            order_id, status = place_order(product, scene_id, geom)
            if order_id != "Insufficient":
                user = User.objects.get(id=user_id)
                UP42Order.objects.create(
                    user=user,
                    order_id=order_id,
                    status=status,
                )
                # Return a success response
                return HttpResponse(status=200)
            else:
                # Return a response indicating insufficient credits
                return HttpResponse(status=401)

        except Exception as e:
            traceback.print_exc()
            # Return a Bad Request response for any errors
            return HttpResponse(status=500)


def fetch_orders_up42(
    request,
    user_id,
):
    """
    Fetches and updates the status of UP42 orders for a given user.

    Args:
        request (HttpRequest): The HTTP request object.
        id (int): The ID of the user whose UP42 orders are being fetched.

    Returns:
        JsonResponse: A JSON response containing the list of orders with updated statuses.
            - If successful, returns JSON data with updated orders and HTTP status 200.
            - If the user is not found, returns an error message with HTTP status 404.
            - If any other exception occurs, returns an error message with HTTP status 400.
    """
    try:
        # Retrieve the user by ID
        resonse_orders = []
        user = User.objects.get(id=user_id)
        orders = user.up42_orders.all()
        for order in orders:
            if order.status != "FULFILLED":
                status = get_order_status(order.order_id)
                if status:
                    order.status = status
                    order.save()
            resonse_orders.append(
                {
                    "id": order.order_id,
                    "status": order.status,
                    "time": order.time,
                }
            )
        # Return a JSON response with the updated orders
        return JsonResponse({"orders": resonse_orders}, status=200)

    except User.DoesNotExist:
        # Handle the case where the user is not found
        return JsonResponse({"error": "User not found."}, status=404)

    except Exception as e:
        # Log any other errors and return a general error response
        print(f"Error fetching orders: {e}")
        return JsonResponse({"error": "An error occurred."}, status=500)


def downlaod_order_assets_up42(
    request,
    order_id,
):
    """
    Fetches asset URLs for a given order ID from UP42 and returns them in a JSON response.

    Args:
        request (HttpRequest): The HTTP request object.
        order_id (str): The unique identifier for the order whose assets need to be fetched.

    Returns:
        JsonResponse: A JSON response containing the list of asset URLs if successful,
                      or an error message if there is an issue fetching the assets.
    """
    try:
        # Retrieve the asset URLs by calling the download_asset_up42 function
        asset_urls = get_download_asset_url_up42(order_id)

        # Return a JSON response containing the asset URLs with a 200 status code
        return JsonResponse({"assets": asset_urls}, status=200)

    except Exception as e:
        # Print the error message to the console if there is an issue fetching the assets
        traceback.print_exc()

        # Return a JSON response indicating failure with a 400 status code
        return JsonResponse({"error": "Failed to fetch order assets."}, status=500)


def up42_to_cloud(
    request,
    user_id,
    order_id,
):
    try:
        # Retrieve the user object
        user = User.objects.get(id=user_id)
        order = UP42Order.objects.get(order_id=order_id)
        # Download assets for the given order ID
        asset_urls = get_download_asset_url_up42(order_id)
        if asset_urls:
            # Construct the filename
            name = f"up42_{order.time}_{order_id}.zip"

            # Build the cloud path based on the user's organization
            if user.organization.name == "global":
                path = f"Paid-Datasets/{user.username}/{name}"
            else:
                path = f"Paid-Datasets/{user.organization.name}/{user.username}/{name}"

            task = move_file_to_cloud.delay(asset_urls[0]["url"], name, path)

        # Return an immediate response indicating the process has started
        return HttpResponse(status=200)

    except Exception as e:
        # Print the error message to the console if there is an issue fetching the assets
        traceback.print_exc()
        return HttpResponse(status=500)


def up42_task_status(
    request,
    task_id,
):
    response = None
    task_update = task_status(task_id)
    if task_update["state"] == "SUCCESS":
        response = {"message": "success", "products": task_update["result"]}
        revoke_task(task_id)
    elif task_update["state"] == "FAILURE":
        response = {"message": "success", "products": []}
    else:
        response = {"message": "pending"}
    return JsonResponse(response, status=200, safe=False)

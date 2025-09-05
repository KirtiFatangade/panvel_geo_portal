import os
import requests
import json
import traceback
import time


API_URL = os.getenv("SKYWATCH_API_URL")
SKYWATCH_API_KEY = os.getenv("SKYWATCH_API_KEY")
HEADERS = {"Content-Type": "application/json", "x-api-key": SKYWATCH_API_KEY}


def get_search_id(
    start,
    end,
    geom,
):
    url = f"{API_URL}/archive/search"
    data = {
        "location": geom,
        "start_date": start,
        "end_date": end,
        "coverage": 0,
        "interval_length": 0,
        "resolution": ["high", "very_high"],
        "order_by": ["resolution"],
        # "off_nadir_angle": [-30, 30]
    }
    try:
        response = requests.post(
            url,
            headers=HEADERS,
            data=json.dumps(data),
        )
        if response.status_code == 200:
            response_json = response.json()
            return response_json["data"]["id"]
        else:
            return None
    except Exception as e:
        traceback.print_exc()
        return None


def get_all_records(
    url,
    total_results,
):
    page_num = 1
    final_response = []
    print(f"{total_results} total records!")
    while total_results > 0:
        new_url = url + f"?cursor={page_num}"
        response = requests.get(new_url, headers=HEADERS)
        response_dict = response.json()
        datas = response_dict["data"]

        result_list = []
        for data in datas:
            geojson = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": data["location"]["type"],
                            "coordinates": data["location"]["coordinates"],
                        },
                    }
                ],
            }
            result_dict = {
                "geom": geojson,
                "time": data["start_time"],
                "id": data["id"],
                "product": data["product_name"],
                "source": data["source"],
                "prev": data["preview_uri"],
                "thumb": data["thumbnail_uri"],
                "per": data["location_coverage_percentage"],
                "area": data["area_sq_km"],
                "cost": data["cost"],
                "res": data["resolution"],
            }
            result_list.append(result_dict)
        final_response.extend(result_list)
        print(f"Page {page_num} fetched successfully")
        page_num += 1
        total_results -= len(response_dict["data"])
    with open("result-sky.json", "w") as f:
        json.dump(final_response, f, indent=4)
    return final_response


def get_results(id):
    retries = 20
    delay = 10
    url = f"{API_URL}/archive/search/{id}/search_results"
    try:
        for attempt in range(retries):
            response = requests.get(url, headers=HEADERS)
            if response.status_code == 200:
                print("Request successful!")
                response_dict = response.json()
                if response_dict:
                    total_results = response_dict["pagination"]["total"]
                    response = get_all_records(url, total_results)
                    return response
                return None
            elif response.status_code == 202:
                print(
                    f"Search is still running. Retrying in {delay} seconds... (Attempt {attempt + 1} of {retries})"
                )
                time.sleep(delay)
            else:
                print(f"Request failed with status code {response.status_code}")
                print(response.text)
                return None

        else:
            print("Max retries reached. Search might still be running.")
            return None
    except Exception as e:
        traceback.print_exc()


def get_search_results(
    start_date,
    end_date,
    geometry,
):
    search_id = get_search_id(start_date, end_date, geometry)
    if search_id:
        return get_results(search_id), search_id
    else:
        return None, None


def place_order_sky(
    start,
    end,
    geom,
    prod_id,
    prod_cost,
    prod_res,
    search_id,
    type,
):
    url = f"{API_URL}/pipelines"
    data = {
        "name": "Specific Archive Order",
        "start_date": start,
        "end_date": end,
        "max_cost": prod_cost,
        "resolution_low": prod_res,
        "resolution_high": prod_res,
        "result_delivery": {"max_latency": "0d", "priorities": ["latest"]},
        "aoi": geom,
        "output": {"id": type, "format": "geotiff", "mosaic": "unstitched"},
        "status": "active",
        "search_id": search_id,
        "search_results": [prod_id],
    }
    try:
        response = requests.post(url, headers=HEADERS, data=json.dumps(data))
        if response.status_code == 200 or response.status_code == 201:
            response_json = response.json()
            data = response_json.get("data")
            order_id = data.get("id")
            status = data.get("status")
            print("Request successful!")
            print(f"Order ID: {order_id}, Status: {status}")
            return order_id, status
        else:
            return False, False
    except Exception as e:
        traceback.print_exc()


def get_order_status_sky(id):
    url = f"{API_URL}/pipelines/{id}"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            response_json = response.json()
            status = response_json.get("data").get("status")
            return status
        else:
            return None
    except Exception as e:
        traceback.print_exc()
        return None


def download_asset_skywatch(id):
    url = f"{API_URL}/pipelines/{id}/interval_results"
    try:
        response = requests.get(url, headers=HEADERS)
        print(response)
        if response.status_code == 200:
            response_json = response.json()
            url = None
            files = response_json.get("data")[0].get("results")[0]["raster_files"]
            for file in files:
                if file["name"] == "visual_cogtif":
                    url = file["uri"]
            return url
        else:
            return None
    except Exception as e:
        traceback.print_exc()
        return None

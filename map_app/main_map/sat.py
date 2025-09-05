import pandas as pd
import ee
import os
import traceback
from .create_url import get_url
from map_app.models import Feature, User
from datetime import datetime, timedelta
import requests
import json
import concurrent.futures
import calendar
import traceback
import geopandas as gpd
from .common_funcs import calculate_percentage

GEE_DATASETS_DF = pd.read_csv("config_files/geeDF.csv")
GEE_DATASETS_DF_DERIVE = pd.read_csv("config_files/geeDF_derive.csv")
GEE_DATASETS_DF_WEATHER = pd.read_csv("config_files/geeDF_weather.csv")

AUTH = (os.getenv("GEO_USER"), os.getenv("GEO_PASS"))
PALETTE_DICT = {
    "linear-gradient(to right, #5E5AF2, #EBF3E9, #00441b)": [
        "#5E5AF2",
        "#EBF3E9",
        "#00441b",
    ],
    "linear-gradient(to right, #FFFFFF, #4147B4, #010AB7)": [
        "#FFFFFF",
        "#4147B4",
        "#010AB7",
    ],
    "linear-gradient(to right, #E00303, #FFFFFF, #2A33E0)": [
        "#E00303",
        "#FFFFFF",
        "#2A33E0",
    ],
    "linear-gradient(to right, #661C1C, #C9CA69, #073400)": [
        "#661C1C",
        "#C9CA69",
        "#073400",
    ],
    "linear-gradient(to right, #84420E, #DDDECC, #001D80)": [
        "#84420E",
        "#DDDECC",
        "#001D80",
    ],
    "linear-gradient(to right, #C30D0D, #EEEEAF, #3C8612)": [
        "#C30D0D",
        "#EEEEAF",
        "#3C8612",
    ],
    "linear-gradient(to right, #0027A9, #EEEEAF, #D81414)": [
        "#0027A9",
        "#EEEEAF",
        "#D81414",
    ],
}


def sat_list(
    name,
):
    """
    Retrieve satellite dataset information based on the specified category.

    Args:
        name (str): The category of satellite datasets to retrieve.
                    Options include "open", "weather", or any other name.

    Returns:
        tuple: A tuple containing three lists:
            - display_name (list): A list of dataset display names.
            - is_image (list): A list indicating whether each dataset is an image.
            - start_date (list): A list of start dates for each dataset.
    """
    # Check the category and retrieve corresponding dataset information
    if name == "open":
        display_name = GEE_DATASETS_DF["display_name"].to_list()
        is_image = GEE_DATASETS_DF["is_image"].to_list()
        start_date = GEE_DATASETS_DF["start_date"].to_list()
    elif name == "weather":
        display_name = GEE_DATASETS_DF_WEATHER["display_name"].to_list()
        is_image = GEE_DATASETS_DF_WEATHER["is_image"].to_list()
        start_date = GEE_DATASETS_DF_WEATHER["start_date"].to_list()
    else:
        display_name = GEE_DATASETS_DF_DERIVE["display_name"].to_list()
        is_image = GEE_DATASETS_DF_DERIVE["is_image"].to_list()
        start_date = GEE_DATASETS_DF_DERIVE["start_date"].to_list()

    # Return the dataset information as a tuple
    return display_name, is_image, start_date


def sat_geo_id(
    dataset_name,
    dates,
    id,
    bands=None,
    indices=None,
    grad=None,
    clip=None,
    bound=None,
    box=None,
    layer=None,
    cloud_filter=None,
):
    """
    Retrieves and processes satellite imagery or geospatial data based on the provided parameters.

    Args:
        dataset_name (str): The name of the dataset to be accessed.
        dates (list): A list containing date strings in ISO format.
        id (str): The unique identifier for the feature to be retrieved.
        bands (list, optional): List of band names to be used for visualization.
        indices (list, optional): List of indices for calculating normalized differences.
        grad (str, optional): Gradient type for visualization (if applicable).
        clip (tuple, optional): Contains the clipping parameters for geographic boundaries.
        bound (bool, optional): Whether to return the bounding features.
        box (list, optional): Coordinates for a bounding box for the image.
        layer (str, optional): Specific layer to be accessed if applicable.

    Returns:
        tuple: A tuple containing the following:
            - URL to the processed image
            - Start date as a string
            - GeoJSON features if clipped and bound is True
            - Processed image object
            - Visualization parameters
            - Address of the feature object
    """
    try:
        start = ""
        # Handle clipping if specified
        if clip:
            geoj = get_clip_geo(
                clip[0], clip[1]
            )  # Get geometry based on clip parameters

            # Check if the dataset is related to boundaries and apply styling
            if (
                (dataset_name == "Country Boundaries" and clip[0] == "cont")
                or (dataset_name == "State Boundaries" and clip[0] == "state")
                or (dataset_name == "District Boundaries" and clip[0] == "dis")
            ):
                geoj = geoj.style(fillColor="0000", color="black", width=1.0)
                return get_url(geoj, {}), start

        # Retrieve the feature object using the provided ID
        feature_obj = Feature.objects.get(id=id)

        # If the feature does not have a start date, process the datasets accordingly
        if not feature_obj.visuals["start"]:
            if dataset_name == "Human Settlement Footprint":
                dataset = ee.Image("DLR/WSF/WSF2015/v1")  # Load the dataset
                if feature_obj.visuals["cloud"]:
                    if cloud_filter:
                        dataset = dataset.filter(
                            ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_filter)
                        )
                vis_params = {
                    "min": 0,
                    "max": 255,
                    "opacity": 0.75,
                }  # Visualization parameters
                image = ee.Image(0).blend(
                    dataset
                )  # Blend the dataset with a blank image
                image = (
                    image.clipToCollection(geoj) if clip else image
                )  # Clip the image if necessary
                image = image.filterBounds(ee.Geometry.Rectangle(box)) if box else image
                # Handle layers and WFS requests
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"
                    url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                    print(url_wfs)

                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(url_wfs, headers=headers, auth=AUTH)

                    # If the response is successful, process the geojson features
                    if response.status_code == 200:
                        geojson = json.loads(response.content)
                        features = geojson["features"]
                        ee_features = [ee.Feature(feature) for feature in features]
                        feature_collection = ee.FeatureCollection(ee_features)
                        merged_geometry = feature_collection.geometry()
                        image = image.clip(
                            merged_geometry
                        )  # Clip image to merged geometry

                # Return the URL of the image and additional info
                return (
                    get_url(image, vis_params),
                    start,
                    geoj.getInfo()["features"] if clip else None,
                )

            # Similar processing for other dataset names
            elif dataset_name == "Global Digital Surface Model 30m":
                dataset = ee.ImageCollection("COPERNICUS/DEM/GLO30")
                vis_params = {
                    "min": 0.0,
                    "max": 1000.0,
                    "palette": ["0000ff", "00ffff", "ffff00", "ff0000", "ffffff"],
                }
                # Select the DEM band

                # Clip image to merged geometry
                image = dataset.select("DEM").mean()
                image = image.clipToCollection(geoj) if clip else image
                image = image.clip(ee.Geometry.Rectangle(box)) if box else image

                # Handle additional layer requests
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"
                    url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                    print(url_wfs)

                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(url_wfs, headers=headers, auth=AUTH)

                    if response.status_code == 200:
                        geojson = json.loads(response.content)
                        features = geojson["features"]
                        ee_features = [ee.Feature(feature) for feature in features]
                        feature_collection = ee.FeatureCollection(ee_features)
                        merged_geometry = feature_collection.geometry()
                        image = image.clip(merged_geometry)
                # Return the processed image details
                return (
                    get_url(image, vis_params),
                    start,
                    geoj.getInfo()["features"] if clip else None,
                    image.mean(),
                    {
                        "min": 0.0,
                        "max": 1000.0,
                        "palette": ["0000ff", "00ffff", "ffff00", "ff0000", "ffffff"],
                        "bands": ["DEM"],
                    },
                    "COPERNICUS/DEM/GLO30",
                )

            elif (
                dataset_name == "Rivers of World"
                or dataset_name == "Indian Watersheds and Rivers"
            ):
                if dataset_name == "Indian Watersheds and Rivers":
                    clipper = get_clip_geo("cont", ["India"])  # Get clip for India
                url = []
                levels = [5, 6, 7, 11]  # Define levels for filtering
                dataset = ee.FeatureCollection("WWF/HydroSHEDS/v1/FreeFlowingRivers")
                vis_params = {
                    "min": 1,
                    "max": 10,
                    "palette": ["08519c", "3182bd", "6baed6", "bdd7e7", "eff3ff"],
                }
                dataset = (
                    dataset.filterBounds(geoj) if clip else dataset
                )  # Filter by bounds
                dataset = (
                    dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )

                # Handle layer-specific requests
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"
                    url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                    print(url_wfs)

                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(url_wfs, headers=headers, auth=AUTH)

                    if response.status_code == 200:
                        geojson = json.loads(response.content)
                        features = geojson["features"]
                        ee_features = [ee.Feature(feature) for feature in features]
                        feature_collection = ee.FeatureCollection(ee_features)
                        merged_geometry = feature_collection.geometry()
                        dataset = dataset.filterBounds(dataset)

                dataset = (
                    dataset.filterBounds(clipper)
                    if dataset_name == "Indian Watersheds and Rivers"
                    else dataset
                )
                for i in levels:
                    river = dataset.filter(
                        ee.Filter.lt("RIV_ORD", i)
                    )  # Filter rivers by order
                    image = (
                        ee.Image().byte().paint(river, "RIV_ORD", 2)
                    )  # Paint the river features
                    url.append(get_url(image, vis_params))  # Get URLs for each level

                return (
                    url,
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )

            elif dataset_name == "Nighttime Data (VIIRS)":
                # Parse start date
                start_date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")

                # Calculate end date (2 days later)
                end_date = start_date + timedelta(days=2)

                # Format dates as "YYYY-MM-DD"
                start = start_date.strftime("%Y-%m-%d")
                end = end_date.strftime("%Y-%m-%d")

                # Filter VIIRS dataset by date range
                dataset = ee.ImageCollection(
                    "NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG"
                ).filterDate(start, end)

                # Select the average radiance band
                image = dataset.select("avg_rad")

                # Visualization parameters for night light data
                vis_params = {"min": -2, "max": 340574}
                image = (
                    image.clipToCollection(geoj) if clip else image
                )  # Clip if necessary
                image = (
                    image.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"
                    url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                    print(url_wfs)

                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(url_wfs, headers=headers, auth=AUTH)

                    if response.status_code == 200:
                        geojson = json.loads(response.content)
                        features = geojson["features"]
                        ee_features = [ee.Feature(feature) for feature in features]
                        feature_collection = ee.FeatureCollection(ee_features)
                        merged_geometry = feature_collection.geometry()
                        image = image.clip(merged_geometry)
                # Return image URL, start date, and other relevant data
                return (
                    get_url(image, vis_params),
                    start,
                    None,
                    image,
                    vis_params,
                    feature_obj.address,
                )

            elif dataset_name == "Country Boundaries":
                # Load country boundaries dataset
                dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0")

                # Apply clipping to the dataset based on geojson bounds if necessary
                dataset = dataset.filterBounds(geoj) if clip else dataset

                # Apply bounding box filtering if box is provided
                dataset = (
                    dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )

                # Check for custom layer input
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"

                    # Generate WFS request URL for the specified layer
                    url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                    print(url_wfs)

                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }

                    # Make WFS request to fetch layer features
                    response = requests.get(url_wfs, headers=headers, auth=AUTH)

                    if response.status_code == 200:
                        # Parse the geojson response and convert to Earth Engine features
                        geojson = json.loads(response.content)
                        features = geojson["features"]
                        ee_features = [ee.Feature(feature) for feature in features]
                        feature_collection = ee.FeatureCollection(ee_features)
                        merged_geometry = feature_collection.geometry()

                        # Filter dataset by the merged geometry
                        dataset = dataset.filterBounds(dataset)

                # Style the country boundaries dataset
                dataset = dataset.style(fillColor="0000", color="black", width=1.0)

                # Return dataset URL and relevant info if clipped
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )

            elif dataset_name == "State Boundaries":
                # Load state boundaries dataset
                dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level1")

                # Apply clipping to the dataset based on geojson bounds if necessary
                dataset = dataset.filterBounds(geoj) if clip else dataset

                # Apply bounding box filtering if box is provided
                dataset = (
                    dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )

                # Check for custom layer input
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"

                    # Generate WFS request URL for the specified layer
                    url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                    print(url_wfs)

                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }

                    # Make WFS request to fetch layer features
                    response = requests.get(url_wfs, headers=headers, auth=AUTH)

                    if response.status_code == 200:
                        # Parse the geojson response and convert to Earth Engine features
                        geojson = json.loads(response.content)
                        features = geojson["features"]
                        ee_features = [ee.Feature(feature) for feature in features]
                        feature_collection = ee.FeatureCollection(ee_features)
                        merged_geometry = feature_collection.geometry()

                        # Filter dataset by the merged geometry
                        dataset = dataset.filterBounds(dataset)

                # Style the state boundaries dataset
                dataset = dataset.style(fillColor="0000", color="black", width=1.0)

                # Return dataset URL and relevant info if clipped
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )

            elif dataset_name == "District Boundaries":
                # Load district boundaries dataset
                dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2")

                # Apply clipping to the dataset based on geojson bounds if necessary
                dataset = dataset.filterBounds(geoj) if clip else dataset

                # Apply bounding box filtering if box is provided
                dataset = (
                    dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )

                # Check for custom layer input
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"

                    # Generate WFS request URL for the specified layer
                    url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                    print(url_wfs)

                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }

                    # Make WFS request to fetch layer features
                    response = requests.get(url_wfs, headers=headers, auth=AUTH)

                    if response.status_code == 200:
                        # Parse the geojson response and convert to Earth Engine features
                        geojson = json.loads(response.content)
                        features = geojson["features"]
                        ee_features = [ee.Feature(feature) for feature in features]
                        feature_collection = ee.FeatureCollection(ee_features)
                        merged_geometry = feature_collection.geometry()

                        # Filter dataset by the merged geometry
                        dataset = dataset.filterBounds(dataset)

                # Style the district boundaries dataset
                dataset = dataset.style(fillColor="0000", color="black", width=1.0)

                # Return dataset URL and relevant info if clipped
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )

            elif dataset_name == "Germany High-Res Image (20cm)":
                # Load high-resolution image dataset for Germany (Brandenburg) with 20cm resolution
                dataset = ee.Image("Germany/Brandenburg/orthos/20cm")

                # Return dataset URL and relevant info if clipped
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )

            # Load the image using the address provided in the feature object
            image = ee.Image(feature_obj.address)
            print(image)

        else:
            if dates[1] is None:
                # Parse start date and adjust based on dataset
                date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ").strftime(
                    "%Y-%m-%d"
                )
                start_date = datetime.fromisoformat(date) + timedelta(days=1)
                end_date = start_date + timedelta(days=2)

                # Adjust date ranges for specific datasets
                if dataset_name == "30m Satellite data (Landsat 8)":
                    start_date -= timedelta(days=1)
                if dataset_name == "Daily Land Surface Temperature":
                    end_date += timedelta(days=4)
                if dataset_name == "Monthly Nighttime Data (VIIRS)":
                    end_date += timedelta(days=30)
                if dataset_name in [
                    "Near surface air temperature",
                    "Near surface wind speed",
                    "Surface Pressure in Pascal",
                ]:
                    end_date += timedelta(days=29)

                start = start_date.strftime("%Y-%m-%d")
                end = end_date.strftime("%Y-%m-%d")

                try:
                    # Filter the image collection using the start and end dates
                    dataset = ee.ImageCollection(feature_obj.address).filter(
                        ee.Filter.date(start, end)
                    )
                    new_image = dataset.select("LST_Night_1km")

                except Exception as e:
                    print(e)

            else:
                # Filter the dataset using the provided date range
                dataset = ee.ImageCollection(feature_obj.address).filter(
                    ee.Filter.date(dates[0], dates[1])
                )
                if feature_obj.visuals["cloud"]:
                    if cloud_filter:
                        print(f"here with cloud filter pct: {cloud_filter}")
                        dataset = dataset.filter(
                            ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", int(cloud_filter))
                        )
                start = dates[0]

                # Select the LST_Night_1km band for processing
                new_image = dataset.select("LST_Night_1km")

            # Apply scale factors for Landsat 8 if needed and indices are not provided
            dataset = (
                dataset.map(apply_scale_factors)
                if dataset_name == "30m Satellite data (Landsat 8)" and not indices
                else dataset
            )

            if indices:
                # Calculate the normalized difference using the provided indices
                print(f"indices: {indices}")
                image = dataset.mean().normalizedDifference(indices)
            else:
                # Calculate the mean of the dataset
                image = dataset.mean()

        vis_params = feature_obj.params
        print(f"vis params: {vis_params}")

        if bands:
            print(f"bands: {bands}")
            # Set the bands for visualization parameters
            vis_params["bands"] = [bands[0], bands[1], bands[2]]

        # Handle specific dataset conditions
        if dataset_name == "Daily Land Surface Temperature":
            image = new_image.mean()
        elif dataset_name == "Temperature above (2m)ground":
            image = dataset.select("temperature_2m_above_ground").mean()
        elif dataset_name == "Landsat 1972_to_1983":
            image = dataset.select(["30", "20", "10"]).mean()
            vis_params = {"gamma": 1.6, "max": 48, "min": 11, "opacity": 1}
        elif dataset_name == "Synthetic Aperture Radar - Sentinel 1":
            image = (
                dataset.filter(
                    ee.Filter.listContains("transmitterReceiverPolarisation", "VV")
                )
                .filter(ee.Filter.eq("instrumentMode", "IW"))
                .select("VV")
                .map(lambda img: img.updateMask(img.mask().And(img.lt(-30.0).Not())))
            ).mean()

            # Clip the image based on geometry or box
            image = image.clipToCollection(geoj) if clip else image
            image = image.clip(ee.Geometry.Rectangle(box)) if box else image

            # Handle additional layer requests
            if layer:
                work = "useruploads" if "upload" in layer else "VGT"

                url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
                print(url_wfs)

                headers = {
                    "accept": "application/json",
                    "content-type": "application/json",
                }
                print("headers", headers)
                response = requests.get(url_wfs, headers=headers, auth=AUTH)

                if response.status_code == 200:
                    geojson = json.loads(response.content)
                    features = geojson["features"]
                    ee_features = [ee.Feature(feature) for feature in features]
                    feature_collection = ee.FeatureCollection(ee_features)
                    merged_geometry = feature_collection.geometry()
                    image = image.clip(merged_geometry)

            return (
                get_url(image, {"min": -25, "max": 5}),
                start,
                geoj.getInfo()["features"] if clip and bound else None,
                image,
                {"min": -25, "max": 5},
                feature_obj.address,
            )

    # Handle errors during processing
    except Exception as e:
        print(e)

    try:
        print("dataset name", dataset_name)
        # Additional processing for specific datasets
        if dataset_name == "Daily Land Surface Temperature":
            image = image.multiply(0.02).subtract(273.15)
        elif dataset_name == "Global Slope Map":
            image = ee.Terrain.slope(image.select(["elevation"]))
            vis_params["bands"] = ["slope"]

        # Clip image based on geometry or box
        image = image.clipToCollection(geoj) if clip else image
        image = image.clip(ee.Geometry.Rectangle(box)) if box else image

        # Handle additional layer requests
        if layer:
            print("layer true")
            work = "useruploads" if "upload" in layer else "VGT"
            print("work", work)
            url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
            print(url_wfs)

            headers = {"accept": "application/json", "content-type": "application/json"}
            response = requests.get(url_wfs, headers=headers, auth=AUTH)
            print("response", response.status_code)

            if response.status_code == 200:
                try:
                    geojson = json.loads(response.content)
                    features = geojson.get("features", [])
                    print(f"Number of features retrieved: {len(features)}")
                    if not features:
                        print("No features available.")
                        return None
                except Exception as e:
                    print("Error parsing WFS response:", e)
                    return None
            else:
                print(f"WFS request failed with status code {response.status_code}")
                return

            # Remove Z-values from features
            cleaned_features = [remove_z_values(feature) for feature in features]

            ee_features = []
            for feature in cleaned_features:
                try:
                    ee_features.append(ee.Feature(feature))
                except Exception as e:
                    print("Error creating ee.Feature:", e)
                    print("Problematic Feature:", feature)

            if ee_features:
                # Create FeatureCollection
                feature_collection = ee.FeatureCollection(ee_features)
                print("FeatureCollection created successfully.")

                # Merge geometries
                merged_geometry = feature_collection.geometry()
                print("Merged Geometry:", merged_geometry.getInfo())

                # Clip image
                image = image.clip(merged_geometry)
                print("Image clipped successfully.")
            else:
                print("No valid features to process.")

            # if response.status_code == 200:
            #     geojson = json.loads(response.content)
            #     # print(response.content)
            #     # print('geojson', geojson)
            #     features = geojson["features"]
            #     # print('features',features)
            #     for feature in features:
            #         geometry = feature['geometry']
            #         print('Geometry:', geometry)

            #     ee_features = [ee.Feature(feature) for feature in features]
            #     print('ee_features',ee_features)
            #     feature_collection = ee.FeatureCollection(ee_features)
            #     # print('feature_collection',feature_collection)
            #     merged_geometry = feature_collection.geometry()
            #     # print('merged_geometry',merged_geometry)
            #     image = image.clip(merged_geometry)
            #     # print('image',image)

        # Set visualization parameters
        vis_params = (
            {"min": -1, "max": 1, "palette": PALETTE_DICT[grad]}
            if indices
            else vis_params
        )

        return (
            get_url(image, vis_params),
            start,
            geoj.getInfo()["features"] if clip and bound else None,
            image,
            vis_params,
            feature_obj.address,
        )
    except Exception as e:
        traceback.print_exc()
    # except Exception as e:
    #     print("Error sat_geo_id:", e)


def remove_z_values(feature):
    """
    Removes the third dimension (Z-value) from the coordinates in the geometry of a GeoJSON feature.
    """
    geometry = feature.get("geometry", {})
    if geometry.get("type") == "MultiPolygon":
        # Remove Z-values (third dimension) from the coordinates
        geometry["coordinates"] = [
            [[[lon, lat] for lon, lat, *_ in ring] for ring in polygon]
            for polygon in geometry["coordinates"]
        ]
    feature["geometry"] = geometry
    return feature


def sat_geo_df_llm(**data):
    try:
        data_user = User.objects.get(id=data["id"]).chat
        for key in data:
            data_user[key] = data[key]
        data = data_user
        print(f"input data to function: {data}")
        if data["dates"][0] and "extent" in data:
            date0 = datetime.strptime(data["dates"][0], "%Y-%m-%d")
            date1 = datetime.strptime(data["dates"][0], "%Y-%m-%d") + timedelta(days=1)

            extent = generate_bounding_box_points(data["extent"])
            name = ""
            if data["dataset_name"] in GEE_DATASETS_DF["display_name"].values:
                name = "open"
            elif data["dataset_name"] in GEE_DATASETS_DF_DERIVE["display_name"].values:
                name = "derive"
            elif data["dataset_name"] in GEE_DATASETS_DF_WEATHER["display_name"].values:
                name = "weather"

            # Filter the dataset based on the name
            if name == "open":
                filtered_df = GEE_DATASETS_DF[
                    GEE_DATASETS_DF["display_name"] == data["dataset_name"]
                ]
            elif name == "weather":
                filtered_df = GEE_DATASETS_DF_WEATHER[
                    GEE_DATASETS_DF_WEATHER["display_name"] == data["dataset_name"]
                ]
            else:
                filtered_df = GEE_DATASETS_DF_DERIVE[
                    GEE_DATASETS_DF_DERIVE["display_name"] == data["dataset_name"]
                ]

            res_dict = filtered_df.to_dict(orient="records")
            dataset = res_dict[0]["address"]
            # Check if `date1` is exactly one day after `date0`
            if date1 == date0 + timedelta(days=1):

                data["dates"] = [
                    get_next_date(
                        data["dates"][0],
                        dataset,
                        box=extent,  # Make sure `get_next_date` can handle `box`
                        reverse=False,
                        date2=None,
                        image=False,
                    ),
                    None,
                ]
                data["dates"] = [
                    (
                        date.strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:-4] + "Z"
                        if date is not None
                        else None
                    )
                    for date in data["dates"]
                ]
                print("new Dates", data["dates"])

            if all(element is None for element in data["dates"]):
                return "There are no dates available for this region, Reduce the region to get dates."

        send_data = sat_geo_df(
            data["dataset_name"],
            data["dates"],
            name=None,
            bands=data["bands"] if "bands" in data else None,
            indices=data["indices"] if "indices" in data else None,
            grad=data["grad"] if "grad" in data else None,
            clip=data["clip"] if "clip" in data else None,
            bound=True if "bound" in data else None,
            box=data["box"] if "box" in data else None,
            layer=data["layer"] if "layer" in data else None,
            llm=True,
        )
        if send_data[0]:
            name = f"{data['dataset_name']}"
            if data["dates"] and data["dates"][0] is not None:
                name = (
                    name
                    + f"_{datetime.strptime(data['dates'][0], '%Y-%m-%dT%H:%M:%S.%fZ').strftime('%Y-%m-%d')}"
                )
            resp = {"data": [{"type": "url", "data": send_data[0], "name": name}]}
            return resp
    except Exception as e:
        traceback.print_exc()


def sat_geo_df(
    dataset_name,
    dates,
    name=None,
    bands=None,
    indices=None,
    grad=None,
    clip=None,
    bound=None,
    box=None,
    layer=None,
    llm=False,
):
    """
    Retrieve and process satellite data based on specified parameters.

    This function interacts with Google Earth Engine (GEE) to fetch and process
    satellite imagery and related datasets. It allows for filtering based on
    geographical boundaries, dates, and other parameters. It also handles different
    dataset types and applies relevant visual parameters for rendering the images.

    Args:
        dataset_name (str): The name of the dataset to retrieve.
        dates (list): A list of dates for filtering the dataset.
        name (str): Name to identify the dataset type.
        bands (list, optional): Specific bands to select for the image.
        indices (list, optional): Indices to calculate from the image.
        grad (str, optional): Gradient to apply for visualizations.
        clip (list, optional): Specifies whether to clip the image to a specific boundary.
        bound (bool, optional): Determines if bounding information should be returned.
        box (list, optional): Bounding box for filtering the dataset.
        layer (str, optional): Specific layer to retrieve from the dataset.

    Returns:
        tuple: A tuple containing the URL of the processed image, start date,
               geographical features if clipped, the image object,
               visual parameters, and the dataset address.
    """
    try:
        start = ""  # Initialize the start date variable

        # Check if clipping is required
        if clip:
            geoj = get_clip_geo(clip[0], clip[1])
            # Style the geographical object based on dataset type
            if (
                (dataset_name == "Country Boundaries" and clip[0] == "cont")
                or (dataset_name == "State Boundaries" and clip[0] == "state")
                or (dataset_name == "District Boundaries" and clip[0] == "dis")
            ):
                geoj = geoj.style(fillColor="0000", color="black", width=1.0)
                return get_url(geoj, {}), start

        # Determine the dataset name if not provided
        if not name:
            if dataset_name in GEE_DATASETS_DF["display_name"].values:
                name = "open"
            elif dataset_name in GEE_DATASETS_DF_DERIVE["display_name"].values:
                name = "derive"
            elif dataset_name in GEE_DATASETS_DF_WEATHER["display_name"].values:
                name = "weather"

        # Filter the dataset based on the name
        if name == "open":
            filtered_df = GEE_DATASETS_DF[
                GEE_DATASETS_DF["display_name"] == dataset_name
            ]
        elif name == "weather":
            filtered_df = GEE_DATASETS_DF_WEATHER[
                GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
            ]
        else:
            filtered_df = GEE_DATASETS_DF_DERIVE[
                GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
            ]

        res_dict = filtered_df.to_dict(orient="records")
        if res_dict[0]["is_image"] == 1:  # Check if the dataset is an image
            # Process different image datasets
            if dataset_name == "Human Settlement Footprint":
                dataset = ee.Image("DLR/WSF/WSF2015/v1")
                vis_params = {"min": 0, "max": 255, "opacity": 0.75}
                image = ee.Image(0).blend(dataset)
                image = image.clipToCollection(geoj) if clip else image
                image = image.clip(ee.Geometry.Rectangle(box)) if box else image
                if layer:
                    work = (
                        "useruploads" if "upload" in layer else "VGT"
                    )  # Determine workspace
                    url_get_layer = f"https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{layer}"
                    print(url_get_layer)  # Print URL for debugging
                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(
                        url_get_layer, headers=headers, auth=AUTH
                    )  # Request layer information
                    if (
                        response.status_code == 200
                    ):  # Check if the request was successful
                        ge = json.loads(
                            response.content
                        )  # Load the response content as JSON
                        ge = ge["featureType"][
                            "latLonBoundingBox"
                        ]  # Get bounding box information
                        print(ge)  # Print bounding box for debugging
                        box = ee.Geometry.Rectangle(
                            [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                        )  # Create a geometry rectangle for the bounding box
                        image = image.clip(box)
                return (
                    get_url(image, vis_params),
                    start,
                    geoj.getInfo()["features"] if clip else None,
                )

            elif dataset_name == "Global Digital Surface Model 30m":
                dataset = ee.ImageCollection("COPERNICUS/DEM/GLO30")
                vis_params = {
                    "min": 0.0,
                    "max": 1000.0,
                    "palette": ["0000ff", "00ffff", "ffff00", "ff0000", "ffffff"],
                }
                dataset = dataset.filterBounds(geoj) if clip else dataset
                dataset = (
                    dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"
                    url_get_layer = f"https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{layer}"
                    print(url_get_layer)
                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(url_get_layer, headers=headers, auth=AUTH)
                    if response.status_code == 200:
                        ge = json.loads(response.content)
                        ge = ge["featureType"]["latLonBoundingBox"]

                        box = ee.Geometry.Rectangle(
                            [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                        )
                        dataset = dataset.filterBounds(box)
                image = dataset.select("DEM")

                return (
                    get_url(image, vis_params),
                    start,
                    geoj.getInfo()["features"] if clip else None,
                    image.mean(),
                    {
                        "min": 0.0,
                        "max": 1000.0,
                        "palette": ["0000ff", "00ffff", "ffff00", "ff0000", "ffffff"],
                        "bands": ["DEM"],
                    },
                    "COPERNICUS/DEM/GLO30",
                )

            elif (
                dataset_name == "Rivers of World"
                or dataset_name == "Indian Watersheds and Rivers"
            ):
                if dataset_name == "Indian Watersheds and Rivers":
                    clipper = get_clip_geo("cont", ["India"])
                url = []
                levels = [5, 6, 7, 11]
                dataset = ee.FeatureCollection("WWF/HydroSHEDS/v1/FreeFlowingRivers")
                vis_params = {
                    "min": 1,
                    "max": 10,
                    "palette": ["08519c", "3182bd", "6baed6", "bdd7e7", "eff3ff"],
                }
                dataset = dataset.filterBounds(geoj) if clip else dataset
                dataset = (
                    dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"
                    url_get_layer = f"https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{layer}"
                    print(url_get_layer)
                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(url_get_layer, headers=headers, auth=AUTH)
                    if response.status_code == 200:
                        ge = json.loads(response.content)
                        ge = ge["featureType"]["latLonBoundingBox"]

                        box = ee.Geometry.Rectangle(
                            [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                        )
                        dataset = dataset.filterBounds(box)
                dataset = (
                    dataset.filterBounds(clipper)
                    if dataset_name == "Indian Watersheds and Rivers"
                    else dataset
                )
                for i in levels:
                    river = dataset.filter(ee.Filter.lt("RIV_ORD", i))
                    image = ee.Image().byte().paint(river, "RIV_ORD", 2)
                    url.append(get_url(image, vis_params))
                return (
                    url,
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )

            elif dataset_name == "Nighttime Data (VIIRS)":
                start_date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
                end_date = start_date + timedelta(days=2)
                start = start_date.strftime("%Y-%m-%d")
                end = end_date.strftime("%Y-%m-%d")
                dataset = ee.ImageCollection(
                    "NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG"
                ).filterDate(start, end)
                dataset = dataset.filterBounds(geoj) if clip else dataset
                dataset = (
                    dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
                )
                if layer:
                    work = "useruploads" if "upload" in layer else "VGT"
                    url_get_layer = f"https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{layer}"
                    print(url_get_layer)
                    headers = {
                        "accept": "application/json",
                        "content-type": "application/json",
                    }
                    response = requests.get(url_get_layer, headers=headers, auth=AUTH)
                    if response.status_code == 200:
                        ge = json.loads(response.content)
                        ge = ge["featureType"]["latLonBoundingBox"]

                        box = ee.Geometry.Rectangle(
                            [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                        )
                        dataset = dataset.filterBounds(box)
                image = dataset.select("avg_rad")
                vis_params = {"min": -2, "max": 340574}
                return (
                    get_url(image, vis_params),
                    start,
                    None,
                    image,
                    vis_params,
                    res_dict[0]["address"],
                )

            elif dataset_name == "Country Boundaries":
                dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0")
                dataset = dataset.filterBounds(geoj) if clip else dataset
                dataset = dataset.style(fillColor="0000", color="black", width=1.0)
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )
            elif dataset_name == "State Boundaries":
                dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level1")
                dataset = dataset.filterBounds(geoj) if clip else dataset
                dataset = dataset.style(fillColor="0000", color="black", width=1.0)
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )
            elif dataset_name == "District Boundaries":
                dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2")
                dataset = dataset.filterBounds(geoj) if clip else dataset
                dataset = dataset.style(fillColor="0000", color="black", width=1.0)
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )
            elif dataset_name == "Germany High-Res Image (20cm)":
                dataset = ee.Image("Germany/Brandenburg/orthos/20cm")
                return (
                    get_url(dataset, {}),
                    start,
                    geoj.getInfo()["features"] if clip and bound else None,
                )
            image = ee.Image(res_dict[0]["address"])

        else:
            # Handle non-image datasets
            if dates[1] is None:
                date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
                date = date.strftime("%Y-%m-%d")
                if not llm:
                    start_date = datetime.fromisoformat(date) + timedelta(days=1)
                    end_date = start_date + timedelta(days=2)
                else:
                    start_date = datetime.fromisoformat(date)
                    end_date = start_date + timedelta(days=2)

                # Adjust date ranges for specific datasets
                if dataset_name == "30m Satellite data (Landsat 8)":
                    start_date = start_date - timedelta(days=1)
                if dataset_name == "Daily Land Surface Temperature":
                    end_date = end_date + timedelta(days=4)
                if dataset_name == "Monthly Nighttime Data ( VIIRS )":
                    end_date = end_date + timedelta(days=30)
                if (
                    dataset_name == "Near surface air temperature"
                    or dataset_name == "Near surface wind speed"
                    or dataset_name == "Surface Pressure in Pascal"
                ):
                    end_date = end_date + timedelta(days=29)

                start = start_date.strftime("%Y-%m-%d")
                end = end_date.strftime("%Y-%m-%d")
                try:
                    dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
                        ee.Filter.date(start, end)
                    )
                    new_image = dataset.select("LST_Night_1km")

                except Exception as e:
                    print(e)
            else:
                dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
                    ee.Filter.date(dates[0], dates[1])
                )
                start = dates[0]
                new_image = dataset.select("LST_Night_1km")

            # Apply scale factors for specific datasets
            dataset = (
                dataset.map(apply_scale_factors)
                if dataset_name == "30m Satellite data (Landsat 8)" and not indices
                else dataset
            )

            # Calculate indices if specified
            if indices:
                print(indices)
                image = dataset.mean().normalizedDifference(indices)
            else:
                image = dataset.mean()

        # Prepare visualization parameters
        vis_params = {
            "min": float(res_dict[0]["min"]),
            "max": float(res_dict[0]["max"]),
        }

        # Check if bands are specified in the response dictionary and are not set to "-1"
        if res_dict[0]["bands"] != "-1":
            if bands:  # If bands are provided by the user
                print(bands)  # Print the specified bands for debugging
                try: 
                    # Attempt to set visualization parameters for bands from user input
                    vis_params["bands"] = [
                        bands["dropdown1"],
                        bands["dropdown2"],
                        bands["dropdown3"],
                    ]
                except:
                    # Fallback to accessing bands as a list if the first method fails
                    vis_params["bands"] = [
                        bands[0],
                        bands[1],
                        bands[2],
                    ]
            else:
                # If no user-specified bands, use the bands from the response dictionary
                vis_params["bands"] = eval(res_dict[0]["bands"])

        print(vis_params)  # Print visualization parameters for debugging

        # Check if a color palette is specified in the response dictionary
        if res_dict[0]["palette"] != "-1":
            # If a palette exists, evaluate and set it in visualization parameters
            vis_params["palette"] = eval(res_dict[0]["palette"])

        # Check if gamma correction value exists and is valid
        if res_dict[0]["gamma"]:
            vis_params["gamma"] = int(
                res_dict[0]["gamma"]
            )  # Set gamma value for visualization

        # Customize the palette specifically for the "Daily Land Surface Temperature" dataset
        if dataset_name == "Daily Land Surface Temperature":
            vis_params["palette"] = [
                "040274",
                "040281",
                "0502a3",
                "0502b8",
                "0502ce",
                "0502e6",
                "0602ff",
                "235cb1",
                "307ef3",
                "269db1",
                "30c8e2",
                "32d3ef",
                "3be285",
                "3ff38f",
                "86e26f",
                "3ae237",
                "b5e22e",
                "d6e21f",
                "fff705",
                "ffd611",
                "ffb613",
                "ff8b13",
                "ff6e08",
                "ff500d",
                "ff0000",
                "de0101",
                "c21301",
                "a71001",
                "911003",
            ]
            image = (
                new_image.mean()
            )  # Calculate the mean of the new image for visualization

        # Handle the "Temperature above (2m) ground" dataset specifically
        if dataset_name == "Temperature above (2m)ground":
            del vis_params["bands"]  # Remove bands from visualization parameters
            image = dataset.select(
                "temperature_2m_above_ground"
            ).mean()  # Calculate mean temperature

        # Handle the "Landsat 1972_to_1983" dataset specifically
        if dataset_name == "Landsat 1972_to_1983":
            image = dataset.select(
                ["30", "20", "10"]
            ).mean()  # Select specific bands and calculate mean
            # Set specific visualization parameters for this dataset
            vis_params = {"gamma": 1.6, "max": 48, "min": 11, "opacity": 1}

        # Handle the "Synthetic Aperture Radar - Sentinel 1" dataset specifically
        if dataset_name == "Synthetic Aperture Radar - Sentinel 1":
            # Filter dataset for specific polarizations and instrument mode
            image = (
                dataset.filter(
                    ee.Filter.listContains("transmitterReceiverPolarisation", "VV")
                )
                .filter(ee.Filter.eq("instrumentMode", "IW"))
                .select("VV")
                .map(
                    # Update the mask to exclude low values
                    lambda image: image.updateMask(
                        image.mask().And((image.lt(-30.0).Not()))
                    )
                )
            ).mean()  # Calculate the mean of the filtered images

            # Optionally clip the image based on provided geometries
            image = image.clipToCollection(geoj) if clip else image
            image = image.clip(ee.Geometry.Rectangle(box)) if box else image

            # Handle additional layer-related operations if specified
            if layer:
                work = (
                    "useruploads" if "upload" in layer else "VGT"
                )  # Determine workspace
                url_get_layer = f"https://geoserver.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{layer}"
                print(url_get_layer)  # Print URL for debugging
                headers = {
                    "accept": "application/json",
                    "content-type": "application/json",
                }
                response = requests.get(
                    url_get_layer, headers=headers, auth=AUTH
                )  # Request layer information
                if response.status_code == 200:  # Check if the request was successful
                    ge = json.loads(
                        response.content
                    )  # Load the response content as JSON
                    ge = ge["featureType"][
                        "latLonBoundingBox"
                    ]  # Get bounding box information
                    print(ge)  # Print bounding box for debugging
                    box = ee.Geometry.Rectangle(
                        [ge["minx"], ge["miny"], ge["maxx"], ge["maxy"]]
                    )  # Create a geometry rectangle for the bounding box
                    image = image.clip(box)  # Clip the image to the bounding box

            # Return the URL for visualization, along with other relevant information
            return (
                get_url(
                    image, {"min": -25, "max": 5}
                ),  # Get visualization URL with specified min and max values
                start,  # Return the start date
                (
                    geoj.getInfo()["features"] if clip and bound else None
                ),  # Return geographical features if clipped
                image,  # Return the processed image
                {"min": -25, "max": 5},  # Return visualization parameters
                res_dict[0]["address"],  # Return dataset address
            )

    except Exception as e:
        print(e)

    try:
        # Adjust the image values for "Daily Land Surface Temperature" dataset
        if dataset_name == "Daily Land Surface Temperature":
            image = image.multiply(0.02).subtract(
                273.15
            )  # Convert temperature from Kelvin to Celsius

        # Calculate slope from the "Global Slope Map" dataset
        if dataset_name == "Global Slope Map":
            image = ee.Terrain.slope(
                image.select(["elevation"])
            )  # Calculate slope from elevation data
            vis_params["bands"] = ["slope"]  # Set visualization parameters to use slope

        # Clip the image to the specified geometry collection if 'clip' is true
        image = image.clipToCollection(geoj) if clip else image
        # Clip the image to a rectangular bounding box if 'box' is provided
        image = image.clip(ee.Geometry.Rectangle(box)) if box else image

        # Handle additional layer-related operations if specified
        if layer:
            work = (
                "useruploads" if "upload" in layer else "VGT"
            )  # Determine workspace based on layer name
            # Construct URL for WFS GetFeature request to retrieve layer data
            url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
            print(url_wfs)  # Print the WFS request URL for debugging

            # Set headers for the WFS request
            headers = {"accept": "application/json", "content-type": "application/json"}
            response = requests.get(
                url_wfs, headers=headers, auth=AUTH
            )  # Make the GET request to retrieve features

            # Check if the response was successful
            if response.status_code == 200:
                geojson = json.loads(
                    response.content
                )  # Load the response content as JSON
                features = geojson[
                    "features"
                ]  # Extract features from the GeoJSON response
                # Convert GeoJSON features to Earth Engine features
                ee_features = [ee.Feature(feature) for feature in features]
                feature_collection = ee.FeatureCollection(
                    ee_features
                )  # Create a feature collection
                merged_geometry = (
                    feature_collection.geometry()
                )  # Get the geometry of the merged feature collection
                image = image.clip(
                    merged_geometry
                )  # Clip the image to the merged geometry

        # Check if indices need to be calculated for visualization
        if indices:
            # Set visualization parameters based on the presence of grad
            vis_params = {
                "min": -1,
                "max": 1,
                "palette": (
                    PALETTE_DICT[grad]
                    if grad
                    else PALETTE_DICT[
                        list(PALETTE_DICT.keys())[0]
                    ]  # Default to the first palette if grad is not specified
                ),
            }

        print(vis_params)  # Print visualization parameters for debugging

        # Return processed image and relevant information
        return (
            get_url(image, vis_params),  # Get the URL for visualization
            start,  # Return the start date
            (
                geoj.getInfo()["features"] if clip and bound else None
            ),  # Return geographical features if clipped
            # image,  # Return the processed image
            vis_params,  # Return visualization parameters
            res_dict[0]["address"],  # Return dataset address
        )
    except Exception as e:
        print(e)  # Print any exception that occurs during execution


def get_next_date(date, dataset_name, box, reverse=False, date2=None, image=True):

    def calculate_percentage(image):
        intersection_area = image.geometry().intersection(box).area()
        total_area = box.area()
        percentage_covered = (intersection_area.divide(total_area)).multiply(100)
        return image.set("percentage_covered", percentage_covered)

    coll = ee.ImageCollection(dataset_name).filterBounds(box)
    if image:
        coll = coll.map(calculate_percentage).filter(
            ee.Filter.gte("percentage_covered", 70)
        )
    year, month, day = date.split("-")
    day = day.split("T")[0]  # Handle optional time component

    # Determine the starting date for the search
    start = (
        datetime(
            int(year), int(month), int(day)
        )  # Use the specified date if not reversing
        if not reverse
        else datetime(
            int(date2.split("-")[0]),  # Use the second date if reversing
            int(date2.split("-")[1]),
            int(date2.split("-")[2].split("T")[0]),
        )
    )

    # Get the number of days in the month to determine the end date
    days_in_month = calendar.monthrange(int(year), int(month))[1]
    end = (
        datetime(
            int(year), int(month), int(days_in_month)
        )  # End of the month if not reversing
        if not reverse
        else datetime(
            int(year), int(month), int(day)
        )  # Use the specified date if reversing
    )

    # If searching in reverse (looking for previous dates)
    if reverse:
        current_date = end  # Start from the end of the month
        print(current_date, start)  # Debug output showing the range being checked
        while current_date >= start:
            dataset = coll.filterDate(current_date, current_date + timedelta(1))
            if dataset.size().getInfo():
                print(current_date)
                if image:
                    return dataset
                else:
                    return current_date
            current_date -= timedelta(1)
    else:
        current_date = start  # Start from the specified date
        while current_date <= end:
            dataset = coll.filterDate(current_date, current_date + timedelta(1))
            if dataset.size().getInfo() > 0:
                if image:
                    return dataset
                else:
                    return current_date
            current_date += timedelta(1)
        print(f"data not found for {month} month")

    return None  # Return None if no suitable images are found within the date range


def get_dates_old(month, year, dataset_name, extent, name, cloud=None):
    print(month, year, dataset_name, extent, cloud)
    dates = []
    if dataset_name != "Daily Land Surface Temperature":
        boundary = generate_bounding_box_points(extent)

        def calculate_percentage(image):
            intersection_area = image.geometry().intersection(boundary).area()
            total_area = boundary.area()
            percentage_covered = (intersection_area.divide(total_area)).multiply(100)
            return image.set("percentage_covered", percentage_covered)

        if name == "open":
            filtered_df = GEE_DATASETS_DF[
                GEE_DATASETS_DF["display_name"] == dataset_name
            ]
        else:
            filtered_df = GEE_DATASETS_DF_DERIVE[
                GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
            ]
        res_dict = filtered_df.to_dict(orient="records")
        address = res_dict[0]["address"]
        print(address)
        try:
            dataset_main = (
                ee.ImageCollection(address)
                .filter(
                    ee.Filter.lt(
                        "CLOUDY_PIXEL_PERCENTAGE", 100 if cloud == None else int(cloud)
                    )
                )
                .filterBounds(boundary)
                .map(calculate_percentage)
                .filter(ee.Filter.gte("percentage_covered", 70))
                if dataset_name != "Synthetic Aperture Radar - Sentinel 1"
                else (
                    ee.ImageCollection(address)
                    .filterBounds(boundary)
                    .map(calculate_percentage)
                    .filter(ee.Filter.gte("percentage_covered", 70))
                    .filter(
                        ee.Filter.listContains("transmitterReceiverPolarisation", "VV")
                    )
                    .filter(ee.Filter.eq("instrumentMode", "IW"))
                    .select("VV")
                    .map(
                        lambda image: image.updateMask(
                            image.mask().And((image.lt(-30.0).Not()))
                        )
                    )
                )
            )

            dates = []

            def calculate_date(date):
                start_date = (
                    date
                    if dataset_name != "30m Satellite data (Landsat 8)"
                    else date - timedelta(days=1)
                )
                end_date = date + timedelta(days=1)
                dataset = dataset_main.filter(ee.Filter.date(start_date, end_date))
                if dataset.size().getInfo():
                    print(date)
                    dates.append(date)

            with concurrent.futures.ThreadPoolExecutor() as executor:
                days_in_month = calendar.monthrange(year, month)[1]
                start = datetime(year, month, 1)
                futures = [
                    executor.submit(calculate_date, start + timedelta(days=n))
                    for n in range(days_in_month)
                ]
                concurrent.futures.wait(futures)
            return dates
        except Exception as e:
            print(e)


def get_dates(
    month,
    year,
    dataset_name,
    extent,
    address,
    cloud=None,
):
    """
    Fetches a list of dates where data is available in a specified dataset, filtered by cloud cover and region coverage.

    Parameters:
    - month (int): The month (1-12) to check for available dates.
    - year (int): The year to check for available dates.
    - dataset_name (str): The name of the dataset to be queried (e.g., "Synthetic Aperture Radar - Sentinel 1").
    - extent (object): The geographical extent (boundary) to filter data by, in a format compatible with generate_bounding_box_points.
    - address (str): The Earth Engine ImageCollection address for the dataset.
    - cloud (int, optional): Maximum allowed cloud cover percentage (0-100). Default is None, indicating no specific cloud cover restriction.

    Returns:
    - list: A list of dates (datetime objects) where data is available for the specified criteria.
    """
    month = int(month)
    year = int(year)
    dates = []

    # Only proceed if the dataset is not "Daily Land Surface Temperature"
    if dataset_name != "Daily Land Surface Temperature":
        # Generate bounding box points from the extent for geographic filtering
        boundary = generate_bounding_box_points(extent)

        # Define a function to calculate the percentage of area covered within the boundary
        def calculate_percentage(image):
            """
            Calculates the percentage of an image's area that intersects with the specified boundary.
            Sets this percentage as metadata ("percentage_covered") on the image.

            Parameters:
            - image (ee.Image): The Earth Engine image to calculate coverage for.

            Returns:
            - ee.Image: The image with the "percentage_covered" property set.
            """
            intersection_area = image.geometry().intersection(boundary).area()
            total_area = boundary.area()
            percentage_covered = (intersection_area.divide(total_area)).multiply(100)
            return image.set("percentage_covered", percentage_covered)

        dates = []
        try:
            # Filter the main dataset based on cloud cover and boundary, with dataset-specific handling
            dataset_main = (
                ee.ImageCollection(address)
                .filter(
                    ee.Filter.lt(
                        "CLOUDY_PIXEL_PERCENTAGE", 100 if cloud is None else int(cloud)
                    )
                )
                .filterBounds(boundary)
                if dataset_name != "Synthetic Aperture Radar - Sentinel 1"
                else (
                    ee.ImageCollection(address)
                    .filterBounds(boundary)
                    .filter(
                        ee.Filter.listContains("transmitterReceiverPolarisation", "VV")
                    )
                    .filter(ee.Filter.eq("instrumentMode", "IW"))
                    .select("VV")
                    .map(
                        lambda image: image.updateMask(
                            image.mask().And((image.lt(-30.0).Not()))
                        )
                    )
                )
            )

            # If the dataset is not MODIS, calculate coverage percentage for filtering
            if address != "MODIS/061/MCD43A4":
                dataset_main = dataset_main.map(calculate_percentage)
                # Filter images to only include those covering at least 70% of the boundary
                dataset_main = dataset_main.filter(
                    ee.Filter.gte("percentage_covered", 70)
                )

            # Function to calculate and append valid dates based on dataset criteria
            def calculate_date(date):
                """
                Checks if data is available for a specific date and appends it to dates if available.

                Parameters:
                - date (datetime): The date to check availability for.
                """
                # Adjust date range for specific datasets
                start_date = (
                    date
                    if dataset_name != "30m Satellite data (Landsat 8)"
                    else date - timedelta(days=1)
                )
                end_date = date + timedelta(days=1)

                # Filter dataset by date range and check for available images
                dataset = dataset_main.filter(ee.Filter.date(start_date, end_date))
                if dataset.size().getInfo():  # If dataset has images for this date
                    print(date)
                    dates.append(date)

            # Use ThreadPoolExecutor for concurrent date checks
            with concurrent.futures.ThreadPoolExecutor() as executor:
                # Determine the number of days in the month
                days_in_month = calendar.monthrange(year, month)[1]
                start = datetime(year, month, 1)

                # Submit tasks for each day in the month to the executor
                futures = [
                    executor.submit(calculate_date, start + timedelta(days=n))
                    for n in range(days_in_month)
                ]
                concurrent.futures.wait(futures)

            return dates

        except Exception as e:
            traceback.print_exc()

        return dates


def generate_bounding_box_points(
    bounding_box,
):
    """
    Generates an Earth Engine polygon geometry from a bounding box.

    Parameters:
    - bounding_box (dict): A dictionary containing coordinates for the southwest and northeast corners of the bounding box.
      Example format:
      {
          "_southWest": {"lat": <latitude>, "lng": <longitude>},
          "_northEast": {"lat": <latitude>, "lng": <longitude>}
      }

    Returns:
    - ee.Geometry.Polygon: An Earth Engine polygon geometry object representing the bounding box.
    """
    # Extract southwest and northeast points from the bounding box
    south_west = bounding_box["_southWest"]
    north_east = bounding_box["_northEast"]

    # Define the four corners of the bounding box
    top_left = [north_east["lng"], south_west["lat"]]
    top_right = [north_east["lng"], north_east["lat"]]
    bottom_right = [south_west["lng"], north_east["lat"]]
    bottom_left = [south_west["lng"], south_west["lat"]]
   
    # Create and return the polygon geometry for the bounding box
    
    return ee.Geometry.Polygon(
        [top_left, top_right, bottom_right, bottom_left, top_left]
    )


# for landsat
def apply_scale_factors(
    image,
):
    """
    Apply scale factors to the optical and thermal bands of a given image.

    This function modifies the input image by applying specific scaling factors to
    the optical and thermal bands. The optical bands are scaled using a factor of
    0.0000275 and a bias of -0.2, while the thermal bands are scaled using a factor
    of 0.00341802 and a bias of 149.0. The modified bands are then added back to
    the original image.

    Args:
        image (ee.Image): The input image to which the scale factors will be applied.

    Returns:
        ee.Image: The modified image with the scaled optical and thermal bands added.
    """

    # Scale optical bands (SR_B.*)
    optical_bands = image.select("SR_B.*").multiply(0.0000275).add(-0.2)

    # Scale thermal bands (ST_B.*)
    thermal_bands = image.select("ST_B.*").multiply(0.00341802).add(149.0)

    # Add scaled optical and thermal bands to the original image
    return image.addBands(optical_bands, None, True).addBands(thermal_bands, None, True)


def get_clip_geo(
    type_name,
    names,
):
    """
    Retrieve geographical features based on the specified type and names.

    This function fetches a GeoJSON feature collection from the FAO Global Administrative Unit Layers (GAUL)
    dataset based on the provided type and corresponding names. The function supports three types of geographical
    entities: country ("cont"), state ("state"), and district ("dis"). Special handling is included for the
    regions of Jammu and Kashmir and Arunachal Pradesh in India.

    Args:
        type_name (str): The type of geographical entity to retrieve.
                         Options are "cont" for country, "state" for state, and "dis" for district.
        names (list): A list of names corresponding to the geographical entity.
                      For "cont", provide the country name.
                      For "state", provide the state name and country name.
                      For "dis", provide the district name, state name, and country name.

    Returns:
        ee.FeatureCollection: A feature collection representing the specified geographical area.
    """
    # Load the main feature collection for countries
    main = ee.FeatureCollection("FAO/GAUL/2015/level0")

    # Handle country level features
    if type_name == "cont":
        # Filter for the specified country name
        geoj = main.filterMetadata("ADM0_NAME", "equals", names[0])

        # Handle special cases for India
        geoj = (
            geoj.merge(main.filterMetadata("ADM0_NAME", "equals", "Jammu and Kashmir"))
            .merge(main.filterMetadata("ADM0_NAME", "equals", "Arunachal Pradesh"))
            .merge(main.filterMetadata("ADM0_NAME", "equals", "Aksai Chin"))
            .union()
            if names[0] == "India"
            else geoj
        )

    # Handle state level features
    elif type_name == "state":
        geoj = (
            ee.FeatureCollection("FAO/GAUL/2015/level1")
            .filterMetadata("ADM1_NAME", "equals", names[0])
            .filterMetadata("ADM0_NAME", "equals", names[1])
        )

        # Special handling for Jammu and Kashmir state
        if names[0] == "Jammu and Kashmir":
            geoj = (
                ee.FeatureCollection("FAO/GAUL/2015/level1")
                .filterMetadata("ADM0_NAME", "equals", "Jammu and Kashmir")
                .filterMetadata("ADM1_CODE", "not_equals", 40422)
                .union()
            )
        # Special handling for Ladakh
        elif names[0] == "Ladakh":
            geoj = (
                ee.FeatureCollection("FAO/GAUL/2015/level1")
                .filterMetadata("ADM0_NAME", "equals", "Jammu and Kashmir")
                .filterMetadata("ADM1_CODE", "equals", 40422)
                .merge(main.filterMetadata("ADM0_NAME", "equals", "Aksai Chin"))
                .union()
            )
        # Special handling for Arunachal Pradesh
        elif names[0] == "Arunachal Pradesh":
            geoj = geoj.merge(
                main.filterMetadata("ADM0_NAME", "equals", "Arunachal Pradesh")
            ).union()

    # Handle district level features
    elif type_name == "dis":
        geoj = (
            ee.FeatureCollection("FAO/GAUL/2015/level2")
            .filterMetadata("ADM2_NAME", "equals", names[0])
            .filterMetadata("ADM1_NAME", "equals", names[1])
            .filterMetadata("ADM0_NAME", "equals", names[2])
        )

    return geoj


def get_clip():
    """
    Load and return the boundary of India as an Earth Engine FeatureCollection.

    This function reads a shapefile containing the geographical boundaries of India,
    converts it to a GeoJSON format, and then creates an Earth Engine FeatureCollection
    from that GeoJSON.

    Returns:
        ee.FeatureCollection: A FeatureCollection representing the geographical boundaries of India.
    """
    # Read the shapefile containing India's geographical boundaries
    boundry_gdf = gpd.read_file("India_Country/India_Country.shp")

    # Convert the GeoDataFrame to a GeoJSON format and create an Earth Engine FeatureCollection
    geoj = ee.FeatureCollection(boundry_gdf.to_json())

    return geoj  # Return the FeatureCollection


def thres_change(
    aoi,
    date1,
    date2,
    slope_thresh=20,
    band_name="Gap_Filled_DNB_BRDF_Corrected_NTL",
    kernel_radius=5,
    sigma=0.89,
    k=0.28,
):
    date1 = datetime.strptime(date1, "%Y-%m-%dT%H:%M:%S.%fZ")
    date = date1.strftime("%Y-%m-%d")
    start_date = datetime.fromisoformat(date) + timedelta(days=1)
    end_date = datetime.fromisoformat(date) + timedelta(days=2)
    start_1 = start_date.strftime("%Y-%m-%d")
    end_1 = end_date.strftime("%Y-%m-%d")
    date2 = datetime.strptime(date2, "%Y-%m-%dT%H:%M:%S.%fZ")
    date = date2.strftime("%Y-%m-%d")
    start_date = datetime.fromisoformat(date) + timedelta(days=1)
    end_date = datetime.fromisoformat(date) + timedelta(days=2)
    start_2 = start_date.strftime("%Y-%m-%d")
    end_2 = end_date.strftime("%Y-%m-%d")
    print(start_1, end_1, start_2, end_2)

    aoi = ee.Geometry.Rectangle(aoi)

    def clip_image(image):
        return image.clip(aoi)

    # Cloud masking function for VIIRS
    def mask_clouds(image):
        cloud_mask = image.select("QF_Cloud_Mask").lt(300)
        return image.updateMask(cloud_mask)

    # Cloud masking function for Sentinel-2
    def mask_s2_clouds(image):
        qa = image.select("QA60")
        cloud_bit_mask = 1 << 10
        cirrus_bit_mask = 1 << 11
        mask = (
            qa.bitwiseAnd(cloud_bit_mask)
            .eq(0)
            .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
        )
        return image.updateMask(mask).divide(10000)

    # Slope mask function
    elevation = ee.Image("CGIAR/SRTM90_V4").select("elevation")
    slope = ee.Terrain.slope(elevation)
    roi = slope.clip(aoi)
    slope_thresh = 25
    slope_extract = roi.lt(slope_thresh)
    masked_slope = slope_extract.mask(slope_extract)

    # Function to apply slope mask to images
    def apply_slope_mask(image):
        return image.updateMask(masked_slope)

    # Function to compute temporal mean of a specific band
    def compute_temporal_mean(image_collection, band_name):
        return image_collection.select(band_name).mean()

    # VIIRS images for two periods
    image1 = (
        ee.ImageCollection("NOAA/VIIRS/001/VNP46A2")
        .filterDate(start_1, end_1)
        .map(clip_image)
        .map(mask_clouds)
        .map(apply_slope_mask)
    )

    image2 = (
        ee.ImageCollection("NOAA/VIIRS/001/VNP46A2")
        .filterDate(start_2, end_2)
        .map(clip_image)
        .map(mask_clouds)
        .map(apply_slope_mask)
    )

    # Sentinel-2 images for two periods
    masked_earlier = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(start_1, end_1)
        .mean()
        .clip(aoi)
    )

    masked_later = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(start_2, end_2)
        .mean()
        .clip(aoi)
    )

    # Select the desired band
    band_name = "Gap_Filled_DNB_BRDF_Corrected_NTL"

    # Compute temporal means for the filtered images for the specific band
    temporal_mean1 = compute_temporal_mean(image1, band_name)
    temporal_mean2 = compute_temporal_mean(image2, band_name)
    difference_temporal = temporal_mean2.subtract(temporal_mean1)

    # Define the Gaussian kernel parameters
    kernel_radius = 2
    sigma = 0.2
    k = 0.35

    # Create the Gaussian kernel
    gaussian_kernel = ee.Kernel.gaussian(kernel_radius, sigma)

    # Function to apply Gaussian smoothing and thresholding for NTL
    def apply_gaussian_threshold(image, band_name):
        smoothed = image.convolve(gaussian_kernel)

        mean = smoothed.reduceRegion(
            reducer=ee.Reducer.mean(), geometry=aoi, scale=500, bestEffort=True
        ).get(band_name)
        std_dev = smoothed.reduceRegion(
            reducer=ee.Reducer.stdDev(), geometry=aoi, scale=500, bestEffort=True
        ).get(band_name)
        print(mean.getInfo())
        mean_image = ee.Image.constant(mean.getInfo())

        std_dev_image = ee.Image.constant(std_dev.getInfo())
        threshold = mean_image.add(std_dev_image.multiply(k))

        return smoothed.gt(threshold)

    temp_difference_gaussian = apply_gaussian_threshold(difference_temporal, band_name)
    mask_tem_diff_gaussian = temp_difference_gaussian.eq(1)
    increase_temp_diff_gaussian = mask_tem_diff_gaussian.mask(mask_tem_diff_gaussian)

    # Calculate the difference between earlier and later imagery composites Sentinel-2
    def magnitude(image):
        return image.pow(2).reduce("sum").sqrt()

    difference = magnitude(masked_later.subtract(masked_earlier))

    # Function to apply Gaussian smoothing and thresholding for Sentinel-2
    def apply_gaussian_threshold_s2(image):
        smoothed_s2 = image.convolve(gaussian_kernel)

        mean_s2 = smoothed_s2.reduceRegion(
            reducer=ee.Reducer.mean(), geometry=aoi, scale=10, bestEffort=True
        ).get("sum")

        std_dev_s2 = smoothed_s2.reduceRegion(
            reducer=ee.Reducer.stdDev(), geometry=aoi, scale=10, bestEffort=True
        ).get("sum")
        print(mean_s2.getInfo())
        mean_image_s2 = ee.Image.constant(mean_s2.getInfo())
        std_dev_image_s2 = ee.Image.constant(std_dev_s2.getInfo())
        threshold_s2 = mean_image_s2.add(std_dev_image_s2.multiply(k))

        return smoothed_s2.gt(threshold_s2)

    S2_gaussian = apply_gaussian_threshold_s2(difference)
    s2_gau_diff = S2_gaussian.eq(1)
    S2_change_gau = s2_gau_diff.mask(s2_gau_diff)

    # Calculate NDVI and NDWI
    nir1 = masked_later.select("B8")
    red1 = masked_later.select("B4")
    green1 = masked_later.select("B3")
    ndvi2 = nir1.subtract(red1).divide(nir1.add(red1))
    ndwi2 = green1.subtract(nir1).divide(nir1.add(green1))

    # Create a mask for areas with NDVI greater than 0.3
    ndvi_mask = ndvi2.lt(0.1)
    ndwi_mask = ndwi2.lt(0.1)

    high_ndvi = ndvi_mask.updateMask(ndvi_mask)
    high_ndwi = ndwi_mask.updateMask(ndwi_mask)

    mask_difference_threshold_ndvi = S2_change_gau.updateMask(high_ndvi)
    masked_detections1 = mask_difference_threshold_ndvi.updateMask(high_ndwi)

    vectors = increase_temp_diff_gaussian.reduceToVectors(
        geometry=aoi, scale=30, maxPixels=1e10
    )

    common_change = masked_detections1.clip(vectors)
    image1 = image1.select(band_name)
    image2 = image2.select(band_name)

    return (
        get_url(common_change, {"palette": ["#FF0000"]}),
        get_url(masked_earlier, {"bands": ["B4", "B3", "B2"], "max": 4000, "min": 0.0}),
        get_url(masked_later, {"bands": ["B4", "B3", "B2"], "max": 4000, "min": 0.0}),
        get_url(
            image1,
            {
                "min": 0,
                "max": 20,
                "palette": [
                    "black",
                    "purple",
                    "cyan",
                    "green",
                    "yellow",
                    "red",
                    "white",
                ],
            },
        ),
        get_url(
            image2,
            {
                "min": 0,
                "max": 20,
                "palette": [
                    "black",
                    "purple",
                    "cyan",
                    "green",
                    "yellow",
                    "red",
                    "white",
                ],
            },
        ),
    )


def lulc(
    data,
):
    """
    Process Land Use Land Cover (LULC) and satellite imagery for a given area.

    This function retrieves LULC data and Sentinel-2 imagery for a specified time frame
    and area of interest. It calculates the area of different land cover classes and prepares
    visualizations for the results.

    Parameters:
        data (dict): A dictionary containing the following keys:
            - box (list): Coordinates for the bounding box (optional).
            - clip (list): Coordinates for the area to clip (optional).
            - layer (str): The name of the layer to fetch (optional).
            - dates (str): A timestamp indicating the date of interest.

    Returns:
        tuple: A tuple containing the following elements:
            - LULC visualization URL
            - Sentinel-2 RGB visualization URL
            - Sentinel-2 NIR visualization URL
            - Dictionary of areas for each land cover class.
    """
    # Define the geometry based on the provided bounding box or clipping area
    if "box" in data:
        box = ee.Geometry.Rectangle(data["box"])
    if "clip" in data:
        box = get_clip_geo(data["clip"][0], data["clip"][1])

    # Retrieve the specified layer from the WFS service
    if "layer" in data:
        work = "useruploads" if "upload" in data["layer"] else "VGT"
        url_wfs = f"https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{data['layer']}&srsname=EPSG:4326&outputFormat=application/json"
        headers = {"accept": "application/json", "content-type": "application/json"}
        response = requests.get(url_wfs, headers=headers, auth=AUTH)

        # Check if the request was successful
        if response.status_code == 200:
            geojson = json.loads(response.content)
            features = geojson["features"]
            ee_features = [ee.Feature(feature) for feature in features]
            feature_collection = ee.FeatureCollection(ee_features)
            box = feature_collection.geometry()

    # Parse the date from the data dictionary
    date1 = data["dates"]
    date1 = datetime.strptime(date1, "%Y-%m-%dT%H:%M:%S.%fZ")
    date = date1.strftime("%Y-%m-%d")
    start_date = datetime.fromisoformat(date) + timedelta(days=1)
    end_date = datetime.fromisoformat(date) + timedelta(days=7)
    start_1 = start_date.strftime("%Y-%m-%d")
    end_1 = end_date.strftime("%Y-%m-%d")
    aoi = box  # Area of Interest

    # Retrieve LULC data for the specified date range and area
    lulc = (
        ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
        .filterDate(start_1, end_1)
        .filterBounds(aoi)
        .mean()
        .clip(aoi)
        .select("label")
    )

    # Retrieve Sentinel-2 imagery for the same date range
    sat = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(start_1, end_1)
        .filterBounds(aoi)
        .mean()
        .clip(aoi)
    )

    def area_calculation(class_number):
        """
        Calculate the area of a specific land cover class.

        Parameters:
            class_number (int): The land cover class number to calculate the area for.

        Returns:
            ee.Number: The area of the specified class in square kilometers.
        """
        # Create a mask for the specified land cover class
        mask = lulc.eq(class_number)
        # Convert the mask to an image of pixel areas
        binary_img = mask.multiply(ee.Image.pixelArea()).divide(
            1000 * 1000
        )  # Convert to square kilometers
        # Calculate the total area for the class
        pixel_count = binary_img.reduceRegion(
            reducer=ee.Reducer.sum(), geometry=aoi, scale=10, maxPixels=1e13
        )
        area1 = pixel_count.get("label")
        area = ee.Number(area1)
        return area

    area = {}
    # Calculate the area for each land cover class (0 to 7)
    for i in range(8):
        try:
            area[i] = round(area_calculation(i).getInfo(), 2)
        except:
            pass
    # Sentinel-2 images for two periods
    print(area)
    # Return URLs for visualizations and area data
    return (
        get_url(
            lulc,
            {
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
            },
        ),
        get_url(sat, {"bands": ["B4", "B3", "B2"], "max": 4000, "min": 0.0}),
        get_url(sat, {"bands": ["B8", "B4", "B3"], "max": 4000, "min": 0.0}),
        area,
    )

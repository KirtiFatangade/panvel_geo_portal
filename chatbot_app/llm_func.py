import pandas as pd
import ee
from map_app.main_map.create_url import get_url

# from models import Feature
from datetime import datetime, timedelta
import requests
import json

# import concurrent.futures
# import calendar
# import geopandas as gpd
import os
from typing import List, Optional, Tuple, Dict, Any
from google.genai import types
from google import genai
import warnings

warnings.filterwarnings("ignore", message="Pydantic serializer warnings:")
# client = genai.Client()
required_parameter = {
    "10m Satellite data (Sentinel 2)": ["dataset_name", "dates"],
    "90m Digital Elevation Satellite data (SRTM)": ["dataset_name"],
    "Atmospheric Methane Concentration (Sentinel 5p)": ["dataset_name", "dates"],
    "Atmospheric CO Concentration (Sentinel-5P)": ["dataset_name", "dates"],
    "Synthetic Aperture Radar - Sentinel 1": ["dataset_name", "dates"],
    "MODIS RGB": ["dataset_name", "dates"],
    "Germany High-Res Image (20cm)": ["dataset_name"],
    "Global Digital Surface Model 30m": ["dataset_name"],
}

optional_parameter = {
    "10m Satellite data (Sentinel 2)": ["bands", "indices"],
    "90m Digital Elevation Satellite data (SRTM)": [],
    "Atmospheric Methane Concentration (Sentinel 5p)": [],
    "Atmospheric CO Concentration (Sentinel-5P)": [],
    "Synthetic Aperture Radar - Sentinel 1": [],
    "MODIS RGB": [],
    "Germany High-Res Image (20cm)": [],
    "Global Digital Surface Model 30m": [],
}

dir_path = "/home/service-vasundharaa/Desktop/vgt-geo-portal-web-app/config_files"
dataset_names_list = []
for file in os.listdir(dir_path):
    file_path = os.path.join(dir_path, file)
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
        dataset_names_list.extend(df["display_name"].tolist())

GEE_DATASETS_DF = pd.read_csv("config_files/geeDF.csv")
GEE_DATASETS_DF_DERIVE = pd.read_csv("config_files/geeDF_derive.csv")
GEE_DATASETS_DF_WEATHER = pd.read_csv("config_files/geeDF_weather.csv")
auth = ("admin", "geoserver")
palette_dict = {
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


def get_clip_geo(type_name, names):
    main = ee.FeatureCollection("FAO/GAUL/2015/level0")
    if type_name == "cont":
        geoj = main.filterMetadata("ADM0_NAME", "equals", names[0])
        geoj = (
            geoj.merge(main.filterMetadata("ADM0_NAME", "equals", "Jammu and Kashmir"))
            .merge(main.filterMetadata("ADM0_NAME", "equals", "Arunachal Pradesh"))
            .merge(main.filterMetadata("ADM0_NAME", "equals", "Aksai Chin"))
            .union()
            if names[0] == "India"
            else geoj
        )
    elif type_name == "state":
        geoj = (
            ee.FeatureCollection("FAO/GAUL/2015/level1")
            .filterMetadata("ADM1_NAME", "equals", names[0])
            .filterMetadata("ADM0_NAME", "equals", names[1])
        )
        if names[0] == "Jammu and Kashmir":
            geoj = (
                ee.FeatureCollection("FAO/GAUL/2015/level1")
                .filterMetadata("ADM0_NAME", "equals", "Jammu and Kashmir")
                .filterMetadata("ADM1_CODE", "not_equals", 40422)
                .union()
            )
        elif names[0] == "Ladakh":
            geoj = (
                ee.FeatureCollection("FAO/GAUL/2015/level1")
                .filterMetadata("ADM0_NAME", "equals", "Jammu and Kashmir")
                .filterMetadata("ADM1_CODE", "equals", 40422)
                .merge(main.filterMetadata("ADM0_NAME", "equals", "Aksai Chin"))
                .union()
            )
        elif names[0] == "Arunachal Pradesh":
            geoj = geoj.merge(
                main.filterMetadata("ADM0_NAME", "equals", "Arunachal Pradesh")
            ).union()
    elif type_name == "dis":
        geoj = (
            ee.FeatureCollection("FAO/GAUL/2015/level2")
            .filterMetadata("ADM2_NAME", "equals", names[0])
            .filterMetadata("ADM1_NAME", "equals", names[1])
            .filterMetadata("ADM0_NAME", "equals", names[2])
        )
    return geoj


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

    bound_list = [top_left, top_right, bottom_right, bottom_left, top_left]
    # Create and return the polygon geometry for the bounding box
    return bound_list


'''
def display_human_settlement_footprint(
    dataset_name: str,
    name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    print(
        "dataset_name :",
        dataset_name,
        "name :",
        name,
        "dates :",
        dates,
        "bands :",
        bands,
        "indices :",
        indices,
        "grad :",
        grad,
        "clip :",
        clip,
        "bound :",
        bound,
        "box :",
        box,
        "layer :",
        layer,
    )
    """
    Displays the human settlement footprint based on the provided dataset name and optional parameters.

    Args:
        dataset_name (str): Name of the dataset to be used (e.g., 'Human Settlement Footprint').
        name (str): Dataset category name (e.g., 'open', 'weather').
        dates (list, optional): Dates for filtering the dataset. Defaults to None.
        bands (list, optional): Bands to be used for visualization. Defaults to None.
        indices (list, optional): Indices to apply for the dataset analysis (e.g., NDVI). Defaults to None.
        grad (list, optional): Gradient range for visualization. Defaults to None.
        clip : Coordinates to clip the dataset to a specific boundary. Defaults to None.
        bound (str, optional): Boundary type for clipping (e.g., 'Country', 'State'). Defaults to None.
        box : Bounding box for the dataset. Defaults to None.
        layer (str, optional): Layer to be used from the dataset. Defaults to None.

    Returns:
        dict: A dictionary containing the URL for the visualized human settlement footprint and metadata.
        
    Raises:
        Exception: Returns an error message if there are any issues with processing.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specific geographical area.
        - If the `dataset_name` is 'Human Settlement Footprint', it fetches the WSF2015 dataset.
        - If `indices` is provided, the dataset will be processed using normalized difference for the specified index.
        - Other optional parameters are extracted only if they are mentioned by the user.
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if dataset_name == "Human Settlement Footprint":
            dataset = ee.Image("DLR/WSF/WSF2015/v1")
            vis_params = {"min": 0, "max": 255, "opacity": 0.75}
            image = ee.Image(0).blend(dataset)
            image = image.clipToCollection(geoj) if clip else image
            if indices:
                print(indices)
                image = dataset.mean().normalizedDifference(indices)
            else:
                image = dataset.mean()
            return (
                get_url(image, vis_params),
                start,
                geoj.getInfo()["features"] if clip else None,
            )


def display_global_digital_surface_model(
    dataset_name: str,
    name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Displays the global digital surface model (DSM) based on the provided dataset name and optional parameters.

    Args:
        dataset_name (str): Name of the dataset to be used (e.g., 'Global Digital Surface Model 30m').
        dates (list,optional):Dates for filtering the dataset.
        name (str): Dataset category name (e.g., 'open', 'weather').
        bands (list, optional): Bands to be used for visualization. Defaults to None.
        indices (list, optional): Indices to apply for the dataset analysis (e.g., NDVI). Defaults to None.
        grad (list, optional): Gradient range for visualization. Defaults to None.
        clip : Coordinates to clip the dataset to a specific boundary. Defaults to None.
        bound (str, optional): Boundary type for clipping (e.g., 'Country', 'State'). Defaults to None.
        box : Bounding box for the dataset. Defaults to None.
        layer (str, optional): Layer to be used from the dataset. Defaults to None.

    Returns:
        dict: A dictionary containing the URL for the visualized global digital surface model, clipping details,
              dataset metadata, and visualization parameters.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specified geographical area.
        - If `dataset_name` is 'Global Digital Surface Model 30m', the function fetches the GLO30 dataset.
        - Visualization parameters include a color palette, min and max elevation values.
        - If `indices` is provided, a normalized difference is applied to the dataset.
        - Returns the URL for the visualization along with clipping and dataset information.
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if dataset_name == "Global Digital Surface Model 30m":
            dataset = ee.ImageCollection("COPERNICUS/DEM/GLO30")
            vis_params = {
                "min": 0.0,
                "max": 1000.0,
                "palette": ["0000ff", "00ffff", "ffff00", "ff0000", "ffffff"],
            }
            image = dataset.select("DEM")
            image = image.clipToCollection(geoj) if clip else image
            if indices:
                print(indices)
                image = dataset.mean().normalizedDifference(indices)
            else:
                image = dataset.mean()
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


def display_Rivers_of_World(
    dataset_name: str,
    name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Displays river datasets based on the provided dataset name and optional parameters.

    Args:
        dataset_name (str): Name of the dataset to be used (e.g., 'Rivers of World', 'Indian Watersheds and Rivers').
        dates (list,optional):Dates for filtering the dataset.
        name (str): Dataset category name (e.g., 'open', 'weather').
        bands (list, optional): Bands to be used for visualization. Defaults to None.
        indices (list, optional): Indices to apply for dataset analysis (e.g., normalized difference). Defaults to None.
        grad (list, optional): Gradient range for visualization. Defaults to None.
        clip (tuple, optional): Coordinates to clip the dataset to a specific boundary. Defaults to None.
        bound (str, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset. Defaults to None.
        layer (str, optional): Specific layer from the dataset to be visualized (e.g., 'useruploads'). Defaults to None.

    Returns:
        dict: A dictionary containing the URL(s) for the visualized river dataset, clipping details, and relevant dataset metadata.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specified geographical area using `get_clip_geo()`.
        - Filters the dataset based on the provided name (`open`, `weather`, or derived datasets) and fetches records accordingly.
        - For 'Rivers of World' and 'Indian Watersheds and Rivers', the function fetches river data from WWF/HydroSHEDS and visualizes it.
        - If `box` is provided, the dataset is filtered to fit the bounding box.
        - The function handles fetching layer-specific information if the `layer` parameter is provided (using a request to the geoserver).
        - Applies river filtering based on the river order (`RIV_ORD`) and renders them using a specified color palette.
        - If `indices` are provided, normalized difference calculations are applied to the dataset.
        - Returns a list of URLs for each river level visualization, as well as additional metadata about the clipped dataset if applicable.
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if (
            dataset_name == "Rivers of World"
            or dataset_name == "Indian Watersheds and Rivers"
        ):
            if dataset_name == "Indian Watersheds and Rivers":
                # clipper=get_clip()
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
                url_get_layer = f"https://portal.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{layer}"
                print(url_get_layer)
                headers = {
                    "accept": "application/json",
                    "content-type": "application/json",
                }
                response = requests.get(url_get_layer, headers=headers, auth=auth)
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
                if indices:
                    print(indices)
                image = dataset.mean().normalizedDifference(indices)
            else:
                image = dataset.mean()
                url.append(get_url(image, vis_params))
            return (
                url,
                start,
                geoj.getInfo()["features"] if clip and bound else None,
            )


def display_Nighttime_Data_VIIRS(
    dataset_name: str,
    dates: List[str],
    name: str,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Displays nighttime satellite data using the VIIRS (Visible Infrared Imaging Radiometer Suite) dataset.

    Args:
        dataset_name (str): The name of the dataset to be used (e.g., 'Nighttime Data (VIIRS)').
        dates (list,optional):Dates for filtering the dataset.
        name (str): Dataset category name (e.g., 'open', 'weather', or derived datasets).
        bands (list, optional): Bands to be used for visualization. Defaults to None.
        indices (list, optional): Indices for normalized difference calculations (e.g., NDVI). Defaults to None.
        grad (list, optional): Gradient range for visualization. Defaults to None.
        clip (tuple, optional): Coordinates to clip the dataset to a specific boundary. Defaults to None.
        bound (str, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset. Defaults to None.
        layer (str, optional): Specific layer to visualize from the dataset. Defaults to None.

    Returns:
        dict: A dictionary containing the URL for the visualized nighttime dataset, date ranges, image metadata, visualization parameters, and address.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specified geographical boundary using `get_clip_geo()`.
        - The function filters the dataset based on the provided name (e.g., 'open', 'weather') and extracts corresponding records.
        - For the 'Nighttime Data (VIIRS)' dataset, the function retrieves VIIRS nighttime lights data from the NOAA VIIRS DNB MONTHLY collection.
        - The function generates a time range for the dataset (2 days starting from the provided date).
        - Visualizes the dataset using the `avg_rad` (average radiance) band, applying specific visualization parameters for brightness.
        - If `indices` are provided, the function applies a normalized difference calculation on the dataset.
        - Returns the URL for visualization, the start date, and additional information such as image metadata and visualization parameters.
    """
    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if dataset_name == "Nighttime Data (VIIRS)":
            start_date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
            end_date = start_date + timedelta(days=2)
            start = start_date.strftime("%Y-%m-%d")
            end = end_date.strftime("%Y-%m-%d")
            # dataset = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG').filter(ee.Filter.date(start_date_str, end_date_str))
            dataset = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG").filterDate(
                start, end
            )

            image = dataset.select("avg_rad")
            if indices:
                print(indices)
                image = dataset.mean().normalizedDifference(indices)
            else:
                image = dataset.mean()
            vis_params = {"min": -2, "max": 340574}
            return (
                get_url(image, vis_params),
                start,
                None,
                image,
                vis_params,
                res_dict[0]["address"],
            )


def display_Country_Boundaries(
    dataset_name: str,
    name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Displays country boundary data from the specified dataset using Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset to be used (e.g., 'Country Boundaries').
        dates (list,optional):Dates for filtering the dataset.
        name (str): Dataset category name (e.g., 'open', 'weather', or derived datasets).
        bands (list, optional): Bands to be used for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer to visualize from the dataset (unused in this function). Defaults to None.

    Returns:
        dict: A dictionary containing the URL for the visualized country boundaries and optional geographical data.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specified geographical boundary using `get_clip_geo()`.
        - The function checks the dataset name for country, state, or district boundaries and applies appropriate clipping styles (transparent fill, black boundary lines).
        - The dataset is filtered based on the provided `name` (e.g., 'open', 'weather'), which refers to the type of dataset being accessed.
        - For 'Country Boundaries', the function retrieves the dataset from the FAO/GAUL SIMPLIFIED 500m collection (2015) in Google Earth Engine.
        - If `clip` is provided, the dataset is filtered to match the clipping boundary.
        - The function returns the URL for visualization, the start date (if applicable), and geographic feature data (if `clip` and `bound` are provided).
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if dataset_name == "Country Boundaries":
            dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0")
            dataset = dataset.filterBounds(geoj) if clip else dataset
            dataset = dataset.style(fillColor="0000", color="black", width=1.0)

            return (
                get_url(dataset, {}),
                start,
                geoj.getInfo()["features"] if clip and bound else None,
            )


def display_State_Boundaries(
    dataset_name: str,
    name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Displays state boundary data from the specified dataset using Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset to be used (e.g., 'State Boundaries').
        name (str): Dataset category name (e.g., 'open', 'weather', or derived datasets).
        dates (list, optional): A list containing start and end dates (unused in this function). Defaults to None.
        bands (list, optional): Bands to be used for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer to visualize from the dataset (unused in this function). Defaults to None.

    Returns:
        dict: A dictionary containing the URL for the visualized state boundaries and optional geographical data.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specified geographical boundary using `get_clip_geo()`.
        - The function checks the dataset name for country, state, or district boundaries and applies appropriate clipping styles (transparent fill, black boundary lines).
        - The dataset is filtered based on the provided `name` (e.g., 'open', 'weather'), which refers to the type of dataset being accessed.
        - For 'State Boundaries', the function retrieves the dataset from the FAO/GAUL SIMPLIFIED 500m collection (2015) in Google Earth Engine.
        - If `clip` is provided, the dataset is filtered to match the clipping boundary.
        - The function returns the URL for visualization, the start date (if applicable), and geographic feature data (if `clip` and `bound` are provided).
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if dataset_name == "State Boundaries":
            dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level1")
            dataset = dataset.filterBounds(geoj) if clip else dataset
            dataset = dataset.style(fillColor="0000", color="black", width=1.0)
            return (
                get_url(dataset, {}),
                start,
                geoj.getInfo()["features"] if clip and bound else None,
            )


def display_District_Boundaries(
    dataset_name: str,
    name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Displays district boundary data from the specified dataset using Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset to be used (e.g., 'District Boundaries').
        dates (list, optional): A list containing start and end dates (unused in this function). Defaults to None.
        name (str): Dataset category name (e.g., 'open', 'weather', or derived datasets).
        bands (list, optional): Bands to be used for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer to visualize from the dataset (unused in this function). Defaults to None.

    Returns:
        dict: A dictionary containing the URL for the visualized district boundaries and optional geographical data.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specified geographical boundary using `get_clip_geo()`.
        - The function checks the dataset name for country, state, or district boundaries and applies appropriate clipping styles (transparent fill, black boundary lines).
        - The dataset is filtered based on the provided `name` (e.g., 'open', 'weather'), which refers to the type of dataset being accessed.
        - For 'District Boundaries', the function retrieves the dataset from the FAO/GAUL SIMPLIFIED 500m collection (2015) in Google Earth Engine.
        - If `clip` is provided, the dataset is filtered to match the clipping boundary.
        - The function returns the URL for visualization, the start date (if applicable), and geographic feature data (if `clip` and `bound` are provided).
    """
    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if dataset_name == "District Boundaries":
            dataset = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2")
            dataset = dataset.filterBounds(geoj) if clip else dataset
            dataset = dataset.style(fillColor="0000", color="black", width=1.0)
            return (
                get_url(dataset, {}),
                start,
                geoj.getInfo()["features"] if clip and bound else None,
            )


def display_Germany_High_Res_Image_20cm(
    dataset_name: str,
    name: str,
    date: Optional[str] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Displays high-resolution imagery (20cm) of Germany from the specified dataset using Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset to be used (e.g., 'Germany High-Res Image (20cm)').
        dates (list, optional): A list containing start and end dates (unused in this function). Defaults to None.
        name (str): Dataset category name (e.g., 'open', 'weather', or derived datasets).
        bands (list, optional): Bands to be used for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer to visualize from the dataset (unused in this function). Defaults to None.

    Returns:
        dict: A dictionary containing the URL for the visualized high-resolution image and optional geographical data.

    Notes:
        - If `clip` is provided, the dataset will be clipped to the specified geographical boundary using `get_clip_geo()`.
        - The function checks the dataset name for country, state, or district boundaries and applies appropriate clipping styles (transparent fill, black boundary lines).
        - The dataset is filtered based on the provided `name` (e.g., 'open', 'weather'), which refers to the type of dataset being accessed.
        - For 'Germany High-Res Image (20cm)', the function retrieves the dataset from the specified source (Germany/Brandenburg orthos 20cm) in Google Earth Engine.
        - The function returns the URL for visualization, the start date (if applicable), and geographic feature data (if `clip` and `bound` are provided).
    """
    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if res_dict[0]["is_image"] == 1:
        if dataset_name == "Germany High-Res Image (20cm)":
            dataset = ee.Image("Germany/Brandenburg/orthos/20cm")
            return (
                get_url(dataset, {}),
                start,
                geoj.getInfo()["features"] if clip and bound else None,
            )


def m30_Satellite_data_Landsat_8(
    dataset_name: str,
    dates: List[str],
    name: str,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays Landsat 8 satellite data, specifically using the M30 dataset, from Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset (e.g., 'Landsat 8').
        dates (list): A list of start and end dates to filter the satellite imagery collection.
        name (str): Dataset category name (e.g., 'open', 'weather', or derived datasets).
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image.
            - str: The start date for the dataset.
            - list: Geographic feature data (if `clip` and `bound` are provided).
            - ee.Image: The processed image.
            - dict: Visualization parameters such as `min` and `max` values.
            - str: Address of the dataset used.

    Notes:
        - The function uses Google Earth Engine to retrieve Landsat 8 data.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - The dataset name is checked to confirm whether it relates to country, state, or district boundaries.
        - It retrieves the imagery dataset and applies a date filter based on the `dates` argument.
        - If the end date is not provided (`dates[1] == None`), the function computes a default range of 30 days from the start date.
        - The image is filtered based on the dataset's address and filtered for the `LST_Night_1km` band, which is averaged to create a final image.
        - The function returns the URL for visualization, the start date, geographic feature data (if available), the processed image, visualization parameters, and the dataset address.
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if dates[1] == None:
        date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start_date = start_date - timedelta(days=1)
        end_date = end_date + timedelta(days=29)

        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")

    try:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(start, end)
        )
        new_image = dataset.select("LST_Night_1km")
        image = new_image.mean()
        return (
            get_url(image, {"min": -25, "max": 5}),
            start,
            geoj.getInfo()["features"] if clip and bound else None,
            image,
            {"min": -25, "max": 5},
            res_dict[0]["address"],
        )
    except Exception as e:
        print(e)


def Daily_Land_Surface_Temperature(
    dataset_name: str,
    dates: List[str],
    name: str,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays daily land surface temperature data from the specified dataset using Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset (e.g., 'Landsat 8').
        dates (list): A list of start and end dates to filter the satellite imagery collection.
        name (str): Dataset category name (e.g., 'open', 'weather', or derived datasets).
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image.
            - str: The start date for the dataset.
            - list: Geographic feature data (if `clip` and `bound` are provided).
            - ee.Image: The processed image.
            - dict: Visualization parameters such as `min` and `max` values.
            - str: Address of the dataset used.

    Notes:
        - The function uses Google Earth Engine to retrieve daily land surface temperature data.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - The dataset name is checked to confirm whether it relates to country, state, or district boundaries.
        - It retrieves the imagery dataset and applies a date filter based on the `dates` argument.
        - If the end date is not provided (`dates[1] == None`), the function computes a default range of 30 days from the start date.
        - The image is filtered based on the dataset's address and filtered for the land surface temperature band, which is averaged to create a final image.
        - The function returns the URL for visualization, the start date, geographic feature data (if available), the processed image, visualization parameters, and the dataset address.
    """
    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if dates[1] == None:
        date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start_date = start_date - timedelta(days=1)
        end_date = end_date + timedelta(days=29)

        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(start, end)
        )
    else:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(dates[0], dates[1])
        )
        new_image = dataset.select("LST_Night_1km")
    if indices:
        print(indices)
        image = dataset.mean().normalizedDifference(indices)
    else:
        image = dataset.mean()

    try:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(start, end)
        )
        new_image = dataset.select("LST_Night_1km")
    except Exception as e:
        print(e)

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    if res_dict[0]["bands"] != "-1":
        if bands:
            try:
                vis_params["bands"] = [
                    bands["dropdown1"],
                    bands["dropdown2"],
                    bands["dropdown3"],
                ]
            except:
                vis_params["bands"] = [
                    bands[0],
                    bands[1],
                    bands[2],
                ]
        else:
            vis_params["bands"] = eval(res_dict[0]["bands"])
    if res_dict[0]["palette"] != "-1":
        vis_params["palette"] = eval(res_dict[0]["palette"])

    if res_dict[0]["gamma"]:
        vis_params["gamma"] = int(res_dict[0]["gamma"])

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
        image = new_image.mean()
    try:
        image = image.clipToCollection(geoj) if clip else image
        image = image.clip(ee.Geometry.Rectangle(box)) if box else image
        if layer:
            work = "useruploads" if "upload" in layer else "VGT"
            url_wfs = f"https://portal.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
            print(url_wfs)

            headers = {"accept": "application/json", "content-type": "application/json"}
            response = requests.get(url_wfs, headers=headers, auth=auth)

            if response.status_code == 200:
                geojson = json.loads(response.content)
                features = geojson["features"]
                ee_features = [ee.Feature(feature) for feature in features]
                feature_collection = ee.FeatureCollection(ee_features)
                merged_geometry = feature_collection.geometry()
                image = image.clip(merged_geometry)
        vis_params = (
            {"min": -1, "max": 1, "palette": palette_dict[grad]}
            if indices
            else vis_params
        )
        # if dataset_name == "Daily Land Surface Temperature":
        image = image.multiply(0.02).subtract(273.15)

        return (
            get_url(image, vis_params),
            start,
            geoj.getInfo()["features"] if clip and bound else None,
            image,
            vis_params,
            res_dict[0]["address"],
        )
    except Exception as e:
        print(e)


def display_global_slope_map(
    dataset_name: str,
    name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays a global slope map from the specified dataset using Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset (e.g., 'Global Slope').
        name (str): Dataset category name (e.g., 'elevation', 'terrain', or derived datasets).
        dates (list, optional): A list of start and end dates to filter the satellite imagery collection. Defaults to None.
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized slope map.
            - list: Geographic feature data (if `clip` and `bound` are provided).
            - ee.Image: The processed image.
            - dict: Visualization parameters such as `min` and `max` values.
            - str: Address of the dataset used.

    Notes:
        - The function uses Google Earth Engine to retrieve global slope data.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - The dataset name is checked to confirm whether it relates to country, state, or district boundaries.
        - If the `dates` argument is provided, it filters the imagery dataset based on the specified date range.
        - The image is processed based on the dataset's address and visualized with default parameters or custom visualization parameters (if provided).
        - The function returns the URL for visualization, geographic feature data (if available), the processed image, visualization parameters, and the dataset address.
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if name == "open":
        filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    elif name == "weather":
        filtered_df = GEE_DATASETS_DF_WEATHER[
            GEE_DATASETS_DF_WEATHER["display_name"] == dataset_name
        ]
    else:
        filtered_df = GEE_DATASETS_DF_DERIVE[
            GEE_DATASETS_DF_DERIVE["display_name"] == dataset_name
        ]
    res_dict = filtered_df.to_dict(orient="records")
    if dates[1] == None:
        date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start_date = start_date - timedelta(days=1)
        end_date = end_date + timedelta(days=29)

        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(start, end)
        )
    else:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(dates[0], dates[1])
        )
        new_image = dataset.select("LST_Night_1km")
    if indices:
        print(indices)
        image = dataset.mean().normalizedDifference(indices)
    else:
        image = dataset.mean()

    try:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(start, end)
        )
        new_image = dataset.select("LST_Night_1km")
    except Exception as e:
        print(e)

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    if res_dict[0]["bands"] != "-1":
        if bands:
            try:
                vis_params["bands"] = [
                    bands["dropdown1"],
                    bands["dropdown2"],
                    bands["dropdown3"],
                ]
            except:
                vis_params["bands"] = [
                    bands[0],
                    bands[1],
                    bands[2],
                ]
        else:
            vis_params["bands"] = eval(res_dict[0]["bands"])
    if res_dict[0]["palette"] != "-1":
        vis_params["palette"] = eval(res_dict[0]["palette"])

    if res_dict[0]["gamma"]:
        vis_params["gamma"] = int(res_dict[0]["gamma"])

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
        image = new_image.mean()
    try:
        image = image.clipToCollection(geoj) if clip else image
        image = image.clip(ee.Geometry.Rectangle(box)) if box else image
        if layer:
            work = "useruploads" if "upload" in layer else "VGT"
            url_wfs = f"https://portal.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
            print(url_wfs)

            headers = {"accept": "application/json", "content-type": "application/json"}
            response = requests.get(url_wfs, headers=headers, auth=auth)

            if response.status_code == 200:
                geojson = json.loads(response.content)
                features = geojson["features"]
                ee_features = [ee.Feature(feature) for feature in features]
                feature_collection = ee.FeatureCollection(ee_features)
                merged_geometry = feature_collection.geometry()
                image = image.clip(merged_geometry)
        vis_params = (
            {"min": -1, "max": 1, "palette": palette_dict[grad]}
            if indices
            else vis_params
        )
        # if dataset_name == "Daily Land Surface Temperature":
        image = ee.Terrain.slope(image.select(["elevation"]))

        return (
            get_url(image, vis_params),
            start,
            geoj.getInfo()["features"] if clip and bound else None,
            image,
            vis_params,
            res_dict[0]["address"],
        )
    except Exception as e:
        print(e)
'''


def display_10m_satellite_sentinel_2data(
    dataset_name: str,
    dates: List[str],
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[List[List[float]]] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    print(
        "dataset_name :",
        dataset_name,
        "dates :",
        dates,
        "bands :",
        bands,
        "indices :",
        indices,
        "grad :",
        grad,
        "clip :",
        clip,
        "bound :",
        bound,
        "box :",
        box,
        "layer :",
        layer,
    )

    if bound:
        bound = ee.Geometry.Polygon(bound)

    if len(dates) == 1:
        dates.append(None)

    start = ""
    filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    res_dict = filtered_df.to_dict(orient="records")

    if clip:
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if dates[1] == None:
        date = datetime.strptime(dates[0], "%d/%m/%Y")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")
        try:
            dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
                ee.Filter.date(start, end)
            )
        except Exception as e:
            print(e)
    else:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(dates[0], dates[1])
        )
        start = dates[0]

    if indices:
        print(indices)
        image = dataset.mean().normalizedDifference(indices)
    else:
        image = dataset.mean()

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    if bands:
        try:
            vis_params["bands"] = [
                bands["dropdown1"],
                bands["dropdown2"],
                bands["dropdown3"],
            ]
        except:
            vis_params["bands"] = [
                bands[0],
                bands[1],
                bands[2],
            ]
    else:
        vis_params["bands"] = eval(res_dict[0]["bands"])

    print(f"vis params: {vis_params}")

    send_data = (
        get_url(image, vis_params),
        start,
        geoj.getInfo()["features"] if clip and bound else None,
        image,
        vis_params,
        res_dict[0]["address"],
    )
    print("send_data", send_data)
    if send_data[0]:
        name = f"{dataset_name}"
        if dates and dates[0] is not None:
            name = (
                name
                + f"_{datetime.strptime(dates[0], '%d/%m/%Y').strftime('%Y-%m-%d')}"
            )
        resp = {"data": [{"type": "url", "data": send_data[0], "name": name}]}
        return resp


'''
def display_90m_digital_elevation_satellite_data(
    dataset_name: str,
    dates: List[str],
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays display_90m_digital_elevation_satellite data from Google Earth Engine based on the specified dataset.

    Args:
        dataset_name (str): The name of the dataset (e.g., "10m Satellite data (Sentinel 2)","90m Digital Elevation Satellite data (SRTM)","Synthetic Aperture Radar - Sentinel 1","MODIS RGB","Forest Fire Visualization (SWIR)","Global Waterbodies and Change")
        dates (list): A list of start and end dates to filter the satellite imagery collection.
        id (str): Identifier for the dataset (unused for certain datasets; assigned within the function).
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image or geographical boundary.
            - str: The start date for the dataset (if available).

    Notes:
        - The function uses Google Earth Engine to retrieve various open-source satellite datasets.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - Specific styles are applied if the dataset corresponds to country, state, or district boundaries.
        - For certain datasets (e.g., Sentinel 2, SRTM, MODIS RGB), the `id` is adjusted internally to match the dataset's ID on Google Earth Engine.
        - The function returns the URL for visualization and the start date, along with styled geographical boundaries if clipping is applied.
    """

    start = ""
    filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    res_dict = filtered_df.to_dict(orient="records")

    if clip:
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    image = ee.Image(res_dict[0]["address"])

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    if bands:
        try:
            vis_params["bands"] = [
                bands["dropdown1"],
                bands["dropdown2"],
                bands["dropdown3"],
            ]
        except:
            vis_params["bands"] = [
                bands[0],
                bands[1],
                bands[2],
            ]
    else:
        vis_params["bands"] = eval(res_dict[0]["bands"])

    return (
        get_url(image, {"min": -25, "max": 5}),
        start,
        geoj.getInfo()["features"] if clip and bound else None,
        image,
        {"min": -25, "max": 5},
        res_dict[0]["address"],
    )


def display_synthetic_apreture_radar_sentinel_1_data(
    dataset_name: str,
    dates: List[str],
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays synthetic apreture radar (sentinel-1) data from Google Earth Engine based on the specified dataset.

    Args:
        dataset_name (str): The name of the dataset (e.g., "10m Satellite data (Sentinel 2)","90m Digital Elevation Satellite data (SRTM)","Synthetic Aperture Radar - Sentinel 1","MODIS RGB","Forest Fire Visualization (SWIR)","Global Waterbodies and Change")
        dates (list): A list of start and end dates to filter the satellite imagery collection.
        id (str): Identifier for the dataset (unused for certain datasets; assigned within the function).
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image or geographical boundary.
            - str: The start date for the dataset (if available).

    Notes:
        - The function uses Google Earth Engine to retrieve various open-source satellite datasets.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - Specific styles are applied if the dataset corresponds to country, state, or district boundaries.
        - For certain datasets (e.g., Sentinel 2, SRTM, MODIS RGB), the `id` is adjusted internally to match the dataset's ID on Google Earth Engine.
        - The function returns the URL for visualization and the start date, along with styled geographical boundaries if clipping is applied.
    """

    start = ""
    filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    res_dict = filtered_df.to_dict(orient="records")

    if clip:
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if dates[1] == None:
        date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")
        try:
            dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
                ee.Filter.date(start, end)
            )
            # new_image = dataset.select("LST_Night_1km")

        except Exception as e:
            print(e)
    else:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(dates[0], dates[1])
        )
        start = dates[0]

    if indices:
        print(indices)
        image = dataset.mean().normalizedDifference(indices)
    else:
        image = dataset.mean()

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    vis_params["bands"] = eval(res_dict[0]["bands"])

    return (
        get_url(image, {"min": -25, "max": 5}),
        start,
        geoj.getInfo()["features"] if clip and bound else None,
        image,
        {"min": -25, "max": 5},
        res_dict[0]["address"],
    )


def display_modis_rgb_data(
    dataset_name: str,
    dates: List[str],
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays modis rgb data from Google Earth Engine based on the specified dataset.

    Args:
        dataset_name (str): The name of the dataset (e.g., "10m Satellite data (Sentinel 2)","90m Digital Elevation Satellite data (SRTM)","Synthetic Aperture Radar - Sentinel 1","MODIS RGB","Forest Fire Visualization (SWIR)","Global Waterbodies and Change")
        dates (list): A list of start and end dates to filter the satellite imagery collection.
        id (str): Identifier for the dataset (unused for certain datasets; assigned within the function).
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image or geographical boundary.
            - str: The start date for the dataset (if available).

    Notes:
        - The function uses Google Earth Engine to retrieve various open-source satellite datasets.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - Specific styles are applied if the dataset corresponds to country, state, or district boundaries.
        - For certain datasets (e.g., Sentinel 2, SRTM, MODIS RGB), the `id` is adjusted internally to match the dataset's ID on Google Earth Engine.
        - The function returns the URL for visualization and the start date, along with styled geographical boundaries if clipping is applied.
    """

    start = ""
    filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    res_dict = filtered_df.to_dict(orient="records")

    if clip:
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if dates[1] == None:
        date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")
        try:
            dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
                ee.Filter.date(start, end)
            )

        except Exception as e:
            print(e)

    else:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(dates[0], dates[1])
        )
        start = dates[0]

    if indices:
        print(indices)
        image = dataset.mean().normalizedDifference(indices)
    else:
        image = dataset.mean()

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    if bands:
        try:
            vis_params["bands"] = [
                bands["dropdown1"],
                bands["dropdown2"],
                bands["dropdown3"],
            ]
        except:
            vis_params["bands"] = [
                bands[0],
                bands[1],
                bands[2],
            ]
    else:
        vis_params["bands"] = eval(res_dict[0]["bands"])

    vis_params["gamma"] = int(res_dict[0]["gamma"])

    return (
        get_url(image, {"min": -25, "max": 5}),
        start,
        geoj.getInfo()["features"] if clip and bound else None,
        image,
        {"min": -25, "max": 5},
        res_dict[0]["address"],
    )


def display_forest_fire_data(
    dataset_name: str,
    dates: List[str],
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays forest fire data from Google Earth Engine based on the specified dataset.

    Args:
        dataset_name (str): The name of the dataset (e.g., "10m Satellite data (Sentinel 2)","90m Digital Elevation Satellite data (SRTM)","Synthetic Aperture Radar - Sentinel 1","MODIS RGB","Forest Fire Visualization (SWIR)","Global Waterbodies and Change")
        dates (list): A list of start and end dates to filter the satellite imagery collection.
        id (str): Identifier for the dataset (unused for certain datasets; assigned within the function).
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image or geographical boundary.
            - str: The start date for the dataset (if available).

    Notes:
        - The function uses Google Earth Engine to retrieve various open-source satellite datasets.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - Specific styles are applied if the dataset corresponds to country, state, or district boundaries.
        - For certain datasets (e.g., Sentinel 2, SRTM, MODIS RGB), the `id` is adjusted internally to match the dataset's ID on Google Earth Engine.
        - The function returns the URL for visualization and the start date, along with styled geographical boundaries if clipping is applied.
    """

    start = ""
    filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    res_dict = filtered_df.to_dict(orient="records")

    if clip:
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if dates[1] == None:
        date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")
        try:
            dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
                ee.Filter.date(start, end)
            )

        except Exception as e:
            print(e)

    else:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(dates[0], dates[1])
        )
        start = dates[0]

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    vis_params["bands"] = eval(res_dict[0]["bands"])

    image = dataset.mean()

    return (
        get_url(image, {"min": -25, "max": 5}),
        start,
        geoj.getInfo()["features"] if clip and bound else None,
        image,
        {"min": -25, "max": 5},
        res_dict[0]["address"],
    )


def display_global_waterbodies_and_change_data(
    dataset_name: str,
    dates: List[str],
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays global waterbodies and change data from Google Earth Engine based on the specified dataset.

    Args:
        dataset_name (str): The name of the dataset (e.g., "10m Satellite data (Sentinel 2)","90m Digital Elevation Satellite data (SRTM)","Synthetic Aperture Radar - Sentinel 1","MODIS RGB","Forest Fire Visualization (SWIR)","Global Waterbodies and Change")
        dates (list): A list of start and end dates to filter the satellite imagery collection.
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image or geographical boundary.
            - str: The start date for the dataset (if available).

    Notes:
        - The function uses Google Earth Engine to retrieve various open-source satellite datasets.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - Specific styles are applied if the dataset corresponds to country, state, or district boundaries.
        - For certain datasets (e.g., Sentinel 2, SRTM, MODIS RGB), the `id` is adjusted internally to match the dataset's ID on Google Earth Engine.
        - The function returns the URL for visualization and the start date, along with styled geographical boundaries if clipping is applied.
    """

    start = ""
    filtered_df = GEE_DATASETS_DF[GEE_DATASETS_DF["display_name"] == dataset_name]
    res_dict = filtered_df.to_dict(orient="records")

    if clip:
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if dates[1] == None:
        date = datetime.strptime(dates[0], "%Y-%m-%dT%H:%M:%S.%fZ")
        date = date.strftime("%Y-%m-%d")
        start_date = datetime.fromisoformat(date) + timedelta(days=1)
        end_date = datetime.fromisoformat(date) + timedelta(days=2)
        start = start_date.strftime("%Y-%m-%d")
        end = end_date.strftime("%Y-%m-%d")
        try:
            dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
                ee.Filter.date(start, end)
            )

        except Exception as e:
            print(e)

    else:
        dataset = ee.ImageCollection(res_dict[0]["address"]).filter(
            ee.Filter.date(dates[0], dates[1])
        )
        start = dates[0]

    vis_params = {
        "min": float(res_dict[0]["min"]),
        "max": float(res_dict[0]["max"]),
    }

    vis_params["bands"] = eval(res_dict[0]["bands"])

    image = dataset.mean()

    return (
        get_url(image, {"min": -25, "max": 5}),
        start,
        geoj.getInfo()["features"] if clip and bound else None,
        image,
        {"min": -25, "max": 5},
        res_dict[0]["address"],
    )


def display_global_digital_surface_model_30m(
    dataset_name: str,
    dates: Optional[List[str]] = None,
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays the Global Digital Surface Model (30m resolution) dataset from Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset (e.g., 'Global Digital Surface Model').
        dates (list, optional): A list of start and end dates to filter the dataset. Defaults to None.
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized Global Digital Surface Model.
            - str: The start date for the dataset (if available).
            - ee.Image: The processed image.
            - dict: Visualization parameters such as `min` and `max` values.
            - str: Address of the dataset used.

    Notes:
        - The function uses Google Earth Engine to retrieve the Global Digital Surface Model at a 30m resolution.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - The function applies filters based on dates if provided.
        - The function returns the URL for visualization, the start date, the processed image, and visualization parameters.
    """
    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if dataset_name == "Global Digital Surface Model 30m":
        dataset = ee.ImageCollection("COPERNICUS/DEM/GLO30")
        vis_params = {
            "min": 0.0,
            "max": 1000.0,
            "palette": ["0000ff", "00ffff", "ffff00", "ff0000", "ffffff"],
        }
        image = dataset.select("DEM")
        image = image.clipToCollection(geoj) if clip else image
        if layer:
            work = "useruploads" if "upload" in layer else "VGT"
            url_wfs = f"https://portal.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename={work}:{layer}&srsname=EPSG:4326&outputFormat=application/json"
            print(url_wfs)

            headers = {"accept": "application/json", "content-type": "application/json"}
            response = requests.get(url_wfs, headers=headers, auth=auth)

            if response.status_code == 200:
                geojson = json.loads(response.content)
                features = geojson["features"]
                ee_features = [ee.Feature(feature) for feature in features]
                feature_collection = ee.FeatureCollection(ee_features)
                merged_geometry = feature_collection.geometry()
                image = image.clip(merged_geometry)
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


def display_indian_watersheds_and_rivers(
    dataset_name: str,
    dates: List[str],
    bands: Optional[List[str]] = None,
    indices: Optional[List[str]] = None,
    grad: Optional[List[str]] = None,
    clip: Optional[List[str]] = None,
    bound: Optional[dict] = None,
    box: Optional[List[float]] = None,
    layer: Optional[str] = None,
) -> dict:
    """
    Retrieves and displays the Indian watersheds and rivers dataset from Google Earth Engine.

    Args:
        dataset_name (str): The name of the dataset (e.g., 'Indian Watersheds and Rivers').
        dates (list): A list of start and end dates to filter the dataset.
        id (str): The specific ID or address of the dataset.
        bands (list, optional): Bands for visualization (unused in this function). Defaults to None.
        indices (list, optional): Indices for specific calculations (unused in this function). Defaults to None.
        grad (list, optional): Gradient range for visualization (unused in this function). Defaults to None.
        bound (dict, optional): Coordinates to clip the dataset to a specific geographical boundary. Defaults to None.
        clip (tuple, optional): Boundary type for clipping (e.g., 'Country', 'State', 'District'). Defaults to None.
        box (list, optional): Bounding box for the dataset (unused in this function). Defaults to None.
        layer (str, optional): Specific layer for visualization from the dataset (unused in this function). Defaults to None.

    Returns:
        tuple: A tuple containing:
            - str: URL for the visualized image.
            - str: The start date for the dataset.
            - ee.Image: The processed image.
            - dict: Visualization parameters such as `min` and `max` values.
            - str: Address of the dataset used.

    Notes:
        - The function uses Google Earth Engine to retrieve Indian watersheds and rivers data.
        - If `clip` is provided, it clips the dataset to the specified geographical boundary using `get_clip_geo()`.
        - The dataset is filtered based on dates and the provided `id`.
        - The function returns the URL for visualization, the start date, the processed image, and visualization parameters.
    """

    start = ""
    if clip:
        print(clip)
        geoj = get_clip_geo(clip[0], clip[1])
        if (
            (dataset_name == "Country Boundaries" and clip[0] == "cont")
            or (dataset_name == "State Boundaries" and clip[0] == "state")
            or (dataset_name == "District Boundaries" and clip[0] == "dis")
        ):
            geoj = geoj.style(fillColor="0000", color="black", width=1.0)
            return get_url(geoj, {}), start

    if (
        dataset_name == "Rivers of World"
        or dataset_name == "Indian Watersheds and Rivers"
    ):
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
        dataset = dataset.filterBounds(ee.Geometry.Rectangle(box)) if box else dataset
        if layer:
            work = "useruploads" if "upload" in layer else "VGT"
            url_get_layer = f"https://portal.vasundharaa.in/geoserver/rest/workspaces/{work}/featuretypes/{layer}"
            print(url_get_layer)
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
            }
            response = requests.get(url_get_layer, headers=headers, auth=auth)
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
'''

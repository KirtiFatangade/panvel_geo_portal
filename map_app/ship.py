from .od_infer_radar_saar_ship_detection import get_detections
from .main_map.segment import bbox_to_tiff
import ee
from datetime import datetime, timedelta
from .main_map.create_url import get_url
import random
import string
import os
import geopandas as gpd
import json
def generate_random_string(length=6):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

def perform_detect(date, box):

    date = datetime.strptime(date, "%Y-%m-%dT%H:%M:%S.%fZ")
    date = date.strftime("%Y-%m-%d")
    start_date = datetime.fromisoformat(date) + timedelta(days=1)
    end_date = datetime.fromisoformat(date) + timedelta(days=2)
    start = start_date.strftime("%Y-%m-%d")
    end = end_date.strftime("%Y-%m-%d")

    dataset = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(ee.Geometry.Rectangle(box))
        .filterDate(start, end)
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .select("VV")
        # .map(lambda image: image.updateMask(image.mask().And((image.lt(-30.0).Not()))))
    )
    dataset=dataset.mean().clipToCollection(ee.FeatureCollection(ee.Geometry.Rectangle(box)))

    url=get_url(dataset,{"min": -25, "max": 5})
    print(url)
    name=generate_random_string()+".tif"
    bbox_to_tiff(box,url=url,name=name,zoom=20)

    get_detections(name)
    OUTPUT_DIR = os.path.join(os.getcwd(), "OUTPUT_DIR_SHIP")
    geojson_file_path = f"{OUTPUT_DIR}/{name.split('.')[0]}_output.geojson"
    gdf=gpd.read_file(geojson_file_path)
    os.remove(name)
    os.remove(f"{OUTPUT_DIR}/{name.split('.')[0]}_output.geojson")
    return json.loads(gdf.to_json()),url,start


    


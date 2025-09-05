import zipfile
import uuid
import os
from .geoserver_func import upload_file_to_geoserver
from osgeo import gdal, ogr
from shapely.geometry import Point
import geopandas as gpd
import pandas as pd
import shutil

GEOJSON_CONV_LIST = ["shp", "prj", "dbf", "shx"]

def conver_zip_shp(path, filename, lat=None, long=None):
    try:
        if filename.endswith(".kml") or filename.endswith(".kmz"):
            input_file = os.path.join(path, filename)
            output_file = os.path.join(path, filename.split(".")[0] + ".shp")
            input_ds = ogr.Open(input_file)
            layer = input_ds.GetLayer()
            driver = ogr.GetDriverByName("ESRI Shapefile")
            output_ds = driver.CreateDataSource(output_file)
            output_layer = output_ds.CopyLayer(layer, f'{filename.split(".")[0]}')
            input_ds = None
            output_ds = None
        if filename.endswith(".csv"):
            data = pd.read_csv(os.path.join(path, filename))
            geometry = [Point(xy) for xy in zip(data[lat], data[long])]
            data_gdf = gpd.GeoDataFrame(data, geometry=geometry, crs="EPSG:4326")
            data_gdf.to_file(filename=os.path.join(path, filename.split(".")[0] + ".shp"), driver='ESRI Shapefile')
        if filename.endswith(".geojson"):
            gdal.SetConfigOption("SHAPE_ENCODING", "UTF-8")
            srcDS = gdal.OpenEx(os.path.join(path, filename))
            gdal.VectorTranslate(os.path.join(path, filename.split(".")[0] + ".shp"), srcDS, format='ESRI Shapefile')

        output_dir = os.path.join(path, filename.split(".")[0])
        os.makedirs(output_dir, exist_ok=True)

        for ext in GEOJSON_CONV_LIST:
            src_file = os.path.join(path, f'{filename.split(".")[0]}.{ext}')
            if os.path.exists(src_file):
                shutil.move(src_file, os.path.join(output_dir, f'{filename.split(".")[0]}.{ext}'))
        os.remove(os.path.join(path, filename))
        return output_dir
    except Exception as e:
        print(e)
        return False

def count_shp_files_folder(folder_path):
    names = {}
    for file in os.listdir(folder_path):
        if file.endswith(".shp"):
            shp_name_without_ext = os.path.splitext(file)[0]
            name = "upload_" + uuid.uuid4().hex[:6] + "_" + shp_name_without_ext
            names[shp_name_without_ext] = name
    return names

def count_shp_files_zip(path):
    names = {}
    with zipfile.ZipFile(path, "r") as zfile:
        for file_info in zfile.infolist():
            if file_info.filename.endswith(".shp"):
                shp_name_without_ext = os.path.splitext(os.path.basename(file_info.filename))[0]
                name = "upload_" + uuid.uuid4().hex[:6] + "_" + shp_name_without_ext
                names[shp_name_without_ext] = name
    return names

def upload_files(names):
    metadata = []
    for name in names.keys():
        print(name)
        data = upload_file_to_geoserver(os.path.join('/v1-data/useruploads', names[name]), names[name])
        if data:
            metadata.append({"id": data[0], "name": name, "type": "vector", "bounds": data[1]})
    return metadata

def handle_mul_shp(path):
    metadata = []
    try:
        names = count_shp_files_zip(path)
        print(names)
        with zipfile.ZipFile(path, "r") as zfile:
            for file_info in zfile.infolist():
                base_name = os.path.splitext(os.path.basename(file_info.filename))[0]
                if base_name in names.keys() and "." not in base_name:
                    dir_path = os.path.join('/v1-data/useruploads', names[base_name])
                    if not os.path.exists(dir_path):
                        os.makedirs(dir_path, exist_ok=True)
                    content = zfile.read(file_info.filename)
                    new_file_path = os.path.join(dir_path, names[base_name] + os.path.splitext(file_info.filename)[1])
                    with open(new_file_path, "wb") as new_file:
                        new_file.write(content)
        metadata = upload_files(names)
        print(metadata)
        return metadata
    except Exception as e:
        print(e)
        pass

def handle_mul_shp_folder(path):
    metadata = {}
    try:
        names = count_shp_files_folder(path)
        print(names)
        for file in os.listdir(path):
            base_name = file.split(".")[0]
            if "." in base_name:
                continue
            if base_name in names.keys():
                dir_path = os.path.join('/v1-data/useruploads', names[base_name])
                if not os.path.exists(dir_path):
                    os.makedirs(dir_path, exist_ok=True)
                file_path = os.path.join(path, file)
                new_file_path = os.path.join(dir_path, names[base_name] + os.path.splitext(file)[1])
                shutil.copyfile(file_path, new_file_path)
        print("complete")
        metadata = upload_files(names)
        return metadata
    except Exception as e:
        print(e)
        pass

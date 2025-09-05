import os
import json
import torch
import shutil
import tempfile
import rasterio
import numpy as np
import geopandas as gpd
import rasterio as rio
from ultralytics import YOLO
from rasterio.transform import from_origin
from rasterio.windows import Window
from shapely.geometry import Polygon, mapping
import ast


def get_device():
    if torch.cuda.is_available():
        return 0
    elif torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def xyxy_to_xywh(
    bbox,
):
    x1, y1, x2, y2 = bbox
    width = x2 - x1
    height = y2 - y1
    x_center = x1 + width / 2
    y_center = y1 + height / 2
    return [x_center, y_center, width, height]


def normalize_bbox_coordinates_xywh(
    polygon,
    image_shape,
):
    _, height, width = image_shape
    normalized_coord = [[x / width, y / height] for (x, y) in polygon]
    return normalized_coord


def unnormalize_coordinates(polygon, image_shape):
    image_height, image_width = image_shape
    polygon = ast.literal_eval(polygon)
    unnormalized_polygon = [
        [point[0] * image_width, point[1] * image_height] for point in polygon
    ]
    return unnormalized_polygon


def force_rgb(
    image_path,
):
    data = rio.open(image_path)
    dataset = data.read(1)
    with rio.open(
        fp=image_path,
        mode="w",
        driver="GTiff",
        width=data.shape[1],
        height=data.shape[0],
        count=3,
        crs=data.crs,
        transform=data.transform,
        dtype=data.meta["dtype"],
    ) as dst:
        dst.write(dataset, 3)
        dst.write(dataset, 2)
        dst.write(dataset, 1)
    dst.close()


def convert_to_three_band(input_file):
    temp_dir = tempfile.mkdtemp()
    temp_output = os.path.join(temp_dir, "temp_output.tif")

    with rasterio.open(input_file) as src:
        bands_to_read = [1, 2, 3]
        band_data = src.read(bands_to_read)
        profile = src.profile
        profile.update(count=3)

        with rasterio.open(temp_output, "w", **profile) as dst:
            dst.write(band_data)

    shutil.move(temp_output, input_file)
    shutil.rmtree(temp_dir)


def contrast_stretch(band):
    low, high = np.percentile(band, (2, 98))
    stretched = np.interp(band, (low, high), (0, 255))
    return stretched.astype(np.uint8)


def convert_to_8bit(
    input_file,
):
    temp_dir = tempfile.mkdtemp()
    temp_output = os.path.join(temp_dir, "temp_output.tif")

    try:
        with rasterio.open(input_file) as src:
            profile = src.profile
            profile.update(dtype=rasterio.uint8, count=src.count)

            with rasterio.open(temp_output, "w", **profile) as dst:
                for i in range(1, src.count + 1):
                    band = src.read(i, masked=True)
                    stretched_band = contrast_stretch(band)

                    dst.write(stretched_band, i)
        shutil.move(temp_output, input_file)
    finally:
        shutil.rmtree(temp_dir)


def patch_(
    image_file_path,
    patch_size,
    tif_patches_dir_path,
    mod_image_file_path,
):
    with rasterio.open(image_file_path) as src:
        metadata = src.meta
        image_array = src.read()
        old_shape = image_array.shape
        height, width = src.height, src.width
        left_border = (patch_size[1] - (width % patch_size[1])) % patch_size[1]
        bottom_border = (patch_size[0] - (height % patch_size[0])) % patch_size[0]
        padded_width = width
        padded_height = height
        if left_border != 0 or bottom_border != 0:
            padded_width = width + left_border
            padded_height = height + bottom_border
            padded_image = np.pad(
                image_array,
                ((0, 0), (0, bottom_border), (0, left_border)),
                constant_values=0,
            )
            image_array = padded_image
            new_shape = image_array.shape
            metadata["height"] = padded_height
            metadata["width"] = padded_width
            transform = metadata["transform"]
            left_padding = transform[0]
            bottom_padding = transform[3]
            transform = from_origin(
                transform[2] + left_padding,
                transform[5] - bottom_padding - bottom_border * abs(transform[4]),
                transform[0],
                abs(transform[4]),
            )
            with rasterio.open(mod_image_file_path, "w", **metadata) as dst:
                dst.write(image_array)
                dst.transform = transform

        for i in range(0, padded_height, patch_size[0]):
            for j in range(0, padded_width, patch_size[1]):
                patch = image_array[:, i : i + patch_size[0], j : j + patch_size[1]]
                patch_profile = metadata.copy()
                patch_profile["width"] = patch_size[1]
                patch_profile["height"] = patch_size[0]
                patch_profile["transform"] = rasterio.windows.transform(
                    Window(j, i, patch_size[1], patch_size[0]), src.transform
                )
                patch_path = os.path.join(tif_patches_dir_path, f"patch_{i}_{j}.tif")
                with rasterio.open(patch_path, "w", **patch_profile) as patch_dst:
                    patch_dst.write(patch)
        return old_shape, new_shape


def unpatch_(
    image_file_path,
    output_image_file_path,
    new_shape,
    patch_size,
    patch_files_dir_path,
):
    with rasterio.open(image_file_path) as src:
        crs = src.crs
        transform = src.transform

        n_c, new_image_height, new_image_width = new_shape
        output_image = np.zeros((3, new_image_height, new_image_width), dtype=np.uint8)

        for i in range(0, new_image_height, patch_size[0]):
            for j in range(0, new_image_width, patch_size[1]):
                patch_file_path = os.path.join(
                    patch_files_dir_path, f"predict/patch_{i}_{j}.tif"
                )
                if os.path.exists(patch_file_path):
                    with rasterio.open(patch_file_path) as patch:
                        patch_array = patch.read()
                        output_image[
                            :, i : i + patch_size[0], j : j + patch_size[1]
                        ] = patch_array

        with rasterio.open(
            output_image_file_path,
            "w",
            driver="GTiff",
            width=output_image.shape[2],
            height=output_image.shape[1],
            count=output_image.shape[0],
            dtype=output_image.dtype,
            crs=crs,
            transform=transform,
        ) as dst:
            dst.write(output_image)


def make_predictions(
    weight_file_path,
    tif_patches_dir_path,
    inferenced_tif_patches_dir_path,
    image_shape,
    detections_file_path,
):
    model = YOLO(weight_file_path)
    results = model(
        source=tif_patches_dir_path,
        stream=True,
        device=get_device(),
        save=True,
        project=inferenced_tif_patches_dir_path,
        exist_ok=True,
        conf=0.3,
        iou=0.5,
        boxes=False,
    )
    with open(detections_file_path, "w") as detections_file:
        all_preds = []
        for result in results:
            name = result.path
            image_name = "".join(name.split(os.path.sep)[-1].split(".")[:-1])
            y_height, x_width = map(int, image_name.split("_")[1:])
            for i in range(len(result)):
                cls = result.boxes.cls.cpu().numpy()[i]
                polygon = result.masks.xy[i]
                polygon_coords = [
                    (int(x + x_width), int(y + y_height)) for x, y in polygon
                ]
                # print("polygon corrd", polygon_coords)
                normalized_coord = normalize_bbox_coordinates_xywh(
                    polygon_coords, image_shape
                )
                yolo_coord = f"{int(cls)} {normalized_coord}"
                all_preds.append(yolo_coord)
        detections_file.write("\n".join(all_preds) + "\n")
        # with open(detections_file_path, 'r') as file:
        # # Read lines until the desired row
        #     for current_row, line in enumerate(file, start=1):
        #         if current_row == 3:
        #             # return line.strip()
        #             print(line.strip())


def make_vector_files(
    detections_file_path,
    output_geojson_path,
    output_shapefile_path,
    image_file_path,
):
    features = []
    with rasterio.open(image_file_path) as src:
        crs = src.crs.to_string()
        transform = src.transform
        image_height, image_width = src.height, src.width

    with open(detections_file_path, "r") as yolo_file:
        lines = yolo_file.readlines()

        for line in lines:
            data = line.strip().split()

            if len(data) > 2:
                class_label = data[0]
                coordinates_str = " ".join(data[1:])
                unnormalize_coords = unnormalize_coordinates(
                    coordinates_str, [image_height, image_width]
                )
                # polygon_coords = ast.literal_eval(unnormalize_coords)
                polygon = Polygon(unnormalize_coords)
                transformed_coordinates = [
                    transform * (x, y) for x, y in polygon.exterior.coords
                ]
                transformed_polygon = Polygon(transformed_coordinates)
                feature = {
                    "type": "Feature",
                    "properties": {"class": class_label},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [list(transformed_polygon.exterior.coords)],
                    },
                    "style": {"fill": "red", "stroke-width": "1", "fill-opacity": 0.6},
                }
                features.append(feature)

    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
        "crs": {"type": "name", "properties": {"name": crs}},
    }
    with open(output_geojson_path, "w") as output_file:
        json.dump(feature_collection, output_file)

    gdf = gpd.read_file(output_geojson_path)
    gdf.to_file(output_shapefile_path, driver="ESRI Shapefile")


class_options_to_detect = None
INPUT_IMG = "ToSeg.tif"
INPUT_IMG_PADDED = "input_image_padded.tif"
PATCH_SIZE = (640, 640)
PATCH_IMAGES_DIR = os.path.join(os.getcwd(), "media", "PATCH_IMAGES_DIR")
INFERENCED_IMAGES_DIR = os.path.join(os.getcwd(), "media", "INFERENCED_IMAGES_DIR")
OUTPUT_DIR = os.path.join("media", "OUTPUT")

shape_file_path = "output.shp"
os.makedirs(PATCH_IMAGES_DIR, exist_ok=True)
os.makedirs(INFERENCED_IMAGES_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


weight_dict = {
    "roads": "best_roads_and_tracks_seg.pt",
    "roads": "best_roads_and_tracks_seg.pt",
}


def get_segment(path=INPUT_IMG, classes=None):
    print(path)
    print(classes)
    weigth_path = None
    if "buildings" in classes:
        weigth_path = "./media/weight_files/buildings_yolov8m.pt"
    elif "roads_and_tracks" in classes:
        weigth_path = "./media/weight_files/roads_&_tracks_yolov8m.pt"
    detections_file_path = os.path.join(OUTPUT_DIR, f"{path.split('.')[0]}.txt")
    shutil.rmtree(PATCH_IMAGES_DIR)
    shutil.rmtree(INFERENCED_IMAGES_DIR)
    if os.path.exists(detections_file_path):
        os.remove(detections_file_path)
    os.makedirs(PATCH_IMAGES_DIR, exist_ok=True)
    os.makedirs(INFERENCED_IMAGES_DIR, exist_ok=True)
    old_shape, new_shape = patch_(path, PATCH_SIZE, PATCH_IMAGES_DIR, INPUT_IMG_PADDED)

    make_predictions(
        weigth_path,
        PATCH_IMAGES_DIR,
        INFERENCED_IMAGES_DIR,
        old_shape,
        detections_file_path,
    )

    unpatch_(
        path,
        f"{OUTPUT_DIR}/output_image.tif",
        new_shape,
        PATCH_SIZE,
        os.path.join(INFERENCED_IMAGES_DIR, "predict"),
    )

    geojson_file_path = os.path.join(OUTPUT_DIR, f"{path.split('.')[0]}.geojson")

    make_vector_files(detections_file_path, geojson_file_path, shape_file_path, path)
    if os.path.exists(path):
        os.remove(path)
    return geojson_file_path

import os
import cv2
import math
import json
import numpy as np
from PIL import Image
from ultralytics import YOLO
import geopandas as gpd
import rasterio
import torch

from rasterio.windows import Window
from rasterio.transform import from_origin
import shutil


def get_device():
    if torch.cuda.is_available():
        return 0
    elif torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def read_tif_file(image_file_path):
    image = Image.open(image_file_path)
    image_data = np.array(image)
    rgb_image = image_data[:, :, :3]
    img_array = np.moveaxis(rgb_image, 0, 2)
    img_array = np.uint8(rgb_image)
    return img_array


def patch_(
    image_file_path,
    patch_size,
    patch_files_dir_path,
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
            # with rasterio.open(mod_image_file_path, "w", **metadata) as dst:
            # dst.write(image_array)
            # dst.transform = transform

        for i in range(0, padded_height, patch_size[0]):
            for j in range(0, padded_width, patch_size[1]):
                patch = image_array[:, i : i + patch_size[0], j : j + patch_size[1]]
                patch_profile = metadata.copy()
                patch_profile["width"] = patch_size[1]
                patch_profile["height"] = patch_size[0]
                patch_profile["transform"] = rasterio.windows.transform(
                    Window(j, i, patch_size[1], patch_size[0]), src.transform
                )
                patch_path = os.path.join(patch_files_dir_path, f"patch_{i}_{j}.tif")
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
        print("nccccccccccccccccccccc", n_c)
        output_image = np.zeros(
            (n_c, new_image_height, new_image_width), dtype=np.uint8
        )

        for i in range(0, new_image_height, patch_size[0]):
            for j in range(0, new_image_width, patch_size[1]):
                patch_file_path = os.path.join(
                    patch_files_dir_path, f"patch_{i}_{j}.tif"
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
    bbox,
    image_shape,
):
    height, width = image_shape
    bbox[0] /= width
    bbox[1] /= height
    bbox[2] /= width
    bbox[3] /= height
    return bbox


def unnormalize_coordinates_xywh_xyxy(
    x_norm,
    y_norm,
    width_norm,
    height_norm,
    image_shape,
):
    image_height, image_width = image_shape
    x = x_norm * image_width
    y = y_norm * image_height
    width = width_norm * image_width
    height = height_norm * image_height
    x1 = x - width / 2
    y1 = y - height / 2
    x2 = x + width / 2
    y2 = y + height / 2
    return x1, y1, x2, y2


def make_vector_files(
    yolo_labels_path,
    output_geojson_path,
    image_file_path,
):
    features = []
    with rasterio.open(image_file_path) as src:
        # crs = rasterio.crs.CRS({"init": "epsg:4326"})
        crs = src.crs.to_string()
        transform = src.transform
        image_height, image_width = src.height, src.width

    with open(yolo_labels_path, "r") as yolo_file:
        lines = yolo_file.readlines()

        for line in lines:
            data = line.strip().split()
            if len(data) == 5:
                class_label = data[0]
                x_center, y_center, width, height = map(float, data[1:5])
                x1, y1, x2, y2 = unnormalize_coordinates_xywh_xyxy(
                    x_center, y_center, width, height, [image_height, image_width]
                )
                transformed_x1, transformed_y1 = transform * (x1, y1)
                transformed_x2, transformed_y2 = transform * (x2, y2)

                feature = {
                    "type": "Feature",
                    "properties": {"class": class_label},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [transformed_x1, transformed_y1],
                                [transformed_x2, transformed_y1],
                                [transformed_x2, transformed_y2],
                                [transformed_x1, transformed_y2],
                                [transformed_x1, transformed_y1],
                            ]
                        ],
                    },
                    "style": {"fill": "red", "stroke-width": "7", "fill-opacity": 0.6},
                }
                features.append(feature)

    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
        "crs": {"type": "name", "properties": {"name": crs}},
    }
    with open(output_geojson_path, "w") as output_file:
        json.dump(feature_collection, output_file)

    # gdf = gpd.read_file(output_geojson_path)
    # gdf.to_file(output_shapefile_path, driver="ESRI Shapefile")


def make_predictions(
    weight_file_path,
    class_options_to_detect,
    tif_patches_dir_path,
    image_shape,
    detections_file_path,
):
    model = YOLO(weight_file_path)

    results = model(
        source=tif_patches_dir_path,
        stream=True,
        device=get_device(),
        save=False,
        exist_ok=True,
        conf=0.3,
        iou=0.6,
        classes=class_options_to_detect,
    )
    with open(detections_file_path, "w") as detections_file:
        all_preds = []
        for result in results:
            boxes = result.boxes
            name = result.path
            image_name = "".join(name.split(os.path.sep)[-1].split(".")[:-1])
            for i in range(len(result)):
                bbox_coords = (
                    str(boxes.xyxy.cpu().numpy().astype(int)[i])
                    .lstrip("[")
                    .rstrip("]")
                    .replace("  ", " ")
                )
                cls = result.boxes.cls.cpu().numpy()[i]
                xmin, ymin, xmax, ymax = map(int, bbox_coords.split())
                y_height, x_width = map(int, image_name.split("_")[1:])
                xmin_, ymin_, xmax_, ymax_ = (
                    xmin + x_width,
                    ymin + y_height,
                    xmax + x_width,
                    ymax + y_height,
                )
                x_center, y_center, width, height = xyxy_to_xywh(
                    [xmin_, ymin_, xmax_, ymax_]
                )
                x_center, y_center, width, height = normalize_bbox_coordinates_xywh(
                    [x_center, y_center, width, height],
                    [image_shape[1], image_shape[2]],
                )
                # print(x_center, y_center, width, height)
                yolo_cxywh = f"{int(cls)} {x_center} {y_center} {width} {height}"
                # print(yolo_cxywh)
                all_preds.append(yolo_cxywh)
        detections_file.write("\n".join(all_preds) + "\n")


weigth_path = "best_n_model.pt"
class_options_to_detect = None


def get_detections(image_path):
    INPUT_IMG = image_path
    # INPUT_IMG_PADDED = "input_image_padded.tif"
    PATCH_SIZE = (640, 640)
    PATCH_IMAGES_DIR = os.path.join(os.getcwd(), "media", "PATCH_IMAGES_DIR_SHIP")
    # INFERENCED_IMAGES_DIR = os.path.join(os.getcwd(), "INFERENCED_IMAGES_DIR")
    OUTPUT_DIR = os.path.join(os.getcwd(), "media", "OUTPUT_DIR_SHIP")
    detections_file_path = f"{OUTPUT_DIR}/{image_path.split('.')[0]}_label.txt"
    geojson_file_path = f"{OUTPUT_DIR}/{image_path.split('.')[0]}_output.geojson"
    # shape_file_path = f"{OUTPUT_DIR}/output.shp"
    os.makedirs(PATCH_IMAGES_DIR, exist_ok=True)
    # os.makedirs(INFERENCED_IMAGES_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    old_shape, new_shape = patch_(INPUT_IMG, PATCH_SIZE, PATCH_IMAGES_DIR)
    print(old_shape, new_shape)

    make_predictions(
        weigth_path,
        class_options_to_detect,
        PATCH_IMAGES_DIR,
        old_shape,
        detections_file_path,
    )
    make_vector_files(detections_file_path, geojson_file_path, INPUT_IMG)
    os.remove(detections_file_path)
    shutil.rmtree(PATCH_IMAGES_DIR)

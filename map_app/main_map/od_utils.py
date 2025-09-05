import os
import json
import geopandas as gpd
from ultralytics import YOLO
import shutil

from .common_funcs import *


CLASS_DICT = {
    "emplacements": 0,
    "tanks": 1,
    "plane": 2,
    "warship": 3,
    "oil tanker": 4,
    "helicopter": 5,
    "artigun": 6,
    "vehicles": 7,
    "tent": 8,
}
CME_OD_WEIGHT_FILE_PATH = "./media/weight_files/cme_od.pt"
CLASS_OPTIONS_TO_DETECT = None
INPUT_IMG = "ToSeg.tif"
INPUT_IMG_PADDED = "input_image_padded.tif"
PATCH_SIZE = (640, 640)

PATCH_IMAGES_DIR = os.path.join(os.getcwd(), "media", "PATCH_IMAGES_DIR")
INFERENCED_IMAGES_DIR = os.path.join(os.getcwd(), "media", "INFERENCED_IMAGES_DIR")
OUTPUT_DIR = os.path.join("media", "OUTPUT")
os.makedirs(PATCH_IMAGES_DIR, exist_ok=True)
os.makedirs(INFERENCED_IMAGES_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def normalize_bbox_coordinates_xywh(
    bbox,
    image_shape,
):
    """
    Normalizes bounding box coordinates to the range [0, 1] based on image dimensions.

    Args:
        bbox (list): Bounding box in the format (x_center, y_center, width, height).
        image_shape (tuple): Shape of the image as (height, width).

    Returns:
        list: Normalized bounding box coordinates.
    """
    height, width = image_shape
    bbox[0] /= width  # Normalize x_center
    bbox[1] /= height  # Normalize y_center
    bbox[2] /= width  # Normalize width
    bbox[3] /= height  # Normalize height
    return bbox


def unnormalize_coordinates_xywh_xyxy(
    x_norm,
    y_norm,
    width_norm,
    height_norm,
    image_shape,
):
    """
    Converts normalized bounding box coordinates (x_center, y_center, width, height)
    back to the original coordinates (x1, y1, x2, y2) in pixel values.

    Args:
        x_norm (float): Normalized x center of the bounding box.
        y_norm (float): Normalized y center of the bounding box.
        width_norm (float): Normalized width of the bounding box.
        height_norm (float): Normalized height of the bounding box.
        image_shape (tuple): Shape of the image as (height, width).

    Returns:
        tuple: Original bounding box coordinates (x1, y1, x2, y2).
    """
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
    output_shapefile_path,
    image_file_path,
):
    """
    Creates vector files (GeoJSON and shapefile) from YOLO detection labels.

    Args:
        yolo_labels_path (str): Path to the YOLO labels text file.
        output_geojson_path (str): Path to save the output GeoJSON file.
        output_shapefile_path (str): Path to save the output shapefile.
        image_file_path (str): Path to the source image file for reference.
    """
    features = []  # Initialize a list to hold feature dictionaries

    # Open the image file to get its metadata
    with rasterio.open(image_file_path) as src:
        crs = (
            src.crs.to_string()
        )  # Get the coordinate reference system (CRS) of the image
        transform = src.transform  # Get the affine transformation for the image
        image_height, image_width = src.height, src.width  # Get dimensions of the image

    # Read the YOLO detection labels from the provided file
    with open(yolo_labels_path, "r") as yolo_file:
        lines = yolo_file.readlines()  # Read all lines into a list

        # Process each line to extract detection data
        for line in lines:
            data = line.strip().split()  # Split the line into components
            if (
                len(data) == 5
            ):  # Ensure the line contains the expected number of elements
                class_label = data[0]  # Extract the class label
                print(class_label)  # Print class label for debugging
                x_center, y_center, width, height = map(
                    float, data[1:5]
                )  # Convert the coordinates to floats

                # Unnormalize coordinates to get bounding box corners
                x1, y1, x2, y2 = unnormalize_coordinates_xywh_xyxy(
                    x_center, y_center, width, height, [image_height, image_width]
                )

                # Transform the coordinates to the map's CRS
                transformed_x1, transformed_y1 = transform * (x1, y1)
                transformed_x2, transformed_y2 = transform * (x2, y2)

                # Create a GeoJSON feature for the detected object
                feature = {
                    "type": "Feature",
                    "properties": {
                        "class": str(class_label)
                    },  # Class label as a property
                    "geometry": {
                        "type": "Polygon",  # Use a polygon to represent the bounding box
                        "coordinates": [
                            [
                                [transformed_x1, transformed_y1],
                                [transformed_x2, transformed_y1],
                                [transformed_x2, transformed_y2],
                                [transformed_x1, transformed_y2],
                                [transformed_x1, transformed_y1],  # Closing the polygon
                            ]
                        ],
                    },
                }
                features.append(feature)  # Append the feature to the list

    # Create a FeatureCollection from the collected features
    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
        "crs": {"type": "name", "properties": {"name": crs}},  # Include CRS information
    }

    # Write the FeatureCollection to a GeoJSON file
    with open(output_geojson_path, "w") as output_file:
        json.dump(feature_collection, output_file)

    # Read the GeoJSON file into a GeoDataFrame for further processing
    gdf = gpd.read_file(output_geojson_path)

    # Reproject the GeoDataFrame to EPSG:4326
    gdf = gdf.to_crs(epsg="4326")

    # Write the reprojected GeoDataFrame to the GeoJSON and shapefile outputs
    gdf.to_file(output_geojson_path, driver="GeoJSON")
    gdf.to_file(output_shapefile_path, driver="ESRI Shapefile")


def make_predictions(
    weight_file_path,
    CLASS_OPTIONS_TO_DETECT,
    tif_patches_dir_path,
    inferenced_tif_patches_dir_path,
    image_shape,
    detections_file_path,
):
    """
    Runs inference on TIFF patches using a YOLO model and saves predictions to a file.

    Args:
        weight_file_path (str): Path to the YOLO weight file.
        CLASS_OPTIONS_TO_DETECT (list): List of classes to detect.
        tif_patches_dir_path (str): Directory containing TIFF patches.
        inferenced_tif_patches_dir_path (str): Directory to save inferenced patches.
        image_shape (tuple): Shape of the original images as (channels, height, width).
        detections_file_path (str): Path to save detection results.

    Returns:
        None
    """
    # Load the YOLO model using the provided weight file
    model = YOLO(weight_file_path)

    # Run inference on the TIFF patches
    results = model(
        source=tif_patches_dir_path,
        stream=True,
        device=get_device(),
        save=True,
        project=inferenced_tif_patches_dir_path,
        exist_ok=True,
        conf=0.3,  # Confidence threshold
        iou=0.6,  # IoU threshold
        classes=CLASS_OPTIONS_TO_DETECT,  # Classes to detect
    )

    # Open the file to save detection results
    with open(detections_file_path, "w") as detections_file:
        all_preds = []  # List to store all predictions

        # Iterate over the results from the model
        for result in results:
            boxes = result.boxes  # Extract the bounding boxes
            name = result.path  # Get the path of the current image
            image_name = "".join(
                name.split(os.path.sep)[-1].split(".")[:-1]
            )  # Extract image name without extension

            # Iterate through each detected box
            for i in range(len(result)):
                # Get the bounding box coordinates
                bbox_coords = (
                    str(boxes.xyxy.cpu().numpy().astype(int)[i])
                    .lstrip("[")
                    .rstrip("]")
                    .replace("  ", " ")
                )
                cls = result.boxes.cls.cpu().numpy()[i]  # Get the class index
                xmin, ymin, xmax, ymax = map(
                    int, bbox_coords.split()
                )  # Parse bounding box coordinates

                # Extract width and height from the image name
                y_height, x_width = map(int, image_name.split("_")[1:])

                # Adjust bounding box coordinates based on the image patching
                xmin_, ymin_, xmax_, ymax_ = (
                    xmin + x_width,
                    ymin + y_height,
                    xmax + x_width,
                    ymax + y_height,
                )

                # Convert to center, width, height format
                x_center, y_center, width, height = xyxy_to_xywh(
                    [xmin_, ymin_, xmax_, ymax_]
                )

                # Normalize bounding box coordinates
                x_center, y_center, width, height = normalize_bbox_coordinates_xywh(
                    [x_center, y_center, width, height],
                    [image_shape[1], image_shape[2]],
                )

                # Format the prediction string as per YOLO format
                yolo_cxywh = f"{int(cls)} {x_center} {y_center} {width} {height}"
                all_preds.append(yolo_cxywh)  # Append the prediction to the list

        # Write all predictions to the detection file
        detections_file.write("\n".join(all_preds) + "\n")


def get_od(
    path=INPUT_IMG,
    classes=None,
):
    """
    Performs object detection on the provided image path and outputs results as a GeoJSON file.

    Args:
        path (str): The file path of the input image.
        classes (list): List of classes to detect; mapped to internal class IDs.

    Returns:
        str: Path to the generated GeoJSON file.
    """
    print(path)

    # Map class names to internal class IDs if provided
    if classes:
        for i in range(len(classes)):
            classes[i] = CLASS_DICT[classes[i]]

    print(classes)

    # Define the path for the detections output file
    detections_file_path = os.path.join(OUTPUT_DIR, f"{path.split('.')[0]}.txt")

    # Clean up previous patch and inference directories
    shutil.rmtree(PATCH_IMAGES_DIR, ignore_errors=True)
    shutil.rmtree(INFERENCED_IMAGES_DIR, ignore_errors=True)

    # Remove previous detections file if it exists
    if os.path.exists(detections_file_path):
        os.remove(detections_file_path)

    # Create directories for patches and inferenced images
    os.makedirs(PATCH_IMAGES_DIR, exist_ok=True)
    os.makedirs(INFERENCED_IMAGES_DIR, exist_ok=True)

    # Patch the input image and get the old and new shapes
    old_shape, new_shape = patch_(path, PATCH_SIZE, PATCH_IMAGES_DIR, INPUT_IMG_PADDED)

    # Make predictions on the patched images
    make_predictions(
        CME_OD_WEIGHT_FILE_PATH,
        classes,
        PATCH_IMAGES_DIR,
        INFERENCED_IMAGES_DIR,
        old_shape,
        detections_file_path,
    )

    # Unpatch the output image from the predictions
    unpatch_(
        path,
        f"{OUTPUT_DIR}/output_image.tif",
        new_shape,
        PATCH_SIZE,
        os.path.join(INFERENCED_IMAGES_DIR, "predict"),
    )

    # Define the path for the GeoJSON output file
    geojson_file_path = os.path.join(OUTPUT_DIR, f"{path.split('.')[0]}.geojson")
    shape_file_path = os.path.join(OUTPUT_DIR, f"{path.split('.')[0]}.shp")

    # Create vector files (GeoJSON and shapefile) from the detection results
    make_vector_files(detections_file_path, geojson_file_path, shape_file_path, path)

    # Remove the original input image file if it exists
    if os.path.exists(path):
        os.remove(path)

    return geojson_file_path  # Return the path to the generated GeoJSON file

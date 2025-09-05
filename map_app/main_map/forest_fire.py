import os
import csv
import json
import shutil
import tempfile
import rasterio
import numpy as np
import rasterio as rio
from ultralytics import YOLO
from shapely.geometry import Polygon
import ast
import shutil

from .common_funcs import *


FOREST_FIRE_WEIGHT_FILE_PATH = "forest_fire_03-05-24.pt"


def unnormalize_coordinates(
    polygon,
    image_shape,
):
    """
    Convert normalized polygon coordinates to pixel coordinates based on the image dimensions.

    This function takes a polygon defined by normalized coordinates (values between 0 and 1)
    and converts them to pixel coordinates corresponding to the dimensions of the image.

    Args:
        polygon (str): A string representation of a list of normalized coordinates.
                       Each coordinate should be in the form of [x, y] where x and y are between 0 and 1.
        image_shape (tuple): A tuple containing the height and width of the image
                             in pixels (image_height, image_width).

    Returns:
        list: A list of pixel coordinates corresponding to the input normalized coordinates.
    """
    # Unpack the image dimensions
    image_height, image_width = image_shape

    # Convert the string representation of the polygon to a list of coordinates
    polygon = ast.literal_eval(polygon)

    # Convert normalized coordinates to pixel coordinates
    unnormalized_polygon = [
        [point[0] * image_width, point[1] * image_height] for point in polygon
    ]

    return unnormalized_polygon  # Return the list of pixel coordinates


def force_rgb(
    image_path,
):
    """
    Convert a single-band image to a three-band RGB image by duplicating the input band.

    This function reads a single-band raster image and writes it as a three-band RGB image,
    where all three bands contain the same data. This is useful for visualization purposes
    where a three-band format is required.

    Args:
        image_path (str): The file path to the input single-band raster image.
    """
    # Open the input single-band raster image
    with rio.open(image_path) as data:
        dataset = data.read(1)  # Read the first (and only) band of the image

        # Create a new RGB raster image
        with rio.open(
            fp=image_path,
            mode="w",
            driver="GTiff",  # Output format
            width=data.shape[1],  # Width of the image
            height=data.shape[0],  # Height of the image
            count=3,  # Number of bands for the output image
            crs=data.crs,  # Coordinate Reference System of the input image
            transform=data.transform,  # Geotransform information
            dtype=data.meta["dtype"],  # Data type of the input image
        ) as dst:
            # Write the same dataset to each of the three bands
            dst.write(dataset, 1)  # Write to the first band
            dst.write(dataset, 2)  # Write to the second band
            dst.write(dataset, 3)  # Write to the third band


def convert_to_three_band(
    input_file,
):
    """
    Convert a single-band raster image to a three-band raster image by duplicating the input band.

    This function reads a single-band raster image and creates a temporary three-band image
    where each band contains the same data. The resulting three-band image replaces the original
    single-band image.

    Args:
        input_file (str): The file path to the input single-band raster image.
    """
    # Create a temporary directory to hold the output file
    temp_dir = tempfile.mkdtemp()
    temp_output = os.path.join(
        temp_dir, "temp_output.tif"
    )  # Temporary output file path

    # Open the input single-band raster image
    with rasterio.open(input_file) as src:
        bands_to_read = [1, 2, 3]  # Specify which bands to read
        band_data = src.read(
            bands_to_read
        )  # Read the first three bands (assumed to be the same)
        profile = src.profile  # Get the metadata/profile of the source image
        profile.update(count=3)  # Update profile to have three bands

        # Write the duplicated band data to a new three-band image
        with rasterio.open(temp_output, "w", **profile) as dst:
            dst.write(band_data)  # Write the band data to the destination image

    # Move the temporary output file to replace the original input file
    shutil.move(temp_output, input_file)
    shutil.rmtree(temp_dir)  # Remove the temporary directory


def contrast_stretch(
    band,
):
    """
    Apply contrast stretching to a single-band raster image.

    This function stretches the contrast of the input band using the 2nd and 98th percentiles
    of the pixel values to enhance the image's visibility.

    Args:
        band (numpy.ndarray): The input single-band raster image as a NumPy array.

    Returns:
        numpy.ndarray: The contrast-stretched image as a NumPy array with pixel values scaled
                       to the range [0, 255].
    """
    # Calculate the low and high percentiles for contrast stretching
    low, high = np.percentile(band, (2, 98))
    # Interpolate the band data to the range [0, 255]
    stretched = np.interp(band, (low, high), (0, 255))
    return stretched.astype(
        np.uint8
    )  # Return the stretched image as unsigned 8-bit integers


def convert_to_8bit(
    input_file,
):
    """
    Converts a raster image file to 8-bit format by applying contrast stretching
    and saves the modified raster back to the original file.

    Parameters:
    input_file (str): Path to the input raster file to be converted.

    Notes:
    - The original file is overwritten with the 8-bit version.
    - The function creates a temporary directory for intermediate storage,
      which is removed after processing.
    """
    # Create a temporary directory for storing the output file
    temp_dir = tempfile.mkdtemp()
    temp_output = os.path.join(temp_dir, "temp_output.tif")

    try:
        # Open the input raster file
        with rasterio.open(input_file) as src:
            # Update profile to use 8-bit data type and retain the number of bands
            profile = src.profile
            profile.update(dtype=rasterio.uint8, count=src.count)

            # Write the 8-bit output to a temporary file
            with rasterio.open(temp_output, "w", **profile) as dst:
                for i in range(1, src.count + 1):
                    # Read the current band with masked values for handling nodata
                    band = src.read(i, masked=True)

                    # Apply contrast stretching to the band
                    stretched_band = contrast_stretch(band)

                    # Write the modified band to the output file
                    dst.write(stretched_band, i)

        # Replace the original file with the converted 8-bit file
        shutil.move(temp_output, input_file)

    finally:
        # Remove the temporary directory and all its contents
        shutil.rmtree(temp_dir)


def normalize_bbox_coordinates(
    polygon,
    image_shape,
):
    """
    Normalizes the coordinates of a polygon (bounding box) to fit within the
    range [0, 1] based on the dimensions of the image.

    Parameters:
    polygon (list of tuples): List of (x, y) tuples representing the polygon's vertices.
    image_shape (tuple): Shape of the image (channels, height, width).

    Returns:
    list of lists: Normalized coordinates of the polygon vertices.
    """

    # Extract the height and width from the image shape
    _, height, width = image_shape

    # Normalize each vertex in the polygon by dividing x by width and y by height
    normalized_coord = [[x / width, y / height] for (x, y) in polygon]

    return normalized_coord


def make_predictions(
    weight_file_path,
    tif_patches_dir_path,
    inferenced_tif_patches_dir_path,
    image_shape,
    detections_file_path,
):
    """
    Runs object detection on image patches, saves the inferred patches, and writes
    normalized bounding box coordinates to a CSV file.

    Parameters:
    weight_file_path (str): Path to the model weights file.
    tif_patches_dir_path (str): Directory containing the image patches for inference.
    inferenced_tif_patches_dir_path (str): Directory to save inferred patches.
    image_shape (tuple): Shape of the original image (channels, height, width).
    detections_file_path (str): Path to save the detection results as a CSV file.

    Returns:
    None
    """

    # Initialize YOLO model with specified weights
    model = YOLO(weight_file_path)


    # Run the model on patches from the source directory with specified parameters
    results = model(
        source=tif_patches_dir_path,
        stream=True,
        device=get_device(),
        save=True,
        project=inferenced_tif_patches_dir_path,
        exist_ok=True,
        conf=0.1,  # Confidence threshold
        iou=0.2,  # Intersection over Union threshold
        boxes=True,
    )

    # Open the CSV file to write detections
    with open(detections_file_path, "w", newline="") as detections_file:
        csv_writer = csv.writer(detections_file)

        # Initialize an index for each detection entry
        idx = 1

        # Iterate over the results for each patch
        for result in results:
            name = result.path  # Path of the patch image
            image_name = "".join(name.split(os.path.sep)[-1].split(".")[:-1])

            # Extract the y and x coordinates from the patch filename
            y_height, x_width = map(int, image_name.split("_")[1:])

            # Process each detection in the result
            for i in range(len(result)):
                if result.masks:  # If masks are available for detections
                    # Get the class of the detected object
                    cls = result.boxes.cls.cpu().numpy()[i]

                    # Extract the polygon coordinates of the mask
                    polygon = result.masks.xy[i]

                    # Adjust polygon coordinates relative to original image
                    polygon_coords = [
                        (int(x + x_width), int(y + y_height)) for x, y in polygon
                    ]

                    # Normalize coordinates based on original image dimensions
                    normalized_coord = normalize_bbox_coordinates(
                        polygon_coords, image_shape
                    )

                    # Write detection data to CSV if there are multiple coordinates
                    if len(normalized_coord) > 1:
                        csv_writer.writerow([int(cls), normalized_coord])
                        idx += 1


def make_vector_files(
    detections_file_path,
    output_geojson_path,
    output_shapefile_path,
    image_file_path,
):
    """
    Converts object detection results into GeoJSON and Shapefile vector formats, transforming
    normalized coordinates to the image's coordinate reference system (CRS).

    Parameters:
    detections_file_path (str): Path to the CSV file with detection results.
    output_geojson_path (str): Path to save the GeoJSON file.
    output_shapefile_path (str): Path to save the Shapefile.
    image_file_path (str): Path to the source image file for CRS and transform information.

    Returns:
    None
    """

    features = []

    # Open the image file to obtain CRS and transform information
    with rasterio.open(image_file_path) as src:
        try:
            crs = src.crs.to_string()
        except:
            crs = "EPSG:4326"  # Default CRS if not available
        transform = src.transform
        image_height, image_width = src.height, src.width

    # Read detection data and process each line
    with open(detections_file_path, "r") as yolo_file:
        lines = yolo_file.readlines()
        for line in lines:
            # Extract normalized coordinates and class label
            data = line[3:-2]
            if len(data) > 2:
                class_label = line[0]

                # Convert normalized coordinates to actual image coordinates
                unnormalize_coords = unnormalize_coordinates(
                    data, [image_height, image_width]
                )

                # Create a polygon with the unnormalized coordinates
                polygon = Polygon(unnormalize_coords)

                # Transform coordinates based on the image's geospatial transform
                transformed_coordinates = [
                    transform * (x, y) for x, y in polygon.exterior.coords
                ]
                transformed_polygon = Polygon(transformed_coordinates)

                # Create a GeoJSON feature for the polygon
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

    # Save as GeoJSON
    feature_collection = {
        "type": "FeatureCollection",
        "features": features,
        "crs": {"type": "name", "properties": {"name": crs}},
    }
    with open(output_geojson_path, "w") as output_file:
        json.dump(feature_collection, output_file)

    # gdf = gpd.read_file(output_geojson_path)
    # gdf.to_file(output_shapefile_path, driver="ESRI Shapefile")
 

def get_detections(
    image_path,
):
    """
    Processes an input image to generate object detections, converts detections into vector formats,
    and returns the path to a GeoJSON file with the results.

    Parameters:
    image_path (str): Path to the input image for which detections are to be generated.

    Returns:
    str: Path to the generated GeoJSON file with detection results.
    """

    input_image_file_path = image_path
    patch_size = (640, 640)

    # Define directories for patch images and outputs
    patch_images_dir = os.path.join(os.getcwd(), "media", "patch_images_dir_FIRE")
    output_dir = os.path.join("media", "output_dir_FIRE")
    output_geo = os.path.join("media", "OUTPUT")

    # Paths for detections file, GeoJSON, and Shapefile outputs
    detections_file_path = f"{output_dir}/{os.path.splitext(image_path)[0]}_label.txt"
    geojson_file_path = f"{output_geo}/{os.path.splitext(image_path)[0]}_output.geojson"
    print('geojson_file_path',geojson_file_path)
    shape_file_path = f"{output_dir}/output.shp"

    # Clean up existing directories for patch images and outputs
    if os.path.exists(patch_images_dir) and os.path.isdir(patch_images_dir):
        shutil.rmtree(patch_images_dir)
    os.makedirs(patch_images_dir, exist_ok=True)

    if os.path.exists(output_dir) and os.path.isdir(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(output_geo, exist_ok=True)

    # Split the input image into patches
    old_shape, new_shape = patch_(
        input_image_file_path, patch_size, patch_images_dir, "padded_image.png"
    )
    print("Old shape:", old_shape, "New shape:", new_shape)

    # Run detection on each patch and save results
    make_predictions(
        FOREST_FIRE_WEIGHT_FILE_PATH,  # Specify the path to model weights
        patch_images_dir,
        output_dir,
        old_shape,
        detections_file_path,
    )

    # Convert detections into GeoJSON and Shapefile formats
    make_vector_files(
        detections_file_path, geojson_file_path, shape_file_path, input_image_file_path
    )
    print(f"GeoJSON file created at: {geojson_file_path}")

    # Clean up the detections file and patch images directory after processing
    os.remove(detections_file_path)
    shutil.rmtree(patch_images_dir)

    return geojson_file_path

from samgeo import tms_to_geotiff, SamGeo
from .od_utils import get_od
from map_app.seg_infer_georef import get_segment
import geopandas as gpd
import json
import torch
import rasterio
from rasterio.enums import Resampling
import string
import random


def get_bbox(
    bbox,
):
    """
    Calculates the bounding box from a list of coordinates.

    Args:
        bbox (list): A list of points, where each point is represented by a list or tuple [x, y].

    Returns:
        list: A list containing [xmin, ymin, xmax, ymax], the minimum and maximum x and y values.
    """
    # Extract x and y coordinates from the input points
    x_values = [point[0] for point in bbox]
    y_values = [point[1] for point in bbox]

    # Calculate minimum and maximum x and y values
    xmin, xmax = min(x_values), max(x_values)
    ymin, ymax = min(y_values), max(y_values)

    return [xmin, ymin, xmax, ymax]


def process_data(
    data,
):
    """
    Processes the input data for prediction or segmentation tasks based on its structure.

    If the input contains three elements, it performs a prediction task by combining feature coordinates
    and labels. Otherwise, it performs a segmentation task using the bounding box.

    Args:
        data (list): A list of input data. If length is 3, it processes for prediction, otherwise for segmentation.

    Returns:
        Depending on the input length:
        - If length is 3: Returns the result of the `predict_` function.
        - Otherwise: Returns the result of the `segment_` function.
    """
    torch.cuda.empty_cache()  # Clear the CUDA cache to free up GPU memory

    # If data has three elements, perform prediction
    if len(data) == 3:
        # Extract bounding box, foreground, and background data
        bbox = get_bbox(json.loads(data[2]))
        fc = [json.loads(i) for i in data[0]]  # Foreground coordinates
        fc_label = [1] * len(fc)  # Label all foreground points as 1
        bc = [json.loads(i) for i in data[1]]  # Background coordinates
        bc_labels = [0] * len(bc)  # Label all background points as 0

        # Combine foreground and background data and labels
        fc.extend(bc)
        fc_label.extend(bc_labels)

        # Convert the bounding box to TIFF format
        bbox_to_tiff(bbox)

        # Perform prediction using combined coordinates and labels
        return predict_(fc, fc_label)

    # If data has a different structure, perform segmentation
    else:
        bbox = get_bbox(json.loads(data[0]))  # Extract bounding box from data
        bbox_to_tiff(bbox)  # Convert bounding box to TIFF format
        return segment_()  # Perform segmentation


def process_data_segment(
    classes,
    box,
):
    """
    Processes the input bounding box for segmentation and generates a random file name for the output TIFF.

    Args:
        classes (list): A list of class labels for segmentation.
        box (list): The bounding box coordinates used to generate the TIFF file.

    Returns:
        The result of the `get_segment` function, which performs segmentation on the generated TIFF file.
    """
    # Generate a random string of 6 characters (letters and digits)
    characters = string.ascii_letters + string.digits
    random_string = "".join(random.choice(characters) for _ in range(6))

    # Convert the bounding box to a TIFF file with a random name
    bbox_to_tiff(box, name=f"{random_string}.tif")

    # Perform segmentation using the generated TIFF and the provided classes
    return get_segment(f"{random_string}.tif", classes)


def bbox_to_tiff(
    bbox,
    url="Satellite",
    name="ToSeg.tif",
    zoom=20,
):
    """
    Converts a bounding box to a GeoTIFF file using a tile map service (TMS) as the source.

    Args:
        bbox (list): The bounding box coordinates [xmin, ymin, xmax, ymax].
        url (str, optional): The tile source URL (e.g., "Satellite"). Defaults to "Satellite".
        name (str, optional): The output file name for the GeoTIFF. Defaults to "ToSeg.tif".
        zoom (int, optional): The zoom level for the tiles. Defaults to 20.

    Returns:
        None: The function saves the GeoTIFF file to disk.
    """
    # Convert the bounding box to a GeoTIFF file using the specified TMS source and parameters
    tms_to_geotiff(
        output=name,
        bbox=bbox,
        zoom=zoom,
        source=url,
        overwrite=True,
        crs="EPSG:4326",  # Use WGS84 geographic coordinate system
    )


def segment_():
    """
    Performs image segmentation on a GeoTIFF file using the SAM (Segment Anything Model).

    Returns:
        str: The file name of the generated segmented image ("DoneSeg.tif").
    """
    # Initialize the SAM model with 'vit_h' type, using CUDA for processing
    sam = SamGeo(model_type="vit_h", sam_kwargs=None, device="cuda")

    # Generate the segmented image
    sam.generate(
        "ToSeg.tif",
        "DoneSeg.tif",
        batch=True,
        foreground=True,
        erosion_kernel=(3, 3),
        mask_multiplier=255,
    )

    # Return the name of the segmented output file
    return "DoneSeg.tif"


def predict_(
    points_coords,
    point_labels,
    boxes=None,
):
    """
    Predicts a segmentation mask based on given point coordinates and labels using the SAM model.

    Args:
        points_coords (list): List of point coordinates for prediction.
        point_labels (list): Corresponding labels for each point (e.g., foreground or background).
        boxes (optional): Bounding boxes for prediction. Defaults to None.

    Returns:
        str: The file name of the generated mask ("mask1.tif").
    """
    # Initialize the SAM model with manual prediction mode
    sam = SamGeo(
        model_type="vit_h",
        automatic=False,
        sam_kwargs=None,
    )

    # Set the image to predict on
    sam.set_image("ToSeg.tif")

    # Perform the prediction using the given point coordinates and labels
    sam.predict(
        point_coords=points_coords,
        point_labels=point_labels,
        point_crs="EPSG:4326",
        output="mask1.tif",
        batch=True,
    )

    return "mask1.tif"


def detect(
    data,
):
    """
    Detects objects within a bounding box, converts the box to a TIFF image, and retrieves object detection results.

    Args:
        data (list): Input data containing bounding box information.

    Returns:
        dict: A GeoJSON representation of the detected objects as a dictionary.
    """
    # Generate a random string for the file name
    characters = string.ascii_letters + string.digits
    random_string = "".join(random.choice(characters) for _ in range(6))

    # Extract bounding box from input data
    bbox = get_bbox(json.loads(data[0]))
    print(bbox)

    # Convert the bounding box to a TIFF image
    bbox_to_tiff(bbox, name=f"{random_string}.tif")

    # Perform object detection on the generated TIFF and get the resulting path
    path = get_od(f"{random_string}.tif")

    # Read the object detection results as a GeoDataFrame
    boundry_gdf = gpd.read_file(path)

    # Return the GeoDataFrame as a GeoJSON dictionary
    return json.loads(boundry_gdf.to_json())


def detect_llm(
    box,
    classes,
):
    """
    Detects objects within a bounding box and retrieves object detection results for specified classes.

    Args:
        box (list): Bounding box coordinates to convert to a TIFF image.
        classes (list): List of object classes to detect.

    Returns:
        Object detection results for the specified classes.
    """
    # Generate a random string for the file name
    characters = string.ascii_letters + string.digits
    random_string = "".join(random.choice(characters) for _ in range(6))

    # Convert the bounding box to a TIFF image
    bbox_to_tiff(box, name=f"{random_string}.tif")

    # Return object detection results for the specified classes
    return get_od(f"{random_string}.tif", classes)


def download(
    extent,
    url,
    format,
):
    """
    Downloads a GeoTIFF file based on the specified bounding box and URL, and converts it to PNG if required.

    Args:
        extent (list): Input containing bounding box information in JSON format.
        url (str): The URL for the data source.
        format (str): Desired output format ("tif" or "png").

    Returns:
        None: The function saves the downloaded data as "download.tif" or "download.png".
    """
    # Extract bounding box from the input extent
    bbox = get_bbox(json.loads(extent[0]))

    # Convert the bounding box to a TIFF image
    bbox_to_tiff(bbox, url, "download.tif")

    # If the desired format is not TIFF, convert to PNG
    if format != "tif":
        with rasterio.open("download.tif") as src:
            # Read the data from the TIFF file with specified output shape
            data = src.read(
                out_shape=(src.count, int(src.height), int(src.width)),
                resampling=Resampling.bilinear,
            )
            transform = src.transform  # Store the transformation matrix (unused)

        # Write the data to a PNG file
        with rasterio.open(
            "download.png",
            "w",
            driver="PNG",
            height=data.shape[1],
            width=data.shape[2],
            count=src.count,
            dtype=data.dtype,
        ) as dst:
            dst.write(data)

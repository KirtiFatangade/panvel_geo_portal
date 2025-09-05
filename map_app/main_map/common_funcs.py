import os
import torch
import numpy as np
from PIL import Image
import rasterio
from rasterio.windows import Window
from rasterio.transform import from_origin


def get_device():
    """
    Determines the appropriate computing device for PyTorch operations.

    Returns:
        int or torch.device: The index of the CUDA device (0) if available,
                             the Metal Performance Shaders (MPS) device, or the CPU device.
    """
    if torch.cuda.is_available():
        return 0  # Return CUDA device index
    elif torch.backends.mps.is_available():
        return torch.device("mps")  # Return MPS device
    return torch.device("cpu")  # Default to CPU


def read_tif_file(
    image_file_path,
):
    """
    Reads a TIFF image file and converts it to a NumPy array in RGB format.

    Args:
        image_file_path (str): The path to the TIFF image file.

    Returns:
        np.ndarray: The RGB image as a NumPy array with shape (height, width, 3).
    """
    # Open the image file and convert it to a NumPy array
    image = Image.open(image_file_path)
    image_data = np.array(image)

    # Extract the RGB channels and move the axis to (height, width, channels)
    rgb_image = image_data[:, :, :3]
    img_array = np.moveaxis(rgb_image, 0, 2)  # Move the first channel to the last axis
    img_array = np.uint8(rgb_image)  # Ensure the image array is of type uint8

    return img_array


def calculate_percentage(
    image,
    boundary,
):
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


def patch_(
    image_file_path,
    patch_size,
    tif_patches_dir_path,
    mod_image_file_path,
):
    """
    Divides an image into smaller patches of a specified size, saves the patches to
    the specified directory, and saves a modified version of the image with padding
    if needed.

    Parameters:
    image_file_path (str): Path to the input image file.
    patch_size (tuple): Size of each patch (height, width).
    tif_patches_dir_path (str): Directory path to save the patches.
    mod_image_file_path (str): Path to save the modified (padded) image if needed.

    Returns:
    tuple: Old shape and new shape of the image (before and after padding).
    """

    # Open the source image file
    with rasterio.open(image_file_path) as src:
        # Extract metadata and read the image into an array
        metadata = src.meta
        image_array = src.read()
        old_shape = image_array.shape
        height, width = src.height, src.width

        # Calculate padding required to make the image dimensions divisible by patch size
        left_border = (patch_size[1] - (width % patch_size[1])) % patch_size[1]
        bottom_border = (patch_size[0] - (height % patch_size[0])) % patch_size[0]

        # Initialize padded dimensions
        padded_width = width
        padded_height = height

        # If padding is needed, pad the image and update metadata
        if left_border != 0 or bottom_border != 0:
            padded_width = width + left_border
            padded_height = height + bottom_border

            # Pad the image array with zeros where needed
            padded_image = np.pad(
                image_array,
                ((0, 0), (0, bottom_border), (0, left_border)),
                constant_values=0,
            )
            image_array = padded_image
            new_shape = image_array.shape

            # Update metadata with the new dimensions
            metadata["height"] = padded_height
            metadata["width"] = padded_width

            # Adjust the transform to account for padding
            transform = metadata["transform"]
            left_padding = transform[0]
            bottom_padding = transform[3]
            transform = from_origin(
                transform[2] + left_padding,
                transform[5] - bottom_padding - bottom_border * abs(transform[4]),
                transform[0],
                abs(transform[4]),
            )

            # Save the padded image to the specified file path
            with rasterio.open(mod_image_file_path, "w", **metadata) as dst:
                dst.write(image_array)
                dst.transform = transform

        # Generate patches and save each one as a separate file
        for i in range(0, padded_height, patch_size[0]):
            for j in range(0, padded_width, patch_size[1]):
                # Extract the patch from the image array
                patch = image_array[:, i : i + patch_size[0], j : j + patch_size[1]]

                # Copy metadata and update dimensions and transform for the patch
                patch_profile = metadata.copy()
                patch_profile["width"] = patch_size[1]
                patch_profile["height"] = patch_size[0]
                patch_profile["transform"] = rasterio.windows.transform(
                    Window(j, i, patch_size[1], patch_size[0]), src.transform
                )

                # Define path and save the patch
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
    """
    Reconstructs an image from its patches and saves it as a TIFF file.

    Args:
        image_file_path (str): Path to the input image file (for CRS and transform).
        output_image_file_path (str): Path to save the reconstructed image.
        new_shape (tuple): The shape of the reconstructed image as (channels, height, width).
        patch_size (tuple): Size of the patches as (height, width).
        patch_files_dir_path (str): Directory containing the patch files.

    Returns:
        None
    """
    with rasterio.open(image_file_path) as src:
        crs = src.crs
        transform = src.transform

        n_c, new_image_height, new_image_width = new_shape
        output_image = np.zeros(
            (n_c, new_image_height, new_image_width), dtype=np.uint8
        )

        # Read and reconstruct patches
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

        # Write the reconstructed image to a new file
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
    """
    Converts bounding box coordinates from (x1, y1, x2, y2) to (x_center, y_center, width, height).

    Args:
        bbox (list or tuple): Bounding box coordinates in the format (x1, y1, x2, y2).

    Returns:
        list: Bounding box in the format (x_center, y_center, width, height).
    """
    x1, y1, x2, y2 = bbox
    width = x2 - x1
    height = y2 - y1
    x_center = x1 + width / 2
    y_center = y1 + height / 2
    return [x_center, y_center, width, height]

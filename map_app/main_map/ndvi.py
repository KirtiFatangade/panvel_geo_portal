from datetime import datetime, timedelta
import json
import ee
import traceback
import concurrent.futures
from map_app.models import Selfcache
from .common_funcs import calculate_percentage


def process_roi(
    farm_dicts,
    dataset,
    end,
    size,
    idx,
    geom,
):
    """
    Processes a given region of interest (ROI) to compute NDVI values and update the farm dictionary with mean NDVI values.

    Parameters:
    - farm_dicts (dict): A dictionary where keys are dates (or end times) and values are lists storing NDVI values for multiple regions.
    - dataset (ee.ImageCollection): The Earth Engine image collection to analyze.
    - end (str or datetime): The end date associated with the analysis period for this ROI.
    - size (int): The total number of ROIs being processed, used to initialize lists within farm_dicts.
    - idx (int): The index position in the NDVI values list that this ROI corresponds to.
    - geom (ee.Geometry or ee.FeatureCollection): The geometry of the ROI to process.

    Returns:
    - None: Updates farm_dicts in place with the mean NDVI values for each ROI.
    """

    # Filter the dataset to the area defined by geom and compute the mean value of the dataset across that area
    dataset_temp = dataset.filterBounds(geom)
    dataset_temp = dataset_temp.mean().clip(geom)

    # Retrieve band names to ensure the dataset contains both red (B4) and NIR (B8) bands needed for NDVI calculation
    band_name = dataset_temp.bandNames().getInfo()
    if "B4" in band_name and "B8" in band_name:
        # Calculate NDVI using the normalized difference formula with NIR (B8) and red (B4) bands
        ndvi_val = dataset_temp.normalizedDifference(["B8", "B4"])
    else:
        return None  # Exit if necessary bands are not available

    # Calculate the mean NDVI within each feature in geom (typically a polygon or set of polygons)
    zonal_stats_ndvi = ndvi_val.reduceRegions(
        collection=geom,
        reducer=ee.Reducer.mean(),
        scale=10,  # Defines spatial resolution of the output (10 meters in this case)
    )

    # Initialize a dictionary to store mean NDVI values keyed by index
    mean_ndvi_vals = {}
    for feature in zonal_stats_ndvi.getInfo()["features"]:
        # Only store mean NDVI if it's available in the properties of the feature
        if "mean" in feature["properties"].keys():
            mean_ndvi_vals[idx] = feature["properties"]["mean"]

    # If 'end' (date) is not already in farm_dicts, initialize it with a list of default NDVI values (2) with length 'size'
    if end not in farm_dicts:
        farm_dicts[end] = [2] * size

    # Update the specific index position in farm_dicts for the end date with calculated mean NDVI values
    for idx, mean_ndvi_val in mean_ndvi_vals.items():
        farm_dicts[end][idx] = mean_ndvi_val


def trends(
    boxes,
    start_date,
    end_date,
    cache_key,
):
    """
    Computes trends for given geometries over a specified date range using the Sentinel-2 Harmonized dataset.

    Parameters:
    - boxes (list): A list of geometries in GeoJSON format representing the areas of interest.
    - start_date (str): The start date for the analysis in the format "YYYY-MM-DD".
    - end_date (str): The end date for the analysis in the format "YYYY-MM-DD".
    - cache_key (str): A key used for caching results, specific to the analysis context.

    Returns:
    - dict: A dictionary containing NDVI trends for each geometry indexed by their respective dates.
    """
    try:
        # Convert input date strings to datetime objects for processing
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
        main_start_date = start_date
        main_end_date = end_date

        geometries = {}  # To store geometries indexed by their orbit numbers
        farm_dicts = {}  # To store results for each geometry

        # Iterate through the provided boxes (geometries)
        for idx, box in enumerate(boxes):
            # Convert the GeoJSON string to an Earth Engine polygon geometry
            test = ee.Geometry.Polygon(json.loads(box))
            # Load the Sentinel-2 Harmonized dataset and filter by the current geometry
            dataset = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(
                test
            )

            # Get the orbit number of the first image in the dataset
            orbit = dataset.first().getInfo()["properties"]["SENSING_ORBIT_NUMBER"]

            # Store the geometry in the geometries dictionary under its corresponding orbit number
            if orbit not in geometries:
                geometries[orbit] = []
            geometries[orbit].append([idx, test])  # Append index and geometry

        # Get the number of geometries processed
        lenth_geom = idx + 1

        # Use a thread pool to process data concurrently for different orbits
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = []
            for key in geometries:
                # Submit each orbit's geometries to the process_data function
                futures.append(
                    executor.submit(
                        process_data,
                        geometries[key],
                        main_start_date,
                        main_end_date,
                        farm_dicts,
                        lenth_geom,
                        cache_key,
                    )
                )
            # Wait for all futures to complete
            concurrent.futures.wait(futures)

        return farm_dicts  # Return the collected results

    except Exception as e:
        traceback.print_exc()  # Print any exceptions that occur during execution


def process_data(
    roi_polygons,
    start_date,
    end_date,
    farm_dicts,
    size,
    cache_key,
):
    """
    Processes satellite imagery data for specified regions of interest (ROIs) over a date range
    and updates the progress in a caching system.

    Parameters:
    - roi_polygons (list): A list of tuples, where each tuple contains an index and an Earth Engine
      geometry representing the region of interest.
    - start_date (datetime): The start date for processing.
    - end_date (datetime): The end date for processing.
    - farm_dicts (dict): A dictionary to store results for each region of interest.
    - size (int): The size parameter used for processing, which might correspond to the number of ROIs.
    - cache_key (str): A unique key for caching progress and results.

    Returns:
    - None
    """
    try:
        # Find the first available date within the specified range for the first ROI
        real_start = find_first_date(start_date, end_date, roi_polygons[0][1])
        main_start = start_date
        total_days = (
            end_date - start_date
        ).days  # Total number of days in the specified range

        # Loop through the available dates starting from the real start date
        while real_start <= end_date:
            temp_start_date = real_start
            temp_end_date = temp_start_date + timedelta(
                days=1
            )  # Define the processing window of one day

            # Filter the Sentinel-2 dataset for the specified date range and cloud cover
            dataset = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterDate(
                    temp_start_date, temp_end_date
                )  # Filter for the specific date
                .filter(
                    ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30)
                )  # Filter for cloud cover less than 30%
            )

            # Use a ThreadPoolExecutor to process each ROI in parallel
            with concurrent.futures.ThreadPoolExecutor() as executor:
                futures = []
                for idx, geom in roi_polygons:
                    # Submit the process_roi function for each ROI to the executor
                    future = executor.submit(
                        process_roi,
                        farm_dicts,
                        dataset,
                        temp_start_date.strftime(
                            "%Y-%m-%d"
                        ),  # Format the date as string
                        size,
                        idx,
                        geom,
                    )
                    futures.append(future)  # Keep track of futures

                # Wait for all processing futures to complete
                concurrent.futures.wait(futures)

            # Move to the next processing date, incrementing by 5 days
            real_start += timedelta(days=5)

            # Calculate progress percentage based on the processed days
            percent = (
                (((temp_start_date + timedelta(days=1)) - main_start).days)
                / total_days
                * 100
            )
            # Update the progress in the caching system
            cache_obj = Selfcache.objects.get(cache_id=cache_key)
            cache_obj.progress = percent
            cache_obj.save()

    except Exception as e:
        traceback.print_exc()  # Print the traceback for debugging

        # while True:
        #     if start_date > end_date:
        #         break

        #     str_start_date = temp_start_date.strftime("%Y-%m-%d")
        #     str_end_date = temp_end_date.strftime("%Y-%m-%d")
        #     dataset = (
        #         ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        #         .filterDate(str_start_date, str_end_date)
        #         .filterBounds(roi_polygon)
        #         .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        #     )
        #     dataset = dataset.mean().clip(roi_polygon)
        #     band_name = dataset.bandNames().getInfo()
        #     if "B4" in band_name and "B8" in band_name:
        #         ndvi_val = dataset.normalizedDifference(["B8", "B4"])
        #     else:
        #         print(f"{str_start_date} no record found!")
        #         temp_start_date, temp_end_date = change_dates_no_record_found(
        #             temp_start_date,
        #             found,
        #         )
        #         start_date = temp_start_date
        #         continue

        #     zonal_stats_ndvi = ndvi_val.reduceRegions(
        #         collection=roi_polygon,
        #         reducer=ee.Reducer.mean(),
        #         scale=10,
        #     )

        #     if not idx:
        #         percent = (
        #             (((temp_start_date + timedelta(days=1)) - main_start).days)
        #             / total_days
        #             * 100
        #         )
        #         cache_obj = Self_Cache.objects.get(cache_id=cache_key)
        #         cache_obj.progress = percent
        #         cache_obj.save()

        #     if (
        #         "mean"
        #         not in zonal_stats_ndvi.getInfo()["features"][0]["properties"].keys()
        #     ):
        #         print(f"{str_start_date} no record found!")
        #         temp_start_date, temp_end_date = change_dates_no_record_found(
        #             temp_start_date,
        #             found,
        #         )
        #         start_date = temp_start_date
        #     else:
        #         found = True
        #         break

        # end = temp_start_date
        # end = end.strftime("%Y-%m-%d")
        # if end not in farm_dicts:
        #     farm_dicts[end] = []

        # for feature in zonal_stats_ndvi.getInfo()["features"]:
        #     if "mean" in feature["properties"].keys():
        #         mean_ndvi_val = feature["properties"]["mean"]
        #         print(
        #             f"Mean NDVI Value for farm Id {idx} : ",
        #             mean_ndvi_val,
        #         )

        #         if mean_ndvi_val is not None:
        #             farm_dicts[end].insert(idx, mean_ndvi_val)

        #     start_date += timedelta(days=5)


def find_first_date(
    start,
    end,
    geom,
):
    """
    Finds the first date within a specified date range where an image is available for a given geometry
    in the Sentinel-2 Harmonized dataset with less than a specified cloud cover percentage.

    Parameters:
    - start (datetime): The start date for the search.
    - end (datetime): The end date for the search.
    - geom (ee.Geometry): The geometry of interest (e.g., a polygon) to filter the images.

    Returns:
    - datetime: The first date with available image data, or None if no such date exists within the range.
    """

    # Filter the Sentinel-2 Harmonized dataset based on cloud cover and geometry
    dataset = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filter(
            ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30)
        )  # Less than 30% cloud cover
        .filterBounds(geom)  # Within the specified geometry
        .map(
            lambda image: calculate_percentage(image, geom)
        )  # Apply the percentage calculation to each image
        .filter(
            ee.Filter.gte("percentage_covered", 70)
        )  # Only keep images covering at least 70% of the geometry
    )

    # Loop through each date from start to end to find the first available image
    while start < end:
        # Filter the dataset for images available on the current start date
        dataset_temp = dataset.filterDate(start, start + timedelta(days=1))

        # If there are images available for the current date, return that date
        if dataset_temp.size().getInfo():
            return start
        else:
            # Increment the start date by one day if no images are found
            start += timedelta(days=1)

    # Return None if no date with available images is found within the specified range
    return None

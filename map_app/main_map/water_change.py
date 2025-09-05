import ee
from datetime import datetime, timedelta
from turfpy.measurement import area
from .create_url import get_url


def get_change(
    start,
    end,
    roi,
):
    """
    Analyzes and retrieves water body changes within a region of interest (ROI) over a specified date range.

    This function uses Sentinel-2 data to calculate the Normalized Difference Water Index (NDWI) for the specified ROI
    and time period. It identifies water bodies within each month and tracks their area to determine the maximum and
    minimum water body sizes for visualization purposes.

    Parameters:
    - start (str): Start date in "YYYY-MM" format.
    - end (str): End date in "YYYY-MM" format.
    - roi (list): A list of four coordinates defining the bounding box for the region of interest.

    Returns:
    - dict: A dictionary where each key is a month (in "YYYY-MM" format), and each value is a list containing
      the area of the largest water body and a URL to visualize the water body change layer.
    """
    final_dict = {}
    min_area = 1e17
    max_area = 0

    # Parse the start and end dates from strings to datetime objects
    start = start.split("-")
    end = end.split("-")
    try:
        Start = datetime(int(start[0]), int(start[1]), 1)
        End = datetime(
            int(end[0]) if int(end[1]) < 12 else int(end[0]) + 1,
            int(end[1]) + 1 if int(end[1]) < 12 else 1,
            1,
        )

        # Create Earth Engine geometry for the bounding box (ROI)
        roi = ee.Geometry.Rectangle(roi)

        # Calculate the percentage of the image that intersects with the ROI
        def calculate_percentage(image):
            intersection_area = image.geometry().intersection(roi).area()
            total_area = roi.area()
            percentage_covered = (intersection_area.divide(total_area)).multiply(100)
            return image.set("percentage_covered", percentage_covered)

        # Retrieve and filter Sentinel-2 dataset by cloud coverage and percentage of area covered
        dataset = (
            ee.ImageCollection("COPERNICUS/S2_SR")
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 5))
            .select("B8", "B3")
            .filterBounds(roi)
            .map(calculate_percentage)
            .filter(ee.Filter.gte("percentage_covered", 70))
        )

        # Loop through each month in the specified date range
        while Start < End:
            month_Start = Start
            print("Month", Start)
            month_end = month_Start + timedelta(days=30)

            # Iterate over each day in the month to find images
            while month_Start < month_end:
                month_DayEnd = month_Start + timedelta(days=1)
                dataset_2 = dataset.filterDate(month_Start, month_DayEnd)

                if dataset_2.size().getInfo():
                    fil_list = []
                    print("Image Date", month_Start)

                    # Calculate mean of images, clip to ROI, and compute NDWI
                    dataset_2 = dataset_2.mean().clip(roi)
                    nir = dataset_2.select("B8")
                    green = dataset_2.select("B3")
                    ndwi = green.subtract(nir).divide(green.add(nir))

                    # Identify water bodies based on NDWI threshold
                    waterbodies = ndwi.gt(0.0).eq(1).selfMask()

                    # Convert water body raster to vector features
                    vectors = waterbodies.reduceToVectors(
                        geometry=roi,
                        crs=ndwi.projection(),
                        scale=30,
                        geometryType="polygon",
                        eightConnected=True,
                        maxPixels=1e17,
                    )

                    try:
                        max_feat = 0
                        get_info = vectors.getInfo()
                        a = len(get_info["features"])

                        # Iterate over each feature to calculate area and filter by size
                        for i in range(a):
                            feat = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Polygon",
                                    "coordinates": get_info["features"][i]["geometry"][
                                        "coordinates"
                                    ],
                                },
                            }
                            are = area(feat)
                            if are > 1000:
                                max_feat = max_feat if are < max_feat else are
                                fil_list.append(feat)

                        # Update max and min water body areas found
                        max_area = max_area if max_feat < max_area else max_feat
                        min_area = min_area if max_feat > min_area else max_feat
                        final_dict[month_Start.strftime("%Y-%m")] = [
                            max_feat,
                            ee.FeatureCollection(fil_list),
                        ]
                        break

                    except Exception as e:
                        print(e)
                        break

                # Move to the next day if no images are found
                else:
                    month_Start += timedelta(days=1)

            # Move to the next month
            Start += timedelta(days=30)

    except Exception as e:
        print(e)

    final_final_dict = {}

    # Generate URLs for visualizing water body changes
    for i in final_dict:
        print(i)
        area_feat, layer = final_dict[i]
        try:
            if area_feat == max_area:
                layer = get_url(layer, {"color": "blue"})  # Blue for maximum area
            elif area_feat == min_area:
                layer = get_url(layer, {"color": "red"})  # Red for minimum area
            else:
                layer = get_url(layer, {})  # Default color for other areas

            final_final_dict[i] = [area_feat, layer]

        except:
            continue

    return final_final_dict

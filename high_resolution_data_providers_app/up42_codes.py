import up42
import re
import traceback

up42.authenticate(cfg_file="config_files/up42_config.json")
up42.tools.settings(log=True)
catalog = up42.initialize_catalog()
glossary = up42.glossary.ProductGlossary


def get_up42_products(type, geom, dates, cloud,):
    catalog_type = up42.glossary.CollectionType.ARCHIVE
    sort_by = up42.glossary.CollectionSorting.name
    collections = glossary.get_collections(
        collection_type=catalog_type, sort_by=sort_by
    )
    collections_with_images = []
    for collection in collections:
        if collection.type == up42.glossary.CollectionType.ARCHIVE:
            product_type = (
                collection.metadata.product_type if collection.metadata else None
            )
            if product_type == type:
                title = collection.title
                name = collection.name
                resolution_class = (
                    collection.metadata.resolution_class
                    if collection.metadata
                    else None
                )
                if resolution_class in ["HIGH", "VERY_HIGH", "LOW", "MEDIUM"]:
                    value_min = (
                        collection.metadata.resolution_value.minimum
                        if collection.metadata and collection.metadata.resolution_value
                        else None
                    )
                    value_max = (
                        collection.metadata.resolution_value.maximum
                        if collection.metadata and collection.metadata.resolution_value
                        else None
                    )
                    # product_id = collection.data_products[0].id if collection.data_products else None
                    product_id = [
                        {
                            "id": product.id,
                            "title": product.title,
                            "des": product.description,
                        }
                        for product in collection.data_products
                    ]
                    # Retrieve images using the get_images function for the collection name
                    try:
                        images = get_images(name, geom, dates, cloud)
                    except Exception as e:
                        traceback.print_exc()

                    # If images are found, store collection details in a dictionary
                    if len(images) > 0:
                        collection_dict = {
                            "name": name,
                            "title": title,
                            "resolution_class": resolution_class,
                            "value_min": value_min,
                            "value_max": value_max,
                            "product_id": product_id,
                            "images": images,
                        }
                        # Add the collection with images to the result list
                        collections_with_images.append(collection_dict)
    return collections_with_images


def get_images(
    name,
    geom,
    dates,
    cloud=20,
):
    """
    Retrieves images for a specified collection within a given geographical area,
    date range, and maximum cloud cover.

    This function constructs search parameters based on the collection name, bounding
    box, date range, and cloud cover percentage. It queries the catalog and returns
    image data as a list of dictionaries containing key information.

    Parameters:
    - name (str): Name of the collection to search.
    - geom (list): Geographical bounding box coordinates.
    - dates (list): List containing start and end dates for the search. If only a start date is given, the end date is set to the day after the start date.
    - cloud (int, optional): Maximum allowable cloud cover percentage. Default is 20.

    Returns:
    - list of dict: A list of dictionaries, each containing image details such as geometry, scene ID, acquisition date, cloud coverage, and resolution.
    """

    # Ensure end date is set, defaulting to the day after start date if absent
    if not dates[1]:
        dates[1] = dates[0] + 1

    # Construct search parameters for the catalog query
    search_parameters = catalog.construct_search_parameters(
        collections=[name],
        geometry=geom,
        start_date=dates[0],
        end_date=dates[1],
        max_cloudcover=cloud,
        limit=10,
    )

    # Perform the search and store results in a DataFrame
    search_results_df = catalog.search(search_parameters)
    list_of_dicts = []

    # Check if any results were found
    if len(search_results_df) > 0:
        # Convert geometry field to a JSON-serializable format
        search_results_df["geometry"] = search_results_df["geometry"].apply(
            convert_geometry
        )

        # Add thumbnail column
        # search_results_df['thumbnail'] = search_results_df['providerProperties'].apply(lambda x: x.get('thumbnail') if isinstance(x, str) else None)

        # Select desired columns for the output
        desired_columns = search_results_df[
            ["geometry", "sceneId", "acquisitionDate", "cloudCoverage", "resolution"]
        ]

        # Convert DataFrame to a list of dictionaries
        list_of_dicts = desired_columns.to_dict(orient="records")

    return list_of_dicts


def get_image(
    name,
    scene_id,
):
    """
    Downloads a quicklook image for a specified scene within a collection.

    This function retrieves a quicklook image based on the collection name and scene ID.
    It saves the image to a specified directory and returns the output path for the downloaded file.

    Parameters:
    - name (str): Name of the collection from which to download the image.
    - scene_id (str): Unique identifier for the scene within the collection.

    Returns:
    - str: The file path where the quicklook image is saved.
    """
    # Download the quicklook image and specify the output directory
    output_path = catalog.download_quicklooks(
        image_ids=[scene_id],
        collection=name,
        output_directory="media/quicklooks/",
    )
    # Return the path to the downloaded image
    return output_path


def get_order_estimate(
    product_id,
    scene_id,
    geom,
):
    """
    Estimates the cost of ordering a specified image within a defined area of interest (AOI).

    This function constructs order parameters based on the product ID, scene ID, and
    geographic area, then calculates the estimated cost for ordering the image.

    Parameters:
    - product_id (str): The ID of the product to be ordered.
    - scene_id (str): The unique identifier of the image within the collection.
    - geom (list): Geographical bounding box or area of interest for the image order.

    Returns:
    - dict: A dictionary containing the estimated cost and related order details.
    """

    # Construct order parameters based on product ID, scene ID, and area of interest (AOI)
    order_parameters = catalog.construct_order_parameters(
        data_product_id=product_id, image_id=scene_id, aoi=geom
    )

    # Return the estimated cost for ordering the image
    return catalog.estimate_order(order_parameters=order_parameters)


def place_order(
    product_id,
    scene_id,
    geom,
):
    """
    Places an order for an image if sufficient credits are available.

    This function checks the available credits, estimates the cost of the order, and
    proceeds with placing the order if the available credits are sufficient. It returns
    the order ID and status upon successful order placement.

    Parameters:
    - product_id (str): The ID of the product to be ordered.
    - scene_id (str): Unique identifier of the image within the collection.
    - geom (list): Geographical bounding box or area of interest for the image order.

    Returns:
    - tuple: A tuple containing the order ID and order status if successful.
      Returns ("Insufficient", "Insufficient") if available credits are insufficient.
    """

    # Check available credits
    credits_info = up42.get_credits_balance()
    available_credits = credits_info["balance"]

    # Estimate the cost of the order
    order_params = catalog.construct_order_parameters(
        data_product_id=product_id, image_id=scene_id, aoi=geom
    )
    estimated_cost = catalog.estimate_order(order_params)

    # Check if available credits are sufficient for the estimated cost
    if estimated_cost > available_credits:
        return "Insufficient", "Insufficient"

    # Place the order and return the order ID and status
    order = catalog.place_order(order_parameters=order_params)
    return order.order_id, order.status


def get_order_status(
    order_id,
):
    """
    Retrieves the current status of a specified order.

    This function initializes an order based on the provided order ID and
    returns the current status of the order.

    Parameters:
    - order_id (str): The unique identifier of the order.

    Returns:
    - str: The current status of the order.
    """

    # Initialize the order using the given order ID
    order = up42.initialize_order(order_id=order_id)

    # Return the current status of the order
    return order.status


def convert_geometry(
    geometry,
):
    """
    Converts a geometry object to a JSON-serializable format if it is a POLYGON.

    This function checks if the provided geometry object is a POLYGON. If so, it parses
    the Well-Known Text (WKT) representation of the POLYGON and returns it in a format
    suitable for JSON serialization. If the geometry is not a POLYGON, it returns the
    original geometry object.

    Parameters:
    - geometry: The geometry object to be converted.

    Returns:
    - dict or geometry: A dictionary representing the polygon geometry or the original
      geometry if it is not a POLYGON.
    """

    # Check if the geometry object has a WKT representation and is a POLYGON
    if hasattr(geometry, "wkt") and geometry.wkt.startswith("POLYGON"):
        # Parse the POLYGON using the WKT representation
        coordinates = parse_polygon_wkt(geometry.wkt)

        # Return the converted geometry in a JSON-serializable format
        return {"type": "Polygon", "coordinates": coordinates}

    # Return the original geometry as-is if it's not a POLYGON object
    return geometry


def parse_polygon_wkt(
    polygon_wkt,
):
    """
    Parses a POLYGON Well-Known Text (WKT) representation and extracts the coordinates.

    This function uses a regular expression to extract the coordinate pairs from the
    WKT string representing a polygon. It returns a list of coordinate lists, with each
    inner list representing a point in the polygon.

    Parameters:
    - polygon_wkt (str): A WKT string representing a polygon.

    Returns:
    - list or None: A list containing lists of coordinates if parsing is successful;
      otherwise, returns None if the input WKT is malformed.
    """

    # Use regex to extract the coordinates from the POLYGON WKT string
    match = re.match(r"POLYGON \(\((.+?)\)\)", polygon_wkt.strip())
    if match:
        # Split the coordinates by comma and then by space
        coord_pairs = match.group(1).split(", ")
        coordinates = []

        # Iterate through the coordinate pairs
        for coord in coord_pairs:
            # Ensure the coordinate pair is well-formed
            cleaned_coord = coord.replace(")", "").replace("(", "").strip()
            try:
                # Convert each coordinate to float and append to the list
                coordinates.append(list(map(float, cleaned_coord.split())))
            except ValueError:
                traceback.print_exc()

        # Return a list of coordinates for the polygon
        return [coordinates]

    # Return None if the WKT string does not match the expected format
    return None


def get_download_asset_url_up42(
    order_id,
):
    """
    Downloads assets for a specified order from the UP42 platform.

    This function initializes an order using the provided order ID, retrieves the associated
    assets, and constructs download URLs for each asset. It returns a list of dictionaries
    containing the download URLs and corresponding file names.

    Parameters:
    - order_id (str): The unique identifier of the order for which to download assets.

    Returns:
    - list: A list of dictionaries, each containing a download URL and the asset name.
    """

    # Initialize the order using the given order ID
    order = up42.initialize_order(order_id=order_id)

    # Retrieve the assets associated with the order
    assets = order.get_assets()
    urls = []  # List to hold the download URLs and asset names

    # Iterate over each asset to retrieve download URLs
    for asset in assets:
        # Initialize the asset to get detailed information
        asset_init = up42.initialize_asset(asset_id=asset.asset_id)

        # Append the download URL and name to the list
        urls.append({"url": asset_init._get_download_url(), "name": f"{order_id}.zip"})

    # Return the list of URLs with their respective names
    return urls

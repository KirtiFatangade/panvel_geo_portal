import ee


def object_to_image(ee_object, vis_params):
    """
    Converts an Earth Engine object (Geometry, Feature, FeatureCollection, Image, or ImageCollection)
    to an image for visualization.

    Parameters:
        ee_object (ee.Geometry | ee.Feature | ee.FeatureCollection | ee.Image | ee.ImageCollection):
            The Earth Engine object to convert.
        vis_params (dict): Visualization parameters including color and width for styling.

    Returns:
        ee.Image: An image representation of the input Earth Engine object.
    """
    if isinstance(ee_object, (ee.Geometry, ee.Feature, ee.FeatureCollection)):
        # Convert Geometry, Feature, or FeatureCollection to a styled image
        features = ee.FeatureCollection(ee_object)
        color = vis_params.get("color", "000000")  # Default color is black
        image_outline = features.style(
            **{
                "color": color,
                "fillColor": "00000000",  # Transparent fill color
                "width": vis_params.get("width", 3),  # Default outline width
            }
        )
        return image_outline  # Return the styled image

    elif isinstance(ee_object, ee.Image):
        # If the input is already an Image, return it directly
        return ee_object

    elif isinstance(ee_object, ee.ImageCollection):
        # If the input is an ImageCollection, return a mosaic of the images
        return ee_object.mosaic()


def get_url(ee_object, vis_params):
    """
    Retrieves the URL for the visualization of an Earth Engine object.

    Parameters:
        ee_object (ee.Geometry | ee.Feature | ee.FeatureCollection | ee.Image | ee.ImageCollection):
            The Earth Engine object to visualize.
        vis_params (dict): Visualization parameters for the Earth Engine object.

    Returns:
        str: The URL for accessing the visualized Earth Engine object.
    """
    image = object_to_image(ee_object, vis_params)  # Convert the object to an image
    map_id_dict = ee.Image(image).getMapId(vis_params)  # Get the map ID for the image
    return map_id_dict[
        "tile_fetcher"
    ].url_format  # Return the URL format for fetching the image tiles

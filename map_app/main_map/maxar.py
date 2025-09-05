import leafmap.foliumap as leafmap
from leafmap import stac_tile
import os
import json
import pandas as pd
import geopandas as gpd


MAXAR_COLLECTIONS_DIR = "maxar_collections"
THRESHOLD_DF = pd.read_excel("media/maxar/threshold_dates.xlsx")
MAXAR = pd.read_csv("media/maxar/maxar.csv")
PRE = pd.read_csv("media/maxar/maxar_pre_highlight.csv")
POST = pd.read_csv("media/maxar/maxar_post_highlight.csv")


def get_collections(
    dataset,
    dataset_gdf_files_dir,
):
    """
    Retrieves collections from a specified dataset and saves them as GeoJSON files.

    This function fetches child collections of a given dataset, checks if corresponding
    GeoJSON files already exist, and if not, it retrieves the data and saves it.

    Args:
        dataset (str): The identifier for the dataset to fetch collections from.
        dataset_gdf_files_dir (str): The directory where GeoJSON files will be stored.

    Returns:
        None: This function does not return any value but prints the progress of file generation.
    """
    # Get the child collections from the specified dataset
    collections = leafmap.maxar_child_collections(dataset)
    print(f"Total collections: {len(collections)}")

    # Create the directory for storing GeoJSON files if it doesn't exist
    os.makedirs(dataset_gdf_files_dir, exist_ok=True)

    counter = 0  # Initialize a counter for tracking processed files

    for collection in collections:
        # Construct the file path for the GeoJSON file
        gdf_file_name = os.path.join(dataset_gdf_files_dir, collection + ".geojson")

        # Check if the GeoJSON file already exists
        if os.path.exists(gdf_file_name):
            # Read the existing GeoJSON file into a GeoDataFrame
            gdf = gpd.read_file(gdf_file_name)
        else:
            # Retrieve the GeoDataFrame for the collection and save it as a GeoJSON file
            gdf = leafmap.maxar_items(
                collection_id=dataset,
                child_id=collection,
                return_gdf=True,
                assets=["visual"],
            )
            gdf.to_file(
                gdf_file_name, driver="GeoJSON"
            )  # Save the GeoDataFrame as a GeoJSON file

        counter += 1  # Increment the counter for each processed collection
        print(f"{counter} file done!")  # Print progress


def maxar_list():
    """
    Retrieves the Maxar collections from the leafmap library.

    Returns:
        list: A list of Maxar collections.
    """
    return leafmap.maxar_collections()


def maxar_get_dates(
    dataset,
):
    """
    Retrieves pre and post dates for the specified dataset from the MAXAR DataFrame.

    Args:
        dataset (str): The name of the dataset for which to retrieve dates.

    Returns:
        tuple: A tuple containing two lists:
            - The first list contains pre dates.
            - The second list contains post dates.
    """
    # Filter the DataFrame for the specified dataset
    filtered_df = MAXAR[MAXAR["dataset"] == dataset]
    res_dict = filtered_df.to_dict(orient="records")

    # Check if any records were found
    if res_dict:
        try:
            # Safely evaluate the date strings
            pre_dates = eval(res_dict[0]["pre"])
            post_dates = eval(res_dict[0]["post"])
            return pre_dates, post_dates
        except (SyntaxError, NameError) as e:
            print(f"Error evaluating dates for dataset {dataset}: {e}")
            return ([], [])
    else:
        return ([], [])


def get_highlight(
    dataset,
    type,
):
    """
    Retrieve highlighted records for a specified dataset based on the type.

    This function filters either the PRE or POST DataFrame to find highlights
    related to a specific dataset. If highlights are found, they are returned
    as a list; otherwise, an empty list is returned.

    Args:
        dataset (str): The name of the dataset for which highlights are to be retrieved.
        type (str): The type of highlights to retrieve. Acceptable values are "pre" or "post".

    Returns:
        list: A list of highlights associated with the specified dataset. Returns an
              empty list if no highlights are found.
    """
    # Filter the DataFrame based on the specified type
    if type == "pre":
        filtered_df = PRE[PRE["dataset"] == dataset]  # Filter for pre highlights
    else:
        filtered_df = POST[POST["dataset"] == dataset]  # Filter for post highlights

    # Convert the filtered DataFrame to a list of dictionaries
    res_dict = filtered_df.to_dict(orient="records")

    # Check if there are any results and return the highlights
    if len(res_dict):
        return eval(
            res_dict[0]["highlight"]
        )  # Evaluate the highlight field to return its value
    else:
        return []  # Return an empty list if no highlights are found


def get_geo(
    dataset,
    collection,
):
    """
    Retrieve geographical data files for a given dataset and collection.

    Args:
        dataset (str): The name of the dataset to fetch data from.
        collection (list): A list containing two elements, each representing a collection
                           identifier (pre and post), formatted as "identifier|other_info".

    Returns:
        tuple: A tuple containing pre and post geographical data files. Each file is a list
               containing the loaded GeoJSON data and a STAC tile URL.
               Returns (None, None) if files do not exist.
    """
    dataset_gdf_files_dir = os.path.join(MAXAR_COLLECTIONS_DIR, dataset)
    pre_file, post_file = None, None
    print(dataset,collection)
    # Check if the first element of the collection is not None
    if collection[0] is not None:
        # Extract the pre collection identifier
        pre = collection[0].split("|")[0]
        # Load the pre GeoJSON file
        
        with open(os.path.join(dataset_gdf_files_dir, pre + ".geojson")) as file:
            pre_file = [
                json.load(file),  # Load GeoJSON data
                stac_tile(
                    f"https://raw.githubusercontent.com/opengeos/maxar-open-data/master/datasets/{dataset}/{pre}.json"
                ),
            ]

    # Check if the second element of the collection is not None
    if collection[1] is not None:
        # Extract the post collection identifier
        post = collection[1].split("|")[0]
        # Load the post GeoJSON file
        with open(os.path.join(dataset_gdf_files_dir, post + ".geojson")) as file:
            post_file = [
                json.load(file),  # Load GeoJSON data
                stac_tile(
                    f"https://raw.githubusercontent.com/opengeos/maxar-open-data/master/datasets/{dataset}/{post}.json"
                ),
            ]
    
    return pre_file, post_file

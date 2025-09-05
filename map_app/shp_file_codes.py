import geopandas as gpd
import json
import chardet
import pandas as pd


def detect_encoding(file_path):
    with open(file_path, "rb") as f:
        raw_data = f.read(100000)
        result = chardet.detect(raw_data)
    return result["encoding"]


def read_shapefile(file_path):
    try:
        return gpd.read_file(file_path)
    except UnicodeDecodeError:
        encoding = detect_encoding(file_path)
        return gpd.read_file(file_path, encoding=encoding)


def get_unique_filtered(value):
    return None if pd.isna(value) or value == "" else value


def build_nested_structure(shapefile_path):
    data_dict = {}
    gdf = read_shapefile(shapefile_path)
    for _, row in gdf.iterrows():
        division = get_unique_filtered(row["Division"])
        village = get_unique_filtered(row["Village"])
        prabhag = get_unique_filtered(row["Prabhag"])
        jurisdiction = get_unique_filtered(row["Jurisdicti"])

        if not division:
            continue

        data_dict.setdefault(division, {"Jurisdictions": {}})

        if jurisdiction:
            data_dict[division]["Jurisdictions"].setdefault(
                jurisdiction, {"Prabhags": {}}
            )

            if prabhag:
                data_dict[division]["Jurisdictions"][jurisdiction][
                    "Prabhags"
                ].setdefault(prabhag, {"Villages": set()})

                if village:
                    data_dict[division]["Jurisdictions"][jurisdiction]["Prabhags"][
                        prabhag
                    ]["Villages"].add(village)

    def convert_sets_to_lists(d):
        if isinstance(d, dict):
            return {k: convert_sets_to_lists(v) for k, v in d.items()}
        elif isinstance(d, set):
            return list(d)
        else:
            return d

    response_data = convert_sets_to_lists(data_dict)
    print(response_data)
    return response_data


def filter_and_save_geojson(
    shapefile_path,
    output_geojson,
    division=None,
    jurisdiction=None,
    prabhag=None,
    village=None,
):
    gdf = read_shapefile(shapefile_path)
    level = None

    if division:
        gdf = gdf[gdf["Division"] == division]
    if jurisdiction:
        gdf = gdf[gdf["Jurisdicti"] == jurisdiction]
    if prabhag:
        gdf = gdf[gdf["Prabhag"] == prabhag]
    if village:
        gdf = gdf[gdf["Village"] == village]

    if gdf.empty:
        print("⚠️ No records found with the given filter criteria.")
        return None

    gdf["level"] = level
    gdf.to_file(output_geojson, driver="GeoJSON") 

    print(f" Filtered GeoJSON saved: {output_geojson}")
    return output_geojson


if __name__ == "__main__":
    shapefile_path = "/home/service-vasundharaa/Desktop/vgt-geo-portal-web-app/map_app/Total_Builtup_May_2019_TotalConverted/Total_Builtup_May_2019_TotalConverted.shp"
    output_json_path = "output.json"

    nested_data = build_nested_structure(shapefile_path)

    with open(output_json_path, "w", encoding="utf-8") as json_file:
        json.dump(nested_data, json_file, indent=4, ensure_ascii=False)

    print(f"✅ JSON file saved: {output_json_path}")

    output_geojson = "filtered_output.geojson"

    filtered_file = filter_and_save_geojson(
        shapefile_path,
        output_geojson,
        division="Division4",
        jurisdiction="PMC",
        prabhag="prabhag 20",
        village="Kalundre (C.T.)",
    )

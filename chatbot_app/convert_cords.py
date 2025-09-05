import re
import pandas as pd
from shapely import wkt
from shapely.wkb import loads


def convert_wkt(geometry_text):
    geometry = wkt.loads(geometry_text)
    coordinates_list = []

    if geometry.geom_type == "Point":
        coordinates_list = [[geometry.x, geometry.y]]
    elif geometry.geom_type == "LineString" or geometry.geom_type == "LinearRing":
        coordinates_list = [[lon, lat] for lon, lat in geometry.coords]
    elif geometry.geom_type == "Polygon":
        coordinates_list = [[lon, lat] for lon, lat in geometry.exterior.coords]
    elif geometry.geom_type.startswith("Multi"):
        for geom in geometry.geoms:
            if geom.geom_type == "Point":
                coordinates_list.append([[geom.x, geom.y]])
            elif geom.geom_type == "LineString" or geom.geom_type == "LinearRing":
                coordinates_list.append([[lon, lat] for lon, lat in geom.coords])
            elif geom.geom_type == "Polygon":
                coordinates_list.append(
                    [[lon, lat] for lon, lat in geom.exterior.coords]
                )
    return coordinates_list


def convert_wkb(wkb_hex):
    geometry = loads(bytes.fromhex(wkb_hex))
    coordinates_list = []

    if geometry.geom_type == "Point":
        coordinates_list = [[geometry.x, geometry.y]]
    elif geometry.geom_type == "LineString" or geometry.geom_type == "LinearRing":
        coordinates_list = [[lon, lat] for lon, lat in geometry.coords]
    elif geometry.geom_type == "Polygon":
        coordinates_list = [[lon, lat] for lon, lat in geometry.exterior.coords]
    elif geometry.geom_type.startswith("Multi"):
        for geom in geometry.geoms:
            if geom.geom_type == "Point":
                coordinates_list.append([[geom.x, geom.y]])
            elif geom.geom_type == "LineString" or geom.geom_type == "LinearRing":
                coordinates_list.append([[lon, lat] for lon, lat in geom.coords])
            elif geom.geom_type == "Polygon":
                coordinates_list.append(
                    [[lon, lat] for lon, lat in geom.exterior.coords]
                )
    return coordinates_list


def convert_cord(geometry_text):
    # Check if the geometry_text is WKT or WKB
    if re.match(
        r"^\s*(POINT|POINT Z|LINESTRING|POLYGON|POLYGON Z|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(",
        geometry_text,
        re.IGNORECASE,
    ):
        return convert_wkt(geometry_text)
    elif re.match(r"^[0-9a-fA-F]+$", geometry_text):
        return convert_wkb(geometry_text)
    else:
        raise ValueError("Unrecognized format")


def check_col(data):
    if isinstance(data, str) and re.match(
        r"^\s*(POINT|POINT Z|LINESTRING|POLYGON|POLYGON Z|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*\(",
        data,
        re.IGNORECASE,
    ):
        return True
    if (
        isinstance(data, str)
        and len(data) >= 18
        and all(c in "0123456789abcdefABCDEF" for c in data)
    ):
        try:
            loads(data, hex=True)
        except:
            False
        return True
    else:
        return False


def check_wkb_cord(data):
    df = pd.DataFrame(data)
    exc_col = None
    for col in df.columns:
        if df[col].apply(check_col).any():
            exc_col = col
            df["coordinates"] = df[col].apply(lambda x: convert_cord(x))
    try:
        df.drop_duplicates(subset=["coordinates"], inplace=True)
    except:
        pass
    # if "geometry" in df.columns:
    #     df['coordinates'] = df['geometry'].apply(lambda x: convert_cord(x))
    # elif "geography" in df.columns:
    #     df['coordinates'] = df['geography'].apply(lambda x: convert_cord(x))
    # elif "geog_geometry" in df.columns:
    #     df['coordinates'] = df['geog_geometry'].apply(lambda x: convert_cord(x))

    return df.to_dict(orient="records"), exc_col

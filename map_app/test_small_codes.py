from sqlalchemy import create_engine, MetaData, inspect, text
from shapely.geometry import Point, LineString, Polygon, MultiLineString
import pandas as pd
from shapely.ops import unary_union
import geopandas as gpd
import ast
import traceback
from shapely import wkt
from sqlalchemy import text
import os
# username = "postgres"
# password = "admin"
# host = "localhost"
# port = "5432"
# database = "test"

username = os.getenv("PROD_DB_USER")
password = os.getenv("PROD_DB_PASS")
host =os.getenv("PROD_DB_HOST")
port = os.getenv("PROD_DB_PORT")
database = os.getenv("PROD_DB_DB")

connection_uri = f"postgresql://{username}:{password}@{host}:{port}/{database}"
engine = create_engine(connection_uri)

def get_table_names_sqlalchemy_reflection():
    metadata = MetaData()
    metadata.reflect(bind=engine)
    table_names = metadata.tables.keys()
    return list(table_names)

def get_unique_columns( table_name):
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    column_names = [column['name'] for column in columns]
    return column_names

def get_unique_values(table_name, column_name):
    query = text(f"SELECT DISTINCT {column_name} FROM {table_name}")
    with engine.connect() as connection:
        result = connection.execute(query)
        unique_values = [row[0] for row in result]
    return unique_values

def get_unique_values_from_dataframe(df, column_name):
    unique_values = df[column_name].unique().tolist()
    return unique_values

def filter_rows_by_unique_values(table_name, column_name, unique_values):
    if not isinstance(unique_values, list):
        raise ValueError("unique_values should be a list")
    unique_values_str = ', '.join([f"'{value}'" for value in unique_values])
    query = text(f"SELECT * FROM {table_name} WHERE {column_name} IN ({unique_values_str})")
    with engine.connect() as connection:
        result = connection.execute(query)
        rows = result.fetchall()
    columns = result.keys()
    out_file ="filtered_rows.csv"
    df = pd.DataFrame(rows, columns=columns)
    df.to_csv(out_file, index=False)
    return df, out_file

def classify_geometry(coords,s=False):
    if not coords or len(coords) == 0:
        return "Invalid coordinates"
    if len(coords) == 1:
        return Point if not s else "point"
    elif len(coords) == 2:
        return LineString if not s else "linestring"
    else:
        if coords[0] == coords[-1]:
            return Polygon if not s else 'polygon'
        else:
            return LineString if not s else "linestring"

        
def get_first_row_lat_long( table_name):
    query = text(f"SELECT latitude_longitude_geometry FROM {table_name} LIMIT 1")
    with engine.connect() as connection:
        result = connection.execute(query).fetchone()
        if result:
            geom_str = result[0]
            # print("geom_str",geom_str)
            try:
                # Safely evaluate the string to a Python object
                coords = ast.literal_eval(geom_str)
                # print("coords",coords)
                return coords
            except (ValueError, SyntaxError) as e:
                print(f"Error parsing coordinates: {e}")
                return None
        else:
            return None

def check_column_exists(engine, table_name):
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    column_names = [column['name'] for column in columns]
    column_exists = 'latitude_longitude_geometry' in column_names
    return column_exists

def filter_polygon_with_polygon(table_2_df, table_1_df):
    filtered_build_dict = {}
    table_1_polygon = table_1_df['latitude_longitude_geometry'].tolist()  
    for index, row in table_2_df.iterrows():
        geom = Polygon(eval(row['latitude_longitude_geometry']))
        for poly in table_1_polygon:
            if geom.within(poly):
                filtered_build_dict[index] = row.to_dict()
                break    
    if filtered_build_dict:
        df = pd.DataFrame.from_dict(filtered_build_dict, orient='index')
        output = 'filtered_buildings.csv'
        df.to_csv(output, index_label='unique_field')
    else:
        print("No filtered output")
        output = 'filtered_buildings.csv'
        with open(output, 'w') as f:
            f.write('')   
    return  output, df if filtered_build_dict else None

def filter_linestring_with_polygon(table_2_df, table_1_df):
    filtered_build_dict = {}
    table_1_polygons = [
        Polygon(eval(geom))
        for geom in table_1_df["latitude_longitude_geometry"].tolist()]
    for index, row in table_2_df.iterrows():
        coords = eval(row["latitude_longitude_geometry"])
        geom = LineString(coords)
        for poly in table_1_polygons:
            if geom.intersects(poly):
                intersection_result = geom.intersection(poly)
                row_dict = row.to_dict()
                if intersection_result.geom_type == "LineString":
                    row_dict["latitude_longitude_geometry"] = str(
                        list(intersection_result.coords)
                    )
                    filtered_build_dict[index] = row_dict
                elif intersection_result.geom_type == "MultiLineString":
                    for i, part in enumerate(intersection_result.geoms):
                        row_dict_copy = row_dict.copy()
                        row_dict_copy["latitude_longitude_geometry"] = str(
                            list(part.coords)
                        )
                        filtered_build_dict[f"{index}_{i}"] = row_dict_copy
                break
    if filtered_build_dict:
        df = pd.DataFrame.from_dict(filtered_build_dict, orient="index")
        output = "filtered_buildings.csv"
        df.to_csv(output, index_label="unique_field")
    else:
        print("No filtered output")
        output = "filtered_buildings.csv"
        with open(output, "w") as f:
            f.write("")
    return output, df if filtered_build_dict else None

def filter_point_with_polygon(table_2_df, table_1_df):
    filtered_build_dict = {}
    table_1_polygons = [Polygon(eval(geom)) for geom in table_1_df['latitude_longitude_geometry'].tolist()]
    for index, row in table_2_df.iterrows():
        point_geom = Point(eval(row['latitude_longitude_geometry']))        
        for poly in table_1_polygons:
            if point_geom.within(poly):
                filtered_build_dict[index] = row.to_dict()
                break    
    if filtered_build_dict:
        df = pd.DataFrame.from_dict(filtered_build_dict, orient='index')
        output = 'filtered_buildings.csv'
        df.to_csv(output, index_label='unique_field')
    else:
        print("No filtered output")
        output = 'filtered_buildings.csv'
        with open(output, 'w') as f:
            f.write('')   
    return output, df if filtered_build_dict else None


def convert_str_to_list(coord_str_list):
    try:
        # Use ast.literal_eval to safely evaluate the strings as Python literals
        coord_list = [ast.literal_eval(coord_str) for coord_str in coord_str_list]
        return coord_list
    except Exception as e:
        print(f"Error converting coordinates: {coord_str_list}")
        print(e)
        return []
    
def create_buffer(geometry, coord_before_buffer, buffer_in_meters):
    buffere_collection = []
    combined_buffers = []
    for coord in coord_before_buffer:
        try:
            if geometry == LineString:
                geometry_object = LineString(coord)
            if geometry == Polygon:
                geometry_object = Polygon(coord)
            if geometry == Point:
                geometry_object = Point(coord)
            gdf = gpd.GeoDataFrame([{'geometry': geometry_object}], crs="EPSG:4326")
            gdf_projected = gdf.to_crs(epsg=3857)
            gdf_projected['geometry'] = gdf_projected['geometry'].apply(lambda x: x.buffer(buffer_in_meters))
            gdf_buffered = gdf_projected.to_crs(epsg=4326)
            buffered_polygon = gdf_buffered.iloc[0].geometry
            buffere_collection.append(buffered_polygon)
        except Exception as e:
            traceback.print_exc()
            print(f"Error processing coordinates: {coord}")
            print(e)
    for buffer in buffere_collection:
        merged = False
        for i, combined_buffer in enumerate(combined_buffers):
            if combined_buffer.intersects(buffer):
                combined_buffers[i] = unary_union([combined_buffer, buffer])
                merged = True
                break
        if not merged:
            combined_buffers.append(buffer)
    return combined_buffers

import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
import json
import traceback

def check_build_inside_buffer(build_df, buffer_polygon):
    filtered_build_list = []
    count = 0
    coun = 0
    
    for _, value in build_df.iterrows():
        try:
            coun += 1
            building_geom = Polygon(eval(value['latitude_longitude_geometry']))
            for buffer in buffer_polygon:
                if building_geom.within(buffer):
                    count += 1
                    filtered_build_list.append({
                        'geometry': building_geom,
                        **value.to_dict()
                    })
                    break
        except Exception as e:
            print(f"Error processing row: {value}")
            print(e)
    
    # Create CSV output
    csv_output = 'buildings_in_buffer.csv'
    if filtered_build_list:
        df = pd.DataFrame([item for item in filtered_build_list])
        df.to_csv(csv_output, index_label='unique_field')
    else:
        print("No buildings within buffer")
        df = pd.DataFrame(columns=build_df.columns)
        df.to_csv(csv_output, index_label='unique_field')
    
    # Create GeoJSON output
    if filtered_build_list:
        gdf = gpd.GeoDataFrame(
            pd.DataFrame([item for item in filtered_build_list]),
            geometry=gpd.GeoSeries([item['geometry'] for item in filtered_build_list]),
            crs="EPSG:4326"
        )
        geojson = gdf.to_json()
    else:
        geojson = '{}'
    
    return coun, count, csv_output, geojson


def get_values_from_csv_column(csv_file_path):
    df = pd.read_csv(csv_file_path)
    values = df['latitude_longitude_geometry'].tolist()
    return values

def get_dataframe_from_table(table_name):
    
    query = f"SELECT * FROM {str(table_name)}"
    with engine.connect() as connection:
        result = connection.execute(text(query))
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
    return df
    


# username = "postgres"
# password = "admin"
# host = "localhost"
# port = "5432"
# database = "test"

# username = "vgt_admin"
# password = "portaldb123"
# host = "139.5.190.96"
# port = "5432"
# database = "vgt"

# table_names = get_table_names_sqlalchemy_reflection()
# print("table_names",table_names)
# table_name = input("Tabel Name :")
# if not table_name:
#     table_name = 'pune_ward_boundary'
# if check_column_exists(engine, table_name) == True:
#     coords = get_first_row_lat_long(table_name)
#     geometry = classify_geometry(coords)
#     print("geometry: ",geometry)
# column_names  = get_unique_columns(table_name)
# print("column name", column_names)
# column_name = input("Column Name :")
# if not column_name:
#     column_name = 'ward_no_'
# unique_values = get_unique_values(table_name, column_name)
# print("Unique Value",unique_values)
# # unique_values = list(map(int, input("select unique value").split(' ')))
# unique_values = input("select unique value").split(',')
# if not unique_values:
#     unique_values = [29]
# table_1_df, filtered_rows_csv = filter_rows_by_unique_values(table_name, column_name, unique_values)

# if geometry == Polygon:
#     print("SELECT ONE OPERATION : Choose_Another_Table | ","Extract_Buildings | ","Extract_Result")
#     Next_Operation = input("Choose next operation :")
#     if not Next_Operation:
#         Next_Operation = 'Choose_Another_Table'
#     if Next_Operation == "Choose_Another_Table":
#         table_names = get_table_names_sqlalchemy_reflection()
#         print("table_names",table_names)
#         table_name2 = input("Choose second table Name :")
#         if not table_name2:
#             table_name2 = 'aoi_road_network'
#         if check_column_exists(engine, table_name) == True:
#             coord = get_first_row_lat_long(table_name2)
#             geometry_2 = classify_geometry(coord)
#             print("geometry of second table: ",geometry_2)
#             table_2_df = get_dataframe_from_table(table_name2)
#             # table_2_coords = table_2_df['latitude_longitude_geometry'].tolist()
#             # table_1_coords = table_1_df['latitude_longitude_geometry'].tolist()
#             if geometry_2 == Polygon:
#                 geometry_2 = Polygon
#                 coun, count, output, df = filter_polygon_with_polygon(table_2_df, table_1_df)
#                 column_names  = get_unique_columns(engine, table_name2)
#                 print("column name", column_names)
#                 column_name_from_second_table = input("Column Name :")
#                 if not column_name_from_second_table:
#                     column_name_from_second_table = 'name'
#                 unique_values_of_second_table = get_unique_values_from_dataframe(df, column_name_from_second_table)
#                 print("Unique Value",unique_values_of_second_table)
#                 unique_values = input("select unique value").split(',')
#                 if not unique_values:
#                     unique_values = ['bajirao road']
#                 table_2_filtered_df, table_2_filtered_rows_csv = filter_rows_by_unique_values(table_name, column_name_from_second_table, unique_values)
#                 print("Choose Next Operation : Extract_Buildings | ","Extract_Result")
#                 Next_Operation = input()
#                 if not Next_Operation:
#                     Next_Operation = 'Exract Buildings'
#                 if Next_Operation == "Extract Result":
#                     out = table_2_filtered_rows_csv

#                 if Next_Operation == "Extract Buildings":
#                     print("Enter buffer region in meters")
#                     buffer = input()
#                     if not buffer:
#                         buffer = 100
#                     table_2_filtered_coords = table_2_filtered_df['latitude_longitude_geometry'].tolist()
#                     table_2_filtered_coord = convert_str_to_list(table_2_filtered_coords)
#                     list_of_buffer_region = create_buffer(geometry_2,table_2_filtered_coord,buffer)
#                     build_df = get_dataframe_from_table(engine, 'aoi_building')
#                     total_building_count, building_count_inside_buffer,output = check_build_inside_buffer(build_df,list_of_buffer_region)
#                     print("Total building count",total_building_count)
#                     print("building_count_inside_buffer",building_count_inside_buffer)

#             elif geometry_2 == LineString:#or MultiLineString:
#                 geometry_2 = LineString
#                 coun, count, output, df = filter_linestring_with_polygon(table_2_df, table_1_df)
#                 column_names  = get_unique_columns(engine, table_name2)
#                 print("column name", column_names)
#                 column_name_from_second_table = input("Column Name :")
#                 if not column_name_from_second_table:
#                     column_name_from_second_table = 'name'
#                 unique_values_of_second_table = get_unique_values_from_dataframe(df, column_name_from_second_table)
#                 print("Unique Value",unique_values_of_second_table)
#                 unique_values = input("select unique value").split(',')
#                 if not unique_values:
#                     unique_values = ['bajirao road']
#                 table_2_filtered_df, table_2_filtered_rows_csv = filter_rows_by_unique_values(table_name2, column_name_from_second_table, unique_values)
#                 print("Choose Next Operation : Extract_Buildings | ","Extract_Result")
#                 Next_Operation = input()
#                 if not Next_Operation:
#                     Next_Operation = 'Extract_Buildings'
#                 if Next_Operation == "Extract_Result":
#                     out = table_2_filtered_rows_csv

#                 if Next_Operation == "Extract_Buildings":
#                     print("Enter buffer region in meters")
#                     buffer = int(input())
#                     if not buffer:
#                         buffer = 100
#                     table_2_filtered_coords = table_2_filtered_df['latitude_longitude_geometry'].tolist()
#                     print("buffer_coords",table_2_filtered_coords)
#                     print("typeeeeee",type(table_2_filtered_coords))
#                     table_2_filtered_coord = convert_str_to_list(table_2_filtered_coords)
#                     list_of_buffer_region = create_buffer(geometry_2, table_2_filtered_coord,buffer)
#                     build_df = get_dataframe_from_table(engine, 'aoi_building')
#                     total_building_count, building_count_inside_buffer,output = check_build_inside_buffer(build_df,list_of_buffer_region)
#                     print("Total building count",total_building_count)
#                     print("building_count_inside_buffer",building_count_inside_buffer)

#             elif geometry_2 == Point:
#                 geometry_2 == Point
#                 coun, count, output, df = filter_point_with_polygon(table_2_df, table_1_df)
#                 column_names  = get_unique_columns(engine, table_name2)
#                 print("column name", column_names)
#                 column_name_from_second_table = input("Column Name :")
#                 unique_values_of_second_table = get_unique_values_from_dataframe(df, column_name_from_second_table)
#                 print("Unique Value",unique_values_of_second_table)
#                 unique_values = [input("Unique Value :")]
#                 table_2_filtered_df, table_2_filtered_rows_csv = filter_rows_by_unique_values(table_name2, column_name, unique_values)
#                 print("Extract Buildings","Extract Result")
#                 Next_Operation = input()
#                 if Next_Operation == "Extract Result":
#                     out = table_2_filtered_rows_csv
#                 if Next_Operation == "Extract Buildings":
#                     print("Enter buffer region in meters")
#                     buffer = int(input())
#                     table_2_filtered_coords = table_2_filtered_df['latitude_longitude_geometry'].tolist()
#                     table_2_filtered_coord = convert_str_to_list(table_2_filtered_coords)
#                     list_of_buffer_region = create_buffer(geometry_2, table_2_filtered_coord,buffer)
#                     build_df = get_dataframe_from_table(engine, 'aoi_building')
#                     total_building_count, building_count_inside_buffer,output = check_build_inside_buffer(build_df,list_of_buffer_region)
#                     print("Total building count",total_building_count)
#                     print("building_count_inside_buffer",building_count_inside_buffer)

#     elif Next_Operation == "Extract_Buildings":
#         print("Enter buffer region in meters")
#         buffer = int(input())
#         table_2_filtered_coords = table_1_df['latitude_longitude_geometry'].tolist()
#         table_2_filtered_coord = convert_str_to_list(table_2_filtered_coords)
#         list_of_buffer_region = create_buffer(geometry, table_2_filtered_coord,buffer)
#         build_df = get_dataframe_from_table(engine, 'aoi_building')
#         total_building_count, building_count_inside_buffer,output = check_build_inside_buffer(build_df,list_of_buffer_region)
#         print("Total building count",total_building_count)
#         print("building_count_inside_buffer",building_count_inside_buffer)
#     elif Next_Operation == "Extract_Result":
#         out = filtered_rows_csv
# else:
#     print("SELECT ONE OPERATION : Extract_Buildings","Extract_Result")
#     Next_Operation = input()
#     if Next_Operation == "Extract_Buildings":
#         # geometry = LineString
#         print("Enter buffer region in meters")
#         buffer = int(input())
#         table_1_filtered_coords = table_1_df['latitude_longitude_geometry'].tolist()
#         print("before_table_1_filtered_coords",table_1_filtered_coords)
#         table_1_filtered_coords = convert_str_to_list(table_1_filtered_coords)
#         print("after_table_1_filtered_coords",table_1_filtered_coords)
#         list_of_buffer_region = create_buffer(geometry, table_1_filtered_coords,buffer)
#         build_df = get_dataframe_from_table(engine, 'aoi_building')
#         total_building_count, building_count_inside_buffer,output = check_build_inside_buffer(build_df,list_of_buffer_region)
#         print("Total building count",total_building_count)
#         print("building_count_inside_buffer",building_count_inside_buffer)
#     elif Next_Operation == "Extract_Result":
#         out = filtered_rows_csv




# table_names = get_table_names_sqlalchemy_reflection(engine)
# column_name  = get_unique_columns(engine, table_name)
# unique_values = get_unique_values(table_name, column_name)



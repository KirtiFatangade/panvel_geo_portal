from django.conf import settings
import time
from langchain_community.utilities.sql_database import SQLDatabase
from langchain.chains import create_sql_query_chain
import os
import re
import csv
import json
import google.generativeai as genai
from decimal import Decimal
from geoalchemy2 import Geometry
from sqlalchemy import create_engine, text
import geopandas as gpd
import psycopg2
from psycopg2 import sql
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAI
from .convert_cords import *


os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")
if google_api_key:
    genai.configure(api_key=google_api_key)
database_username = os.getenv("PROD_DB_USER")
database_password = os.getenv("PROD_DB_PASS")
database_ip = os.getenv("PROD_DB_HOST")
database_port = os.getenv("PROD_DB_PORT")


def get_media_url(file_system_path):
    relative_path = os.path.relpath(file_system_path, settings.MEDIA_ROOT)
    media_url = os.path.join(settings.MEDIA_URL, relative_path)
    return media_url


def modify_query_dynamically(sql_query):
    def replace_subquery_with_exists(match):
        subquery = match.group(2)
        main_geometry = match.group(1)
        subquery_table, subquery_condition = re.search(
            r"FROM\s+(\w+)\s+WHERE\s+(.+)", subquery, re.IGNORECASE
        ).groups()
        return (
            f"EXISTS (SELECT 1 FROM {subquery_table} WHERE {subquery_condition} "
            f"AND ST_Intersects({main_geometry}, geometry::geography))"
        )

    pattern = re.compile(
        r"ST_Intersects\((\w+::geography),\s*\((SELECT\s+.+?\s+FROM\s+\w+\s+WHERE\s+.+?)\)\)",
        re.IGNORECASE | re.DOTALL,
    )

    if pattern.search(sql_query):
        modified_query = pattern.sub(replace_subquery_with_exists, sql_query)
    else:
        modified_query = sql_query

    return modified_query


def query_loop(queries, chat_id, id, prompt, db_name):
    print("PROMPT : ",prompt)
    csv_directory = os.path.join(settings.MEDIA_ROOT, "chatbotcsv")
    os.makedirs(csv_directory, exist_ok=True)
    paths = []
    connection = create_connection(db_name)
    for idx, sql_query in enumerate(queries):
        print("-" * 50)
        print(type(sql_query))
        print(sql_query.strip().replace("```sql", "").strip())
        print("-" * 50)
        if "delete" not in sql_query.lower():
            output = None
            try:
                output = connection._execute(
                    modify_query_dynamically(
                        sql_query.strip().replace("```sql", "").strip()
                    )
                )

                # print("OUTPUT", output)
                print("TYPE OF OUTPUT[0]", type(output[0]))
            except Exception as e:

                response_text = "Can't perform this analysis. Try with another prompt"
                continue
            # output = convert_decimal_to_float(output)

            if not len(output):
                response_text = "No Data Available"
                continue
            csv_file_path = os.path.join(
                csv_directory,
                f"chatbot_response_{chat_id}_{id}_{idx}_{int(time.time())}.csv",
            )
            if isinstance(output, list) and len(output) > 0:

                output, exc_col = check_wkb_cord(output)
                write_dict_list_to_csv(output, csv_file_path)
            geometries = []

            for outs in output:
                if isinstance(outs, dict) and "coordinates" in outs.keys():

                    geometry_type = "MultiPolygon"  # Default to MultiPolygon; can be adjusted based on actual type

                    if len(outs["coordinates"]) == 1 and isinstance(
                        outs["coordinates"][0][0], list
                    ):
                        geometry_type = "Polygon"
                    elif isinstance(outs["coordinates"][0][0], list):
                        geometry_type = "MultiPolygon"
                    elif len(outs["coordinates"]) == 1:
                        geometry_type = "Point"
                        outs["coordinates"] = outs["coordinates"][0]
                    elif len(outs["coordinates"][0]) == 2 and isinstance(
                        outs["coordinates"][0][0], float
                    ):
                        geometry_type = "LineString"
                    elif len(outs["coordinates"]) > 1:
                        geometry_type = "MultiLineString"
                    properties = {}
                    for i in outs.keys():
                        if i not in ["coordinates", str(exc_col)]:
                            properties[i] = outs[i]
                    geometries.append(
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": geometry_type,
                                "coordinates": outs["coordinates"],
                            },
                            "properties": properties,
                        }
                    )
            if len(output) == 1 and not (
                isinstance(output[0], dict) and "coordinates" in output[0].keys()
            ):
                gemini_prompt = f"Phrase this response : {output[0]} properly for this question : {prompt} "
                print(gemini_prompt)
                response_text = gemini_chatbot(gemini_prompt)
                continue

            if len(geometries):
                geometries = {
                    "type": "FeatureCollection",
                    "features": geometries,
                }
                geo_file_path = os.path.join(
                    csv_directory,
                    f"chatbot_response_{chat_id}_{id}_{idx}_{int(time.time())}.geojson",
                )
                with open(geo_file_path, "w") as final:
                    json.dump(geometries, final)
                paths.append(get_media_url(geo_file_path))

            response_text = f"Total Fetched Records : {len(output)}"

            write_dict_list_to_csv(output, csv_file_path)
            paths.append(get_media_url(csv_file_path))
        else:
            print("cant perform deletion of records!")
    return response_text, paths


def gemini_chatbot(prompt):
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    text_response = response.text
    # Markdown(text_response)
    # return response.text
    return text_response


def convert_decimal_to_float(data):
    if isinstance(data, list):
        for item in data:
            for key, value in item.items():
                if isinstance(value, Decimal):
                    item[key] = float(value)
    return data


def write_dict_list_to_csv(data, filename="output.csv"):
    keys = data[0].keys()
    with open(filename, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)


def create_connection(db_name):
    engine = create_engine(
        f"postgresql+psycopg2://{database_username}:{database_password}@{database_ip}/{db_name}"
    )
    connection = SQLDatabase(engine)
    return connection


def create_chain(db_name):
    connection = create_connection(db_name)
    print("connection",connection)
    llm = GoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=0,
        max_output_tokens=None,
        max_retries=2,
        timeout=None,
    )
    # llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo")
    chain = create_sql_query_chain(llm, connection, k=10000000)
    return chain


def check_db(db_name):
    conn = psycopg2.connect(
        dbname="postgres",
        user=database_username,
        password=database_password,
        host=database_ip,
        port=database_port,
    )
    conn.autocommit = (
        True  # This allows executing CREATE DATABASE outside of a transaction
    )

    # Open a cursor to perform database operations
    cur = conn.cursor()

    # Check if the database exists
    cur.execute(sql.SQL("SELECT 1 FROM pg_database WHERE datname = %s"), [str(db_name)])

    # If the database doesn't exist, create it
    if cur.fetchone() is None:
        try:
            cur.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(str(db_name)))
            )
            print(f"Database '{db_name}' created.")
            return True
        except Exception as e:
            print(e)
            return False
    else:
        print(f"Database '{db_name}' already exists.")

    # Close communication with the database
    cur.close()
    conn.close()
    return True


def get_chat_response(prompt, db_name):
    check_db(db_name)
    base_prompt = "Generate a SQL query for GIS operations. Convert geometry to geography type for operations requiring geography type and use realtionships between tables wherever required."
    # base_prompt = """You are an intelliginet AI chatbot and an sql expert.
    #     You are given a prompt by user and you have to respond accordingly.
    #     In addition if the user requires to need certain data from the database,
    #     generate a SQL query for GIS operations. Convert geometry to geography type for operations
    #     requiring geography type and use realtionships between tables wherever required.
    #     If you cant find common columns to join use geometry column.
    #     Where required convert the crs of all the tables that are being used. Chage back to original crs.
    # """
    chain = create_chain(db_name)
    try:
        sql_queries = chain.invoke({"question": f"{base_prompt} : {prompt}"})
        queries = sql_queries.strip().split(";")
        queries = [
            query.strip()
            for query in queries
            if query.strip() and len(query) > 15 and not query.startswith("LIMIT")
        ]
        return queries
    except Exception as e:
        print(e)

    return None


def get_chat_response_base(prompt, db_name):
    check_db(db_name)
    print("db name", db_name)
    chain = create_chain(db_name)
    try:
        sql_queries = chain.invoke({"question": f"{prompt}"})
        queries = sql_queries.strip().split(";")
        queries = [
            query.strip()
            for query in queries
            if query.strip() and len(query) > 15 and not query.startswith("LIMIT")
        ]
        return queries
    except Exception as e:
        print(e)

    return None


def enable_postgis(engine):
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.commit()
            print("PostGIS extension enabled.")
        except Exception as e:
            print(f"Error enabling PostGIS: {e}")


def upload_shp(db_name, path, file_name):
    if check_db(db_name):
        engine = create_engine(
            f"postgresql+psycopg2://{database_username}:{database_password}@{database_ip}/{db_name}"
        )
        table_name = file_name.lower()
        shapefile_path = os.path.join(path, file_name)
        print(shapefile_path)
        primary_key_column = "id"
        gdf = gpd.read_file(shapefile_path + ".shp")

        gdf.columns = [col.lower() for col in gdf.columns]
        non_geometry_columns = [col for col in gdf.columns if col != "geometry"]

        for col in non_geometry_columns:
            gdf[col] = gdf[col].apply(lambda x: x.lower() if isinstance(x, str) else x)
        enable_postgis(engine)
        print(f"Original CRS: {gdf.crs}")
        if gdf.crs.to_string() != "EPSG:4326":
            gdf = gdf.to_crs(epsg=4326)
        print(f"Converted CRS: {gdf.crs}")

        gdf.to_postgis(
            name=table_name,
            con=engine,
            schema="public",
            if_exists="replace",
            dtype={"geometry": Geometry("geometry", srid=4326)},
        )

        with engine.connect() as conn:

            remove_id_column = f"""
            ALTER TABLE "{table_name}"
            DROP COLUMN IF EXISTS id;
            """

            add_primary_key_column_sql = f"""
            ALTER TABLE "{table_name}"
            ADD COLUMN {primary_key_column} SERIAL PRIMARY KEY;
            """

            try:
                print(f"Executing SQL to remove id column: {remove_id_column}")
                conn.execute(text(remove_id_column))
                conn.commit()
                print(f"Executing SQL to add primary key: {add_primary_key_column_sql}")
                conn.execute(text(add_primary_key_column_sql))
                conn.commit()
                print(f"Primary key column '{primary_key_column}' added successfully.")
            except Exception as e:
                print(e)

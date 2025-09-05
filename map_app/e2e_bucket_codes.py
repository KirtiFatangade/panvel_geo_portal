import os
import traceback
from minio import Minio

# Initialize the MinIO client with credentials from environment variables
eos_client = Minio(
    "mum-objectstore.e2enetworks.net",
    access_key=os.getenv("EOS_ACCESS"),
    secret_key=os.getenv("EOS_SECRET"),
    secure=True,
)


def list_bucket(
    bucket_name,
    prefix,
    recursive=False,
):
    """
    Lists objects in a specified bucket with a given prefix.

    Args:
        bucket_name (str): Name of the bucket to list objects from.
        prefix (str): Prefix to filter objects in the bucket.
        recursive (bool): Whether to list objects recursively.

    Returns:
        tuple: A tuple containing:
            - total_size (float): Total size of the listed objects in MB.
            - object_details (list): A list of dictionaries containing details of each object.
    """
    objects = eos_client.list_objects(bucket_name, prefix, recursive)
    try:
        total_size = 0.0
        object_details = []
        for obj in objects:
            size_mb = obj.size / (1024**2)  # Convert size to MB
            total_size += size_mb
            object_details.append(
                {
                    "bucket_name": obj.bucket_name,
                    "object_name": obj.object_name,
                    "last_modified": obj.last_modified,
                    "size_mb": size_mb,
                }
            )
    except Exception as e:
        traceback.print_exc()
    return total_size, object_details


def get_object(
    bucket_name,
    object_path,
    output_file_path,
):
    """
    Downloads an object from a bucket and saves it to a local file.

    Args:
        bucket_name (str): Name of the bucket containing the object.
        object_path (str): Path of the object in the bucket.
        output_file_path (str): Local path to save the downloaded object.
    """
    try:
        data = eos_client.get_object(bucket_name, object_path)
        with open(output_file_path, "wb") as file_data:
            for d in data.stream(32 * 1024):  # Stream data in chunks of 32 KB
                file_data.write(d)
    except Exception as e:
        traceback.print_exc()


def presigned_get_object(
    bucket_name,
    object_name,
):
    """
    Generates a pre-signed URL for accessing an object.

    Args:
        bucket_name (str): Name of the bucket containing the object.
        object_name (str): Path of the object in the bucket.

    Returns:
        str: Pre-signed URL for the object.
    """
    return eos_client.presigned_get_object(bucket_name, object_name)


def put_object(
    bucket_name,
    object_path,
    input_file_path,
    content_type,
):
    """
    Uploads a local file to a bucket.

    Args:
        bucket_name (str): Name of the bucket to upload the file to.
        object_path (str): Path in the bucket to save the file.
        input_file_path (str): Local path of the file to upload.
        content_type (str): MIME type of the file.
    """
    try:
        with open(input_file_path, "rb") as file_data:
            file_stat = os.stat(input_file_path)
            eos_client.put_object(
                bucket_name,
                object_path,
                file_data,
                file_stat.st_size,
                content_type=content_type,
            )
    except Exception as e:
        traceback.print_exc()


def remove_object(
    bucket_name,
    object_path,
):
    """
    Removes an object from a bucket.

    Args:
        bucket_name (str): Name of the bucket containing the object.
        object_path (str): Path of the object in the bucket.
    """
    try:
        eos_client.remove_object(bucket_name, object_path)
    except Exception as e:
        traceback.print_exc()


def rename_folder(
    bucket_name,
    old_folder_path,
    new_folder_path,
):
    """
    Renames a folder in a bucket by copying its contents to a new path and deleting the old contents.

    Args:
        bucket_name (str): Name of the bucket containing the folder.
        old_folder_path (str): Current path of the folder.
        new_folder_path (str): New path for the folder.
    """
    try:
        objects = eos_client.list_objects(bucket_name, old_folder_path, recursive=True)
        for obj in objects:
            old_object_name = obj.object_name
            new_object_name = old_object_name.replace(
                old_folder_path, new_folder_path, 1
            )
            # Copy the object to the new folder
            eos_client.copy_object(
                bucket_name, new_object_name, f"{bucket_name}/{old_object_name}"
            )
            # Remove the old object
            eos_client.remove_object(bucket_name, old_object_name)
    except Exception as e:
        traceback.print_exc()


# sample examples
# list_bucket(os.getenv("E2E_BUCKET_NAME"), "", False)
# get_object(os.getenv("E2E_BUCKET_NAME"), "123.zip", "456.zip")
# put_object(os.getenv("E2E_BUCKET_NAME"), "ravi/test.png", "./test.png", "image/png")
# remove_object(os.getenv("E2E_BUCKET_NAME"), "123.zip")

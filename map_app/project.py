from map_app.models import Project, User, Organization, Activity, FilePaths
from django.http import JsonResponse, HttpResponse, FileResponse
from .e2e_bucket_codes import *
from .geoserver_func import check_layer_enable, check_layer_enable_ras
import traceback


def create(
    id,
    owner,
    name,
    data,
    path,
):
    """
    Creates a new project entry in the database, saves its associated metadata,
    and uploads related files to a storage bucket. Optionally, deletes the local
    files after uploading them.

    Args:
        id (int): ID of the user who owns or is associated with the project.
        owner (str): The type of owner, either "user" or "org". Determines whether
                     the project is tied to a user or an organization.
        name (str): The name of the project.
        data (list): A list representing the children or sub-elements associated with the project.
        path (list): A list of file paths to be uploaded to the storage bucket.

    Returns:
        HttpResponse: HTTP response with status 200 on success, or 400 on failure.
    """
    try:
        # Retrieve the user by their ID
        memb = User.objects.get(id=id)

        # Prepare metadata for the project
        metadata = {"name": name, "type": "parent", "children": data}

        # Create a new project with the appropriate owner (user or organization)
        pro = Project(
            project_name=name,
            org_id=memb.organization if owner == "org" else None,
            member_id=memb if owner == "user" else None,
            metadata=metadata,
        )
        pro.save()  # Save the project entry to the database

        # If paths are provided, upload files to the storage bucket
        if path:
            for file_path in path:
                # Extract the file name from the path
                file_name = file_path.split("/")[-1]

                # Upload the file to the storage bucket
                put_object(
                    os.getenv("E2E_BUCKET_NAME"),
                    f"{memb.username}-{memb.organization.name}/{name}/{file_name}",
                    file_path,
                    "application/zip",
                )

                # Remove the local file if it exists
                if os.path.exists(file_path):
                    os.remove(file_path)

        # Return success response
        return HttpResponse(status=200)
    except Exception as e:
        traceback.print_exc()

        # Return failure response
        return HttpResponse(status=400)


def add_layer(pro_id, memb_id, name, id, bounds, type, path):
    try:
        pro = Project.objects.get(id=pro_id)
        memb = User.objects.get(id=memb_id)
        metadata = pro.metadata
        metadata["children"].append(
            {"name": id, "id": name, "bounds": bounds, "type": type}
        )
        pro.metadata = metadata
        pro.save()
        if os.path.exists(path):
            file_name = path.split("/")[-1]
            put_object(
                os.getenv("E2E_BUCKET_NAME"),
                f"{memb.username}-{memb.organization.name}/{pro.project_name}/{file_name}",
                path,
                "application/zip",
            )
        return HttpResponse(status=200)
    except Exception as e:
        print(e)
        return HttpResponse(status=400)


def add_geo_layer(pro_id, layer_name, type, name):
    try:
        pro = Project.objects.get(id=pro_id)

        if type == "vector":
            l_name, bounds = check_layer_enable(layer_name)
        else:
            bounds = check_layer_enable_ras(layer_name)
        print(bounds)
        if bounds:
            metadata = pro.metadata
            metadata["children"].append(
                {"name": name, "id": layer_name, "bounds": bounds, "type": type}
            )
            pro.metadata = metadata
            pro.save()
            return HttpResponse(status=200)
        else:
            return HttpResponse(status=400)
    except Exception as e:
        print(e)
        return HttpResponse(status=400)


def count_layers(data):
    print(data)
    count = 0
    for i in data:
        if i["type"] == "parent":
            count += count_layers(i["children"])
        else:
            count += 1
    return count


def migrate(pro_id, acts):
    try:
        pro = Project.objects.get(id=pro_id) if "newNAME" not in pro_id else None
        metadata = pro.metadata if pro else {"children": []}
        memb = Activity.objects.get(id=acts[0]["id"]).member_id
        if memb.organization.name == "global":
            count = count_layers(metadata["children"]) if pro else None
            if count:
                if count + len(acts) > 10:
                    return HttpResponse(status=201)

        for i in acts:
            act_old = Activity.objects.get(id=i["id"])
            if act_old.type != "analysis":
                if act_old.type == "view":
                    act = Activity.objects.get(id=act_old.parent_id)
                else:
                    act = act_old
                if not memb:
                    memb = act.member_id
                if "file-path" in act.data:
                    file_obj = FilePaths.objects.get(id=act.data["file-path"])
                    if file_obj:
                        file_obj.delete()

                data = {
                    "name": i["name"],
                    "id": (
                        f"{i['name']}#{act.data['name']}"
                        if act.type == "draw"
                        else i["name"] if act.type == "layer" else act.data["id"]
                    ),
                    "type": (
                        "draw"
                        if act.type == "draw"
                        else "sat" if act.type == "layer" else act.data["type"]
                    ),
                    **(
                        {
                            "bounds": act.data["bound"],
                            "draw-type": act.data["name"],
                            "coords": act.data["coords"],
                        }
                        if act.type == "draw"
                        else (
                            {
                                "add": act.data["name"],
                                "date": act.data["date"],
                                "vis": act.data["vis"],
                                "url": act.data["url"],
                                "feat_id": act.data["feat_id"],
                            }
                            if act.type == "layer"
                            else {"bounds": act.data["bounds"]}
                        )
                    ),
                }
            else:
                data = {
                    "id": act_old.id,
                    "name": i["name"],
                    "type": act_old.data["format"],
                    "geo": act_old.data["geo"] if "geo" in act_old.data else None,
                }
            # if "newNAME" not in pro_id and memb.organization.name=="global":
            #     count=count_layers(metadata)
            #     if count
            metadata["children"].append(data)
        if not pro:
            metadata = {
                "name": pro_id.split("NAME")[1],
                "type": "parent",
                "children": metadata["children"],
            }
            pro = Project(project_name=pro_id.split("NAME")[1], member_id=memb)
        print(metadata)
        print(pro)

        pro.metadata = metadata

        pro.save()
        return HttpResponse(status=200)
    except Exception as e:
        print(e)
        return HttpResponse(status=400)


def fetch(id):
    try:
        pro = Project.objects.get(id=id)
        return JsonResponse({"metadata": pro.metadata}, status=200)
    except:
        return JsonResponse({"error:Unexpected Error"}, status=400)


def update(pro_id, data):
    try:
        pro = Project.objects.get(id=pro_id)
        pro.metadata = data
        pro.save()
        return HttpResponse(status=200)
    except Exception as e:
        print(e)
        return HttpResponse(status=400)

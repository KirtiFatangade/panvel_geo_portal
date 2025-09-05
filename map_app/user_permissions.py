from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from map_app.models import Organization, SurveyField, User, Role, Project
from django.shortcuts import render, redirect, reverse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from map_app.models import User, Organization


content_mods = {
    "permission": "Permission",
    "organization": "Organisation",
    "role": "Role",
    "member": "User",
}


def getCurrentOrganization(member_id):
    try:
        member = User.objects.get(id=member_id)
        organization = member.organization
        return organization
    except (User.DoesNotExist, AttributeError):
        return None


def manage_permissions(
    request,
    pk,
):
    user = User.objects.get(id=pk)
    user_permission_with_models = {}
    models_to_include = [Organization, Role, User, Project]
    custom_permissions=["add_org_project","delete_org_project","view_org_project","change_org_project"]
    custom_metadata=[]
    for model in models_to_include:
        content_type = ContentType.objects.get_for_model(model)
        model_permissions = Permission.objects.filter(content_type=content_type)
        model_permissions_metadata = []

        for model_permission in model_permissions:
            
            permission_name = (
                f"{model_permission.content_type.app_label}.{model_permission.codename}"
            )
            has_permission = user.has_perm(permission_name)

            permission_data = {
                "id": model_permission.id,
                "codename": model_permission.codename,
                "has_permission": has_permission,
            }
            if model_permission.codename not in custom_permissions:
                model_permissions_metadata.append(permission_data)
            else:
                custom_metadata.append(permission_data)

        user_permission_with_models[model.__name__] = model_permissions_metadata
    user_permission_with_models["Organization Projects"]=custom_metadata
    return JsonResponse(user_permission_with_models)


def update_permissions(request, user_id, permission_id, status):
    try:
        user = User.objects.get(id=user_id)
        print(f"User ID: {user_id}")

        permission = Permission.objects.get(id=permission_id)
        if status == "0":
            print("removed")
            user.user_permissions.remove(permission)
        elif status == "1":
            print("added")
            user.user_permissions.add(permission)
            print(f"Permission ID: {permission_id}")

        user.save()
        user_permissions = list(
            Permission.objects.filter(user=user).values_list("codename", flat=True)
        )

        return JsonResponse(
            {
                "message": "User and permission IDs updated successfully.",
                "user_permissions": user_permissions,
            }
        )
    except (User.DoesNotExist, Permission.DoesNotExist) as e:
        return JsonResponse({"error": str(e)}, status=404)


def assignPermissions(request):
    context = {"title": "Assign Permissions"}
    query_model = request.GET.get("user_permission_model")
    query_member = request.GET.get("member_id")
    if query_member:
        context["member_id"] = int(query_member)
    if query_model and query_member != "-" and query_model != "-":
        current_member = User.objects.get(id=query_member)
        permissions = Permission.objects.filter(content_type_id=query_model).all()
        context["content_type_id"] = int(query_model)
        context["permissions"] = permissions
    if request.method == "POST":
        for permission in permissions:
            active = int(request.POST.get(permission.codename))
            if current_member.has_perm(
                permission.content_type.app_label + "." + permission.codename
            ):
                if active:
                    continue
                else:
                    current_member.member_permissions.remove(permission)
            else:
                if active:
                    current_member.member_permissions.add(permission)
        return
    current_organization = getCurrentOrganization(request)
    members = User.objects.filter(organization=current_organization)
    context["members"] = members
    content_types = []
    for content in ContentType.objects.all():
        if content.model in content_mods.keys():
            content.model = content_mods[content.model]
            content_types.append(content)
    context["content_types"] = content_types
    return render(
        request=request,
        context=context,
    )


def deletePermissions(request, pk):
    current_member = User.objects.get(id=pk)
    permissions = Permission.objects.filter(user=current_member).all()
    for permission in permissions:
        current_member.member_permissions.remove(permission)
    return redirect("core.manage_permissions")
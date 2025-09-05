from sre_constants import SUCCESS
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseServerError,
)
from .cloud import upload_image
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from django.utils import timezone
import requests
import traceback
from .models import (
    Organization,
    SurveyField,
    User,
    Role,
    Project,
    Attribute,
    Selfcache,
    OrganizationRequest,
    Plan,
    CreditPointsTransaction,
)
from django.contrib.auth.models import Permission
from .cloud import upload_image, short_url
from .verify import send_email, send_welcome_mail_with_coupon
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import traceback
import threading
from .models import User, Attribute, Feature
from django.conf import settings
import base64
from django.contrib.auth.models import Permission
from .verify import send_email
import re
from functools import wraps

# views.py
from rest_framework import status
from django.shortcuts import get_object_or_404
from datetime import datetime
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from cryptography.fernet import Fernet
import random
import uuid
from django.utils import timezone
from .gemini_api_integration import *
import logging

logger = logging.getLogger(__name__)
from django.views.decorators.csrf import csrf_exempt
import json
import string
import random
import base64
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image
import urllib
from .consts import *


def auth_permission_check_decorator(perms):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            try:
                username = None
                if "user_info" in request.session:
                    username = request.session["user_info"]["username"]
                if not username:
                    raise User.DoesNotExist("User does not exist!")
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return JsonResponse(
                    {"message": "user does not exists!", "success": False}, safe=False
                )
            if not user.is_superuser and not request.session["user_info"]["is_admin"]:
                for perm in perms:
                    if not user.has_perm(perm):
                        return JsonResponse(
                            {
                                "message": "User does not have permission to perform this action.",
                                "success": False,
                            },
                            safe=False,
                        )
            return view_func(request, *args, **kwargs)

        return wrapped_view

    return decorator


@csrf_exempt
def login_user(request):
    if request.method == "POST":
        data = json.loads(request.body)
        print(data)
        identifier = data.get("member_email") or data.get("username")
        password = data["password"]

        # Fetch the user object based on email or username
        try:
            if "@" in identifier:
                user_obj = User.objects.get(email=identifier)
            else:
                user_obj = User.objects.get(username=identifier)
        except User.DoesNotExist:
            return JsonResponse({"error": "Invalid email or username"}, status=400)

        user = authenticate(username=user_obj.username, password=password)

        if user_obj.verified:
            if user is not None:
                login(request, user)
                user_permissions = list(
                    Permission.objects.filter(user=user).values_list(
                        "codename", flat=True
                    )
                )
                org_projects_count = Project.objects.filter(
                    org_id=user_obj.organization.id
                ).count()

                user_projects_count = Project.objects.filter(
                    member_id=user_obj.id
                ).count()

                org_projects_count = Project.objects.filter(
                    org_id=user_obj.organization.id
                ).count()
                user_projects_count = Project.objects.filter(
                    member_id=user_obj.id
                ).count()
                plan = None
                plan_obj = user_obj.organization.plan
                if plan_obj:
                    plan = plan_obj.type
                else:
                    if user_obj.organization.name == "global":
                        plan = 0
                    else:
                        try:
                            plan_obj = Plan.objects.get(type=1)
                        except:
                            pass
                        if not plan_obj:
                            plan_obj = Plan.objects.create(type=1)
                            plan_obj.save()
                        org_obj = user_obj.organization
                        org_obj.plan = plan_obj
                        org_obj.save()
                        plan = 1
                # if user_obj.is_superuser:
                #     if not user_obj.credits:
                #         user_obj.credits = 5000
                #         user_obj.save()
                #         user_obj.organization.credits = 5000
                #         user_obj.organization.save()
                user_info = {
                    "username": user_obj.username,
                    "first_name": user_obj.first_name,
                    "last_name": user_obj.last_name,
                    "number": str(user_obj.number),
                    "email_address": user_obj.email,
                    "id": user_obj.id,
                    "is_admin": user_obj.email == user_obj.organization.email_address,
                    "org_name": user_obj.organization.name,
                    "org_id": user_obj.organization.id,
                    "is_superuser": user_obj.is_superuser,
                    "model_names": {
                        "organization_model": Organization.__name__,
                        "role_model": Role.__name__,
                        "user_model": User.__name__,
                        "project_model": Project.__name__,
                    },
                    "user_permissions": user_permissions,
                    "org_projects": org_projects_count,
                    "user_projects": user_projects_count,
                    "plan": plan,
                    # "credits": (
                    #     user_obj.organization.credits
                    #     if user_obj.email == user_obj.organization.email_address
                    #     else user_obj.credits
                    # ),
                }
                request.session["user_info"] = user_info

                response = JsonResponse(
                    {"message": "Login successful", "user_info": user_info}, status=200
                )
                return response
            else:
                return JsonResponse({"error": "Invalid email or password"}, status=400)
        else:
            return JsonResponse(
                {"error": "Email not verified. Please verify to log-in"}, status=400
            )
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


def logout(request):
    try:
        response = HttpResponse()
        request.session.flush()
        for cookie_name in request.COOKIES:
            response.delete_cookie(cookie_name)
        return response
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=402)


def login_time(request, id):
    user = User.objects.get(id=id)
    loginTime = user.last_login
    local_time = timezone.localtime(loginTime)
    formatted_time = local_time.strftime("%Y-%m-%d %H:%M:%S")
    return JsonResponse({"loginTime": formatted_time})


@csrf_exempt
def sign_up(request):
    if request.method == "POST":
        data = json.loads(request.body)
        password = data["password"]
        hashed_password = make_password(password)

        if User.objects.filter(email=data["member_email"]).exists():
            print("email exists")
            return JsonResponse({"error": "Email already registered"}, status=400)
        elif User.objects.filter(username=data["username"]).exists():
            print("Username exists")
            return JsonResponse({"error": "Username already registered"}, status=400)
        elif User.objects.filter(number=data["number"]).exists():
            return JsonResponse({"error": "Number already registered"}, status=400)
        organization_instance = None

        if data["type"] == "user":
            organizations = Organization.objects.filter(name="global")
            if organizations.exists():
                organization_instance = organizations.first()
            else:
                organization_instance = Organization.objects.create(
                    name="global",
                    website_name="panvel.in",
                    email_address="panvel@gmail.com",
                )
                organization_instance.save()
        else:
            plan_obj = None
            try:
                plan_obj = Plan.objects.get(type=data["org_plan"])
            except:
                pass
            if not plan_obj:
                plan_obj = Plan.objects.create(type=data["org_plan"])
                plan_obj.save()
            organization_instance = Organization.objects.create(
                name=data["org_name"],
                website_name=data["org_website"],
                email_address=data["member_email"],
                contact_number=data["number"],
                address=data["org_add"],
                plan=plan_obj,
            )
            organization_instance.save()

        new_user = User.objects.create(
            organization=organization_instance,
            first_name=data["fname"],
            last_name=data["lname"],
            username=data["username"],
            number=data["number"],
            email=data["member_email"],
            password=hashed_password,
            verified=True,
        )
        permission_codenames = [
            "view_project",
            "view_project",
            "change_project",
            "delete_project",
            "add_project",
        ]
        permissions = Permission.objects.filter(codename__in=permission_codenames)
        for permission in permissions:
            new_user.user_permissions.add(permission)
        new_user.save()
       
        return JsonResponse(
            {"success": True, "message": "User registered successfully"}, status=201
        )

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


def save_member(attributes):
    (
        organization_instance,
        username,
        first_name,
        last_nam,
        number,
        email,
        password,
    ) = attributes
    member_instance = User.objects.create(
        organization=organization_instance,
        first_name=first_name,
        last_name=last_nam,
        username=username,
        number=number,
        email=email,
        password=password,
        verified=True,
    )
    member_instance.save()

    attribute_instance = Attribute(id=member_instance)
    attribute_instance.save()


@auth_permission_check_decorator(["map_app.add_organization"])
def create_organizations(request):
    if request.method == "POST":
        data = request.POST
        print(data)
        logo = request.FILES.get("logo")

        if Organization.objects.filter(
            email_address=data["organization_email"]
        ).exists():
            print("email exists")
            return JsonResponse({"error": "Email already registered"}, status=400)
        elif Organization.objects.filter(name=data["name"]).exists():
            print("Username exists")
            return JsonResponse(
                {"error": "Organization name already registered"}, status=400
            )
        elif Organization.objects.filter(contact_number=data["number"]).exists():
            return JsonResponse({"error": "Number already registered"}, status=400)
        organization_instance = None

        organization_instance = Organization.objects.create(
            name=data["name"],
            contact_number=data["number"],
            email_address=data["organization_email"],
            website_name=data["website_name"],
            address=data["address"],
            logo=logo,
        )
        organization_instance.save()

        random_password = "".join(
            random.choices(string.ascii_letters + string.digits, k=12)
        )
        admin_password = make_password(random_password)

        print("Random Password:", random_password)
        print("Hashed Password:", admin_password)

        admin_attributes = [
            organization_instance,
            "admin_" + data["name"],
            "admin",
            "admin",
            data.get("number"),
            data.get("organization_email", ""),
            admin_password,
        ]
        save_member(admin_attributes)

        return JsonResponse(
            {
                "success": True,
                "message": "Organziation created successfully",
                "random_password": random_password,
            },
            status=201,
        )
    else:
        return JsonResponse({"success": False}, status=500)


@auth_permission_check_decorator(["map_app.view_organization"])
def read_organization(request, email):
    try:
        member = User.objects.get(id=email)
        organizations = member.organization
        is_super = member.is_superuser
        if not organizations:
            return JsonResponse(
                {
                    "message": "No organizations found for the provided organziation email"
                },
                status=404,
            )
        if is_super:
            organizations = Organization.objects.all()
            data = [
                {
                    "id": organization.id,
                    "name": organization.name,
                    "email_address": organization.email_address,
                    "website_name": organization.website_name,
                    "number": str(
                        organization.contact_number
                        if organization.contact_number
                        else "-"
                    ),
                    "address": organization.address if organization.address else "-",
                    "logo": (
                        organization.logo.url
                        if organization.logo and hasattr(organization.logo, "url")
                        else "-"
                    ),
                    "credits": organization.credits,
                }
                for organization in organizations
            ]
            print(data)
        else:
            data = [
                {
                    "id": organizations.id,
                    "name": organizations.name,
                    "email_address": organizations.email_address,
                    "website_name": organizations.website_name,
                    "number": str(
                        organizations.contact_number
                        if organizations.contact_number
                        else "-"
                    ),
                    "address": organizations.address if organizations.address else "-",
                    "logo": (
                        organizations.logo.url
                        if organizations.logo and hasattr(organizations.logo, "url")
                        else "-"
                    ),
                    "credits": organizations.credits,
                }
            ]

        return JsonResponse(data, safe=False)
    except Exception as e:
        logger.error("Error fetching organizations: %s", str(e))
        return JsonResponse({"error": "Internal Server Error"}, status=500)


@auth_permission_check_decorator(["map_app.change_organization"])
def update_organization(request):
    try:
        if request.method == "POST":
            data = request.POST
            print("Received Data:", data)

            organization_id = data.get("organization_id")
            if not organization_id:
                print("Missing organization_id")
                return JsonResponse({"error": "Missing organization ID"}, status=400)

            try:
                organization = Organization.objects.get(id=organization_id)
                print("Organization found:", organization.name)
            except Organization.DoesNotExist:
                print("Organization not found")
                return JsonResponse({"error": "Organization not found"}, status=404)

            if "name" in data:
                organization.name = data["name"]
            if "email_address" in data:
                organization.email_address = data["email_address"]
            if "website_name" in data:
                organization.website_name = data["website_name"]
            if "number" in data:
                organization.contact_number = data["number"]
            if "address" in data:
                organization.address = data["address"]
            if "logo" in request.FILES:
                organization.logo = request.FILES["logo"]

            organization.save()
            print("Organization updated successfully")
            return JsonResponse({"message": "Update successful"})

    except Exception as e:
        print("Exception:", str(e))  # Print error if anything goes wrong
        return JsonResponse({"error": str(e)}, status=500)


@auth_permission_check_decorator(["map_app.delete_organization"])
def delete_organization(request):
    print(request)
    if request.method == "POST":
        data = json.loads(request.body)
        organization_id = data.get("organization_id")
        try:
            organization_instance = Organization.objects.get(pk=organization_id)
            organization_instance.delete()

            return JsonResponse(
                {"success": True, "message": "Organization deleted successfully"},
                status=200,
            )
        except Organization.DoesNotExist:
            return JsonResponse({"error": "organization not found"}, status=404)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@auth_permission_check_decorator(["map_app.add_user"])
def create_member(request, id):
    if request.method == "POST":
        print(request.user)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({"error": f"JSON decode error: {e}"}, status=400)
        password = data["password"]
        hashed_password = make_password(password)
        for key, value in data.items():
            if not value:
                return JsonResponse({"error": f"{key} is required"}, status=400)
        try:
            logged_in_member = User.objects.get(id=id)
        except User.DoesNotExist:
            return JsonResponse({"error": "Logged-in member not found"}, status=404)
        organization_instance = logged_in_member.organization
        if not organization_instance:
            return JsonResponse({"error": "Organization not found"}, status=404)
        if User.objects.filter(email=data.get("email")).exists():
            return JsonResponse({"error": "Email already exists"}, status=400)
        elif User.objects.filter(username=data.get("name")).exists():
            return JsonResponse({"error": "Username already exists"}, status=400)
        elif User.objects.filter(number=data.get("number")).exists():
            return JsonResponse({"error": "Number already exists"}, status=400)
        member_instance = User.objects.create(
            organization=organization_instance,
            first_name=data["first_name"],
            last_name=data["last_name"],
            username=data["name"],
            number=data["number"],
            email=data["email"],
            password=hashed_password,
            verified=False,  # Mark user as not verified initially
        )

        permission_codenames = [
            "view_organization",
            "view_project",
            "view_user",
            "view_project",
            "change_project",
            "delete_project",
            "add_project",
            "view_org_project",
        ]
        permissions = Permission.objects.filter(codename__in=permission_codenames)
        for permission in permissions:
            member_instance.user_permissions.add(permission)
        member_instance.save()
        attribute_instance = Attribute(id=member_instance)
        attribute_instance.save()
        # Send verification email
        send_email(data["email"])
        return JsonResponse(
            {
                "message": "User created successfully. Please verify your email.",
                "success": True,
            },
            status=201,
        )
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


@auth_permission_check_decorator(["map_app.view_user"])
def read_member(
    request,
    pk,
):
    memb = User.objects.get(id=pk)
    members = User.objects.filter(organization__id=memb.organization.id)

    data = [
        {
            "id": member.id,
            "username": member.username,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "number": str(member.number),
            "email": member.email,
            "is_admin": member.email == member.organization.email_address,
            "permissions": list(
                Permission.objects.filter(user=member).values_list(
                    "codename", flat=True
                )
            ),
            "credits": member.credits,
        }
        for member in members
    ]

    return JsonResponse({"success": True, "data": data}, safe=False)


def read_member_one(request, email):
    memb = User.objects.get(id=email)
    data = [
        {
            "id": memb.id,
            "username": memb.username,
            "first_name": memb.first_name,
            "last_name": memb.last_name,
            "number": str(memb.number),
            "email": memb.email,
            "credits": memb.credits,
        }
    ]

    return JsonResponse(data, safe=False)


@auth_permission_check_decorator([])
def update_member_one(request, id):
    try:
        if request.method == "POST":
            data = json.loads(request.body)
            member = User.objects.get(id=id)
            org = member.organization
            admin = member.email == org.email_address
            user_permissions = list(
                Permission.objects.filter(user=member).values_list(
                    "codename", flat=True
                )
            )

        if "username" in data:
            member.username = data["username"]

        if "first_name" in data:
            member.first_name = data["first_name"]

        if "last_name" in data:
            member.last_name = data["last_name"]

        if "email" in data:
            member.email = data["email"]

        if "number" in data:
            member.number = data["number"]

        if admin:

            if "email" in data:
                org.email_address = data["email"]

            if "number" in data:
                org.contact_number = data["number"]

        user_info = {
            "username": member.username,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "number": str(member.number),
            "email_address": member.email,
            "id": member.id,
            "org_name": member.organization.name,
            "is_admin": member.email == member.organization.email_address,
            "user_permissions": user_permissions,
        }
        request.session["user_info"] = user_info
        member.save()
        org.save()
        return HttpResponse(status=200)

    except ObjectDoesNotExist:
        return JsonResponse({"error": "User not found", "success": True}, status=404)

    except Exception as e:
        traceback.print_exc()
        return HttpResponseServerError(str(e))


@auth_permission_check_decorator(["map_app.change_user"])
def update_member(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body)
            member_id = data["member_id"]
            member = User.objects.get(id=member_id)
            org = member.organization
            admin = member.email == org.email_address

        if "username" in data:
            member.username = data["username"]

        if "first_name" in data:
            member.first_name = data["first_name"]

        if "last_name" in data:
            member.last_name = data["last_name"]

        if "email" in data:
            member.email = data["email"]

        if "number" in data:
            member.number = data["number"]

        if admin:

            if "email" in data:
                org.email_address = data["email"]

            if "number" in data:
                org.contact_number = data["number"]

        member.save()
        org.save()
        return HttpResponse(status=200)

    except ObjectDoesNotExist:
        return JsonResponse({"error": "User not found", "success": True}, status=404)

    except Exception as e:
        traceback.print_exc()
        return HttpResponseServerError(str(e))


@auth_permission_check_decorator(
    [
        "map_app.delete_user",
    ]
)
def delete_member(request):
    print(request)
    if request.method == "POST":
        data = json.loads(request.body)
        member_id = data.get("member_id")

        try:
            member_instance = User.objects.get(pk=member_id)

            member_instance.delete()

            return JsonResponse(
                {"success": True, "message": "User deleted successfully"}, status=200
            )
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


# create_role
@auth_permission_check_decorator(["map_app.add_role"])
def create_role(request):
    if request.method == "POST":
        data = json.loads(request.body)
        organization_name = data.get("organization_name")
        roles = None
        try:
            organization_instance = Organization.objects.get(name=organization_name)
        except Organization.DoesNotExist:
            return JsonResponse({"error": "Organization not found"}, status=404)
        try:
            roles = Role.objects.get(
                name=data.get("name"), organization=organization_instance
            )
        except:
            pass
        if not roles:
            role_instance = Role(
                name=data.get("name"),
                is_active=data.get("is_active"),
                organization=organization_instance,
            )
            role_instance.save()
        else:
            pass

        return JsonResponse(
            {"message": "Role created successfully", "success": True}, status=201
        )
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


# view role
@auth_permission_check_decorator(["map_app.view_role"])
def view_role(request, id):
    # Fetch all member instances
    org = User.objects.get(id=id).organization
    roles = Role.objects.filter(organization=org)

    data = [
        {
            "id": role.id,
            "name": role.name,
            "is_active": bool(role.is_active),
            "organization_id": role.organization.id,
            "organization_name": role.organization.name if role.organization else None,
        }
        for role in roles
    ]
    print(data)
    return JsonResponse({"success": True, "data": data}, safe=False)


# change/update role
@auth_permission_check_decorator(["map_app.change_role"])
def update_role(request):
    try:
        if request.method == "POST":
            data = json.loads(request.body)
            print(data)
            role_id = data.get("role_id")
            role = Role.objects.get(id=role_id)

        if "name" in data:
            role.name = data["name"]

        if "is_Active" in data:
            role.access = data["is_Active"]

        role.save()
        return JsonResponse({"message": "Updated role successfully", "success": True})

    except ObjectDoesNotExist:
        return JsonResponse({"error": "role not found"}, status=404)

    except Exception as e:
        traceback.print_exc()
        return HttpResponseServerError(str(e))


# delete role
@auth_permission_check_decorator(["map_app.delete_role"])
def delete_role(request):
    print(request)
    if request.method == "POST":
        data = json.loads(request.body)
        # Assuming you're passing role's ID for deletion
        role_id = data.get("role_id")

        try:
            # Fetch the role instance
            role_instance = Role.objects.get(pk=role_id)

            # Delete the role
            role_instance.delete()

            return JsonResponse(
                {"success": True, "message": "role deleted successfully"}, status=200
            )
        except Role.DoesNotExist:
            # If role with provided ID does not exist
            return JsonResponse({"error": "role not found"}, status=404)

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


# read_attributes
def read_attributes(request):
    id = request.GET.get("user_id")

    try:
        attribute = Attribute.objects.get(id=id)
        data = {"id": attribute.id.name, "member_id": attribute.member_id}

        return JsonResponse(data)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "Attribute not found"}, status=404)


# update attribute
def update_attribute(request):
    print(request.GET)

    try:
        pass
    except ObjectDoesNotExist:
        return JsonResponse({"error": "Organization not found"}, status=404)


def fetch_projects(request, email):
    try:
        member = User.objects.get(id=email)
    except User.DoesNotExist:
        return JsonResponse({"error": "User does not exist"}, status=400)

    org_id = member.organization_id
    org_pro = Project.objects.filter(org_id_id=org_id)

    organization_projects = []
    member_projects = []

    for project in org_pro:
        organization_projects.append(
            {
                "id": project.id,
                "name": project.project_name,
                "created_at": project.created_at,
                "updated_at": project.updated_at,
            }
        )

    # Fetch members of the organization
    memb_id = member.id
    memb_pro = Project.objects.filter(member_id_id=memb_id)

    for project in memb_pro:
        member_projects.append(
            {
                "id": project.id,
                "name": project.project_name,
                "created_at": project.created_at,
                "updated_at": project.updated_at,
            }
        )
    return JsonResponse(
        {
            "organization_projects": organization_projects,
            "member_projects": member_projects,
        }
    )


def fetch_projects_all(request):
    try:
        pro = Project.objects.all()
        projects = []
        for project in pro:
            projects.append(
                {
                    "id": project.id,
                    "name": project.project_name,
                }
            )
        return JsonResponse(
            {
                "projects": projects,
            }
        )

    except Exception as e:
        traceback.print_exc()


def get_media_url(file_system_path):
    relative_path = os.path.relpath(file_system_path, settings.MEDIA_ROOT)
    media_url = os.path.join(settings.MEDIA_URL, relative_path)
    return media_url


# Chathistory
def get_media_url(file_system_path):
    relative_path = os.path.relpath(file_system_path, settings.MEDIA_ROOT)
    media_url = os.path.join(settings.MEDIA_URL, relative_path)
    return media_url


def change_plan(request, id):
    try:
        data = json.loads(request.body)
        user_object = User.objects.get(id=id)
        if not user_object:
            return HttpResponse(status=400)
        plan_instance = None
        try:
            plan_instance = Plan.objects.get(type=data["org_plan"])
        except:
            pass
        if not plan_instance:
            plan_instance = Plan.objects.create(type=data["org_plan"])
            plan_instance.save()
        if user_object.organization.name == "global":
            organization_instance = Organization.objects.create(
                name=data["org_name"],
                website_name=data["org_web"],
                email_address=user_object.email,
                contact_number=user_object.number,
                address=data["org_add"],
                plan=plan_instance,
            )
            organization_instance.save()
            user_object.organization = organization_instance
            user_object.save()

        else:
            organization_instance = user_object.organization
            organization_instance.plan = plan_instance
            organization_instance.save()
        user_permissions = list(
            Permission.objects.filter(user=user_object).values_list(
                "codename", flat=True
            )
        )
        org_projects_count = Project.objects.filter(
            org_id=user_object.organization.id
        ).count()

        user_projects_count = Project.objects.filter(member_id=user_object.id).count()

        org_projects_count = Project.objects.filter(
            org_id=user_object.organization.id
        ).count()
        user_projects_count = Project.objects.filter(member_id=user_object.id).count()
        plan = plan_instance.type
        user_info = {
            "username": user_object.username,
            "first_name": user_object.first_name,
            "last_name": user_object.last_name,
            "number": str(user_object.number),
            "email_address": user_object.email,
            "id": user_object.id,
            "is_admin": user_object.email == user_object.organization.email_address,
            "org_name": user_object.organization.name,
            "is_superuser": user_object.is_superuser,
            "model_names": {
                "organization_model": Organization.__name__,
                "role_model": Role.__name__,
                "user_model": User.__name__,
                "project_model": Project.__name__,
            },
            "user_permissions": user_permissions,
            "org_projects": org_projects_count,
            "user_projects": user_projects_count,
            "plan": plan,
        }
        request.session["user_info"] = user_info
        return HttpResponse(status=200)
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=400)


fernet_key = os.getenv("FERNET_KEY")
fernet = Fernet(fernet_key)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


@csrf_exempt
def send_otp(request, email):
    try:
        user = get_object_or_404(User, email=email)

        # Generate new OTP and OTP key
        otp = "".join([str(random.randint(0, 9)) for _ in range(4)])
        otp_key = uuid.uuid4().hex[:8]

        cache = Selfcache(cache_id=otp_key, opt=otp)
        cache.save()

        # Sending email logic...
        os.environ["GOOGLE_AUTH_SUPPRESS_CREDENTIALS_WARNINGS"] = "true"
        creds = None
        if os.path.exists("config_files/token.json"):
            creds = Credentials.from_authorized_user_file(
                "config_files/token.json", SCOPES
            )
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    "config_files/credentials.json", SCOPES
                )
                creds = flow.run_local_server(port=0, launch_browser=False)
        service = build("gmail", "v1", credentials=creds)
        message = MIMEMultipart()
        message["to"] = user.email
        message["subject"] = "Subject: OTP for Password Reset"
        message_text = f"Your OTP is: {otp}"
        message.attach(MIMEText(message_text))
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": raw_message}
        sent_message = (
            service.users().messages().send(userId="me", body=create_message).execute()
        )
        print(f'Sent message to {message["to"]}. Message Id: {sent_message["id"]}')
        print("Message sent successfully.")

        return JsonResponse({"key": otp_key}, status=200)

    except User.DoesNotExist:
        return JsonResponse(
            {"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        print(f"An error occurred: {e}")
        return JsonResponse(
            {"error": "Failed to send OTP. Error: {}".format(str(e))},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
def send_otp_key(request, email, key):
    try:
        user = get_object_or_404(User, email=email)

        # Generate new OTP and OTP key
        otp = "".join([str(random.randint(0, 9)) for _ in range(4)])
        otp_key = key

        cache = Selfcache.objects.get(cache_id=key)
        cache.opt = otp
        cache.save()

        # Sending email logic...
        os.environ["GOOGLE_AUTH_SUPPRESS_CREDENTIALS_WARNINGS"] = "true"
        creds = None
        if os.path.exists("config_files/token.json"):
            creds = Credentials.from_authorized_user_file(
                "config_files/token.json", SCOPES
            )
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    "config_files/credentials.json", SCOPES
                )
                creds = flow.run_local_server(port=0, launch_browser=False)
        service = build("gmail", "v1", credentials=creds)

        message = MIMEMultipart()
        message["to"] = user.email
        message["subject"] = "Subject: OTP for Password Reset"
        message_text = f"Your OTP is: {otp}"
        message.attach(MIMEText(message_text))
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": raw_message}

        sent_message = (
            service.users().messages().send(userId="me", body=create_message).execute()
        )
        print(f'Sent message to {message["to"]}. Message Id: {sent_message["id"]}')
        print("Message sent successfully.")

        return JsonResponse({"key": otp_key}, status=200)

    except User.DoesNotExist:
        return JsonResponse(
            {"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        print(f"An error occurred: {e}")
        return JsonResponse(
            {"error": "Failed to send OTP. Error: {}".format(str(e))},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def send_signup_verification_otp(request, email, username):
    try:

        if User.objects.filter(username=username).exists():
            return JsonResponse(
                {"error": "Username already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return JsonResponse(
                {"error": "Email already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = "".join([str(random.randint(0, 9)) for _ in range(4)])
        otp_key = uuid.uuid4().hex[:8]

        cache = Selfcache(cache_id=otp_key, opt=otp)
        cache.save()

        os.environ["GOOGLE_AUTH_SUPPRESS_CREDENTIALS_WARNINGS"] = "true"
        creds = None
        if os.path.exists("config_files/token.json"):
            creds = Credentials.from_authorized_user_file(
                "config_files/token.json", SCOPES
            )
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    "config_files/credentials.json", SCOPES
                )
                creds = flow.run_local_server(port=0, launch_browser=False)

        service = build("gmail", "v1", credentials=creds)

        message = MIMEMultipart()
        message["to"] = email
        message["from"] = "support@dharaatech.in"
        message["subject"] = "Subject: OTP for Registration"
        message_text = f"Your OTP is: {otp}"
        message.attach(MIMEText(message_text))
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": raw_message}

        sent_message = (
            service.users().messages().send(userId="me", body=create_message).execute()
        )

        print(f'Sent message to {message["to"]}. Message Id: {sent_message["id"]}')
        return JsonResponse({"key": otp_key}, status=200)

    except Exception as e:
        print(f"An error occurred: {traceback.format_exc()}")
        return JsonResponse(
            {"error": "Failed to send OTP. Error: {}".format(str(e))},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def verify_otp(request, otp, key):
    try:

        otp_obj = Selfcache.objects.get(cache_id=key)

        if otp_obj.opt == otp:
            otp_obj.delete()
            return HttpResponse(status=status.HTTP_200_OK)
        else:
            return HttpResponse(status=400)

    except Selfcache.DoesNotExist:
        return HttpResponse(status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return HttpResponse(status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def reset_password(request):
    try:
        data = json.loads(request.body).get("data", None)
        print(data)
        memb = User.objects.get(email=data["email"])
        hashed_password = make_password(data["password"])
        memb.password = hashed_password
        memb.save()
        return HttpResponse(status=200)
    except:
        return HttpResponse(status=400)


@csrf_exempt
def upload_profile_picture(request, id):
    try:
        user = get_object_or_404(User, id=id)
        if request.method == "POST" and request.body:
            data = json.loads(request.body)
            image_data = data.get("profile_picture")
            if image_data:
                format, imgstr = image_data.split(";base64,")
                ext = format.split("/")[-1]
                decoded_image = base64.b64decode(imgstr)
                # Convert the decoded image to an Image object for resizing
                image = Image.open(BytesIO(decoded_image))
                # Reduce the image size
                output = reduce_image_size(image)
                # Delete existing profile picture, if any
                if user.profile_picture:
                    user.profile_picture.delete()
                # Save the new profile picture
                user.profile_picture = ContentFile(
                    output.getvalue(), name=f"profile_picture_{id}.{ext}"
                )
                user.save()
                return JsonResponse(
                    {"message": "Profile picture uploaded successfully"}
                )
            else:
                return JsonResponse({"error": "No image data provided"}, status=400)
        else:
            return JsonResponse({"error": "Invalid request"}, status=400)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=400)


def reduce_image_size(image, max_size=5):
    max_size_bytes = max_size * 1024 * 1024
    output = BytesIO()
    quality = 95
    while True:
        image.save(output, format=image.format, optimize=True, quality=quality)
        output_size = output.tell()
        if output_size <= max_size_bytes or quality <= 10:
            break
        quality -= 5
        output.seek(0)
    output.seek(0)
    return output


def reduce_image_size(image, max_size=5):

    max_size_bytes = max_size * 1024 * 1024
    output = BytesIO()

    quality = 95
    while True:

        image.save(output, format=image.format, optimize=True, quality=quality)
        output_size = output.tell()

        if output_size <= max_size_bytes or quality <= 10:
            break

        quality -= 5
        output.seek(0)

    output.seek(0)
    return output


def get_profile_picture(request, id):
    try:
        user = get_object_or_404(User, id=id)

        if user.profile_picture:
            with open(user.profile_picture.path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode("utf-8")

            return JsonResponse({"profile_pic_base64": encoded_string})
        else:
            return JsonResponse({"error": "Profile picture not found"}, status=404)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=400)


def send_request_to_user(user_id):
    try:
        user = User.objects.get(id=user_id)
        notification_message = (
            "You have a new organization request. Please review it in your account."
        )
        SUCCESS(requests.request, notification_message)
        return True
    except Exception as e:
        print("Error rendering notification:", str(e))
        return False


@csrf_exempt
def check_organization_exists(request, user_id):
    try:
        if request.method == "POST":
            data = json.loads(request.body)
            email = data.get("email")

            if not email:
                return JsonResponse({"error": "Email address is required"}, status=400)

            user = User.objects.filter(id=user_id).first()
            organization = Organization.objects.filter(email_address=email).first()

            if organization and user:
                org_request = OrganizationRequest.objects.create(
                    user=user, organization=organization
                )
                response_data = {
                    "message": "Organization request created successfully",
                    "request_id": org_request.id,
                    "organization": {
                        "id": organization.id,
                        "name": organization.name,
                        "email_address": organization.email_address,
                    },
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    },
                }
                send_request_to_user(user.id)
                return JsonResponse(response_data)
            else:
                return JsonResponse(
                    {"message": "Organization or user does not exist with this email"},
                    status=404,
                )
        else:
            return JsonResponse({"error": "Only POST requests are allowed"}, status=405)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def get_user_requests(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        organization_requests = OrganizationRequest.objects.filter(
            organization=user.organization, status=False
        )

        response_data = {
            "user_id": user.id,
            "username": user.username,
            "requests": [
                {
                    "id": req.id,
                    "status": req.status,
                    "organization_name": req.organization.name,
                }
                for req in organization_requests
            ],
        }

        return JsonResponse(response_data)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def accept_reject_notification(request, notification_id):
    try:
        notification = OrganizationRequest.objects.get(id=notification_id)
        data = json.loads(request.body)
        approve = data.get("approve")

        if isinstance(approve, bool):  # Check if the value is a boolean
            notification.status = approve
            notification.save()
            if approve:
                # Add the user to the organization
                user = User.objects.get(id=notification.user.id)
                organization = Organization.objects.get(id=notification.organization.id)
                user.organization = organization
                user.save()
            notification.delete()  # Delete the notification after processing
            return JsonResponse({"message": "Notification status updated successfully"})
        else:
            return JsonResponse(
                {"error": "Approve parameter must be a boolean"}, status=400
            )
    except OrganizationRequest.DoesNotExist:
        return JsonResponse({"error": "Notification not found"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def fetch_all_emails(request, id):
    if request.method == "GET":
        try:
            # Fetch organization_id for the given id
            user = User.objects.get(id=id)
            organization_id = user.organization_id

            # Fetch all users' email addresses in the same organization, excluding the user with the given id
            all_emails = (
                User.objects.filter(organization_id=organization_id)
                .exclude(id=id)
                .values_list("email", flat=True)
            )

            return JsonResponse(list(all_emails), safe=False)
        except User.DoesNotExist:
            return JsonResponse(
                {"error": f"User with id {id} does not exist"}, status=404
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only GET method is allowed"}, status=405)


@csrf_exempt
def create_survey_form(request, user_id):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            survey_name = data.get("surveyName")
            data_inputs = data.get("dataInputs")
            selected_emails = data.get("selectedEmails")

            user = User.objects.get(id=user_id)  # Fetch the user instance
            organization = Organization.objects.get(
                id=user.organization_id
            )  # Fetch the organization instance
            print(user, organization)

            if not survey_name:
                return JsonResponse({"error": "Survey name is required"}, status=400)
            if not data_inputs:
                return JsonResponse({"error": "Data inputs are required"}, status=400)

            SurveyField.objects.create(
                name=survey_name,
                organization=organization,
                user=user,
                data_inputs=data_inputs,
                response=[],
                selected_emails=selected_emails,  # Store the selected emails
            )

            return JsonResponse(
                {"info": "Survey form created successfully"}, status=200
            )
        except User.DoesNotExist:
            return JsonResponse({"error": "User does not exist"}, status=404)
        except Organization.DoesNotExist:
            return JsonResponse({"error": "Organization does not exist"}, status=404)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only POST method is allowed"}, status=405)


def get_survey_forms(request, user_id):
    if request.method == "GET":
        try:
            user = User.objects.get(id=user_id)  # Fetch the user instance
            user_email = user.email  # Get the user's email

            name = request.GET.get("name")
            if name:
                survey_forms = SurveyField.objects.filter(name=name)
            else:
                survey_forms = SurveyField.objects.all()

            data = []
            for survey_form in survey_forms:
                if (
                    user_email in survey_form.selected_emails
                ):  # Check if the user's email is in selected_emails
                    survey_data = {
                        "id": survey_form.id,
                        "name": survey_form.name,
                        "organization": survey_form.organization.name,
                        "user": survey_form.user.username,
                        "data_inputs": survey_form.data_inputs,
                        # "response": survey_form.response,
                        "selected_emails": survey_form.selected_emails,  # Include the selected emails in the response
                    }
                    data.append(survey_data)
            return JsonResponse(data, safe=False)
        except User.DoesNotExist:
            return JsonResponse({"error": "User does not exist"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only GET method is allowed"}, status=405)


@csrf_exempt
def survey_form_submit(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_id = data.get("user_id")
            name = data.get("name")
            response_data = data.get("response")

            if not user_id:
                return JsonResponse({"error": "User ID is required"}, status=400)
            if not name:
                return JsonResponse({"error": "Survey name is required"}, status=400)
            if not response_data:
                return JsonResponse({"error": "Response data is required"}, status=400)

            try:
                survey_form = SurveyField.objects.get(name=name)
            except SurveyField.DoesNotExist:
                return JsonResponse({"error": "Survey form does not exist"}, status=404)

            # Ensure response field is treated as a list
            if survey_form.response is None:
                survey_form.response = []

            if not isinstance(survey_form.response, list):
                return JsonResponse(
                    {"error": "Invalid survey form response field type"}, status=500
                )

            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return JsonResponse({"error": "User does not exist"}, status=404)
            for key, value in response_data.items():
                if isinstance(value, str) and "image/png" in value:
                    image_base64 = value.split(",")[1]
                    image_data = base64.b64decode(image_base64)

                    def generate_random_filename(extension):
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        random_suffix = "".join(
                            random.choices(string.ascii_letters + string.digits, k=8)
                        )
                        return f"{timestamp}_{random_suffix}{extension}"

                    directory = "media/survey_response/"
                    if not os.path.exists(directory):
                        os.makedirs(directory)

                    filename = generate_random_filename(".png")
                    file_path = os.path.join(directory, filename)

                    with open(file_path, "wb") as file:
                        file.write(image_data)
                    new_path = upload_image(file_path, key, user_id)
                    response_data[key] = new_path
            response_entry = {
                "firstname": user.first_name,
                "lastname": user.last_name,
                "user_id": user_id,
                "response": response_data,
            }

            survey_form.response.append(response_entry)
            survey_form.save()

            return JsonResponse(
                {"info": "Survey form submitted successfully"}, status=200
            )
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only POST method is allowed"}, status=405)


def view_survey_field_data(request, id):
    user_obj = User.objects.get(id=id)
    survey_fields = SurveyField.objects.filter(user=user_obj)
    survey_data = []
    for survey_field in survey_fields:
        survey_data.append(
            {
                "id": survey_field.id,
                "organization": survey_field.organization.name,
                "user": survey_field.user.username,
                "name": survey_field.name,
                "data_inputs": survey_field.data_inputs,
                "count": len(survey_field.response),
                "selected_emails": survey_field.selected_emails,
            }
        )
    return JsonResponse({"survey_data": survey_data})


@csrf_exempt
def delete_survey(request, survey_field_id):
    try:
        survey_field = SurveyField.objects.get(id=survey_field_id)
        survey_field.delete()  # Deletes the survey field and all associated responses
        return JsonResponse(
            {
                "message": f"Survey field with ID {survey_field_id} and its responses deleted successfully"
            }
        )
    except SurveyField.DoesNotExist:
        return JsonResponse(
            {"error": "Survey field with provided ID does not exist"}, status=404
        )


def get_survey_data_inputs(request, survey_id):
    if request.method == "GET":
        try:
            survey = SurveyField.objects.get(id=survey_id)
            print(survey.data_inputs)
            return JsonResponse({"survey_data": survey.data_inputs}, status=200)
        except SurveyField.DoesNotExist:
            return JsonResponse({"error": "Survey does not exist"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only GET method is allowed"}, status=405)


@csrf_exempt
def edit_or_add_survey_data_inputs(request, survey_id):
    if request.method in ["PUT", "PATCH"]:
        try:
            data = json.loads(request.body)
            new_data_inputs = data.get("data_inputs", [])
            new_selected_emails = data.get("selected_email", [])

            survey = SurveyField.objects.get(id=survey_id)
            survey.data_inputs = new_data_inputs
            survey.selected_emails = new_selected_emails
            survey.save()

            return JsonResponse(
                {"info": "Survey data inputs updated successfully"}, status=200
            )
        except SurveyField.DoesNotExist:
            return JsonResponse({"error": "Survey does not exist"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse(
            {"error": "Only PUT or PATCH methods are allowed"}, status=405
        )


def surveyfield(request, survey_id, download=False):
    if request.method == "GET":
        try:
            survey = SurveyField.objects.get(id=survey_id)
            data = {
                "id": survey.id,
                "name": survey.name,
                "user": survey.user.username,
                "response": [],  # Collect modified responses here
            }
            # Track if we need to save changes

            for index, response in enumerate(survey.response):
                if not download:
                    modified_response = (
                        response.copy()
                    )  # Ensure original data is not modified
                    del modified_response["response"]  # Remove the "response" key
                    modified_response["index"] = index  # Add the "index" key
                    data["response"].append(modified_response)
                else:
                    resp = response["response"]
                    username = User.objects.get(id=response["user_id"]).username
                    username = urllib.parse.quote(username)

                    # Modify URLs if necessary
                    for key, value in resp.items():
                        if isinstance(value, str) and re.search(
                            r"\.(png|jpg|jpeg|gif|bmp|tiff)$", value, re.IGNORECASE
                        ):
                            resp[key] = short_url(value)
                        elif isinstance(value, str) and username in value:
                            resp[key] = short_url(urllib.parse.unquote(value))
                    data["response"].append(response)
            return JsonResponse({"survey_data": data}, status=200)
        except SurveyField.DoesNotExist:
            return JsonResponse({"error": "Survey does not exist"}, status=404)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only GET method is allowed"}, status=405)


def surveyResponse(request, survey_id, index):
    if request.method == "GET":
        try:
            survey = SurveyField.objects.get(id=survey_id)

            # Track if we need to save changes
            response = survey.response[index]
            resp = response["response"]
            username = User.objects.get(id=response["user_id"]).username
            username = urllib.parse.quote(username)

            # Modify URLs if necessary
            for key, value in resp.items():
                if isinstance(value, str) and re.search(
                    r"\.(png|jpg|jpeg|gif|bmp|tiff)$", value, re.IGNORECASE
                ):
                    resp[key] = short_url(value)
                elif isinstance(value, str) and username in value:
                    resp[key] = short_url(urllib.parse.unquote(value))
            return JsonResponse({"response": response}, status=200)
        except SurveyField.DoesNotExist:
            return JsonResponse({"error": "Survey does not exist"}, status=404)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only GET method is allowed"}, status=405)


@csrf_exempt
def clear_survey_response(request, survey_id, index):
    if request.method == "DELETE":
        try:
            survey = SurveyField.objects.get(id=survey_id)
            index = int(index)

            if 0 <= index < len(survey.response):
                del survey.response[index]
                survey.save()

                return JsonResponse(
                    {"message": "Response cleared successfully"}, status=200
                )
            else:
                return JsonResponse({"error": "Invalid response index"}, status=400)

        except SurveyField.DoesNotExist:
            return JsonResponse({"error": "Survey does not exist"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Only DELETE method is allowed"}, status=405)


@csrf_exempt
def clear_all_survey_response(request, survey_field_id):
    if request.method == "DELETE":
        try:
            # Find the SurveyField instance
            survey_field = SurveyField.objects.get(id=survey_field_id)
            print(survey_field)
            # Clear the response field
            survey_field.response = []
            survey_field.save()
            return JsonResponse(
                {"message": "Responses cleared successfully"}, status=200
            )
        except SurveyField.DoesNotExist:
            return JsonResponse({"error": "SurveyField not found"}, status=404)
    else:
        return JsonResponse({"error": "Only DELETE method is allowed"}, status=405)


import io
import pandas as pd
from .verify import send_email_with_csv


def generate_csv_in_thread(request, survey_id, email):
    try:

        response = surveyfield(request, survey_id, download=True)
        if response.status_code != 200:
            return response

        # Extract JSON data from the response
        response_data = json.loads(response.content)

        # Flatten the response data
        survey_data = response_data["survey_data"]["response"]
        flat_data = []
        for index, entry in enumerate(survey_data):
            flat_entry = {
                "NO.": index + 1,
                "username": User.objects.get(id=entry["user_id"]).username,
                "firstname": entry["firstname"],
                "lastname": entry["lastname"],
            }

            for key, value in entry["response"].items():
                if isinstance(value, dict) and "lat" in value and "long" in value:
                    flat_entry[f"{key}_lat"] = value["lat"]
                    flat_entry[f"{key}_long"] = value["long"]
                else:
                    if isinstance(value, list):
                        value = ",".join(value)

                    flat_entry[key] = value

            flat_data.append(flat_entry)

        # Convert the flattened data to a DataFrame
        df = pd.DataFrame(flat_data)

        # Create a CSV buffer
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)

        # Create an HTTP response with the CSV data
        send_email_with_csv(
            email, response_data["survey_data"]["name"], csv_buffer=csv_buffer
        )
        response = HttpResponse(csv_buffer.getvalue(), content_type="text/csv")

    except Exception as e:
        print(f"Error generating CSV: {e}")


def surveyfield_csv(request, survey_id, email):
    if request.method == "GET":
        try:
            # Call the surveyfield function to get the JSON data

            # Start a new thread for CSV generation
            csv_thread = threading.Thread(
                target=generate_csv_in_thread, args=(request, survey_id, email)
            )
            csv_thread.start()

            # Respond immediately with HTTP 200 OK
            return HttpResponse(
                status=200,
            )
        except SurveyField.DoesNotExist:
            return HttpResponse(status=404)
        except Exception as e:
            return HttpResponse(status=500)
    else:
        return HttpResponse(status=405)


def update_credit(request, id, used_credits):
    used_credits = int(used_credits)
    if "user_info" in request.session:
        # print(request.session["user_info"])
        if "id" in request.session["user_info"]:
            user_obj = User.objects.get(id=request.session["user_info"]["id"])
            if id != "0":
                feat_obj = Feature.objects.get(id=id)
                credit = feat_obj.credit if used_credits == 0 else used_credits

                user_obj.credits -= credit
                if user_obj.email == user_obj.organization.email_address:
                    user_obj.organization.credits -= credit
                    user_obj.organization.save()
                obj = CreditPointsTransaction.objects.create(
                    user=user_obj,
                    organization=user_obj.organization,
                    amount=credit,
                    type=1,
                    feature=feat_obj,
                )
                obj.save()
                user_obj.save()
            request.session["user_info"]["credits"] = (
                user_obj.organization.credits
                if user_obj.email == user_obj.organization.email_address
                else user_obj.credits
            )
        return JsonResponse(
            {
                "credit": (
                    user_obj.organization.credits
                    if user_obj.email == user_obj.organization.email_address
                    else user_obj.credits
                )
            },
            status=200,
        )
    else:

        return JsonResponse({}, status=403)


def get_credit_sq_km(request, id, area):
    """
    Return the credit required to purchase a feature for a given area.

    Parameters:
    request (HttpRequest): The request object
    id (int): The id of the feature
    area (float): The area of the feature in square kilometers

    Returns:
    JsonResponse: A JSON response with a key 'credit' representing the credit required
    """
    feature = Feature.objects.get(id=id)
    if feature:
        credit = int(feature.credit * float(area))
        return JsonResponse({"credit": credit, "message": "Feature found"}, status=200)
    else:
        return JsonResponse({"credit": 0, "message": "Feature not found"}, status=200)


def send_credit(request, id, credit):
    if "user_info" in request.session:

        if "id" in request.session["user_info"]:
            user_obj = User.objects.get(id=request.session["user_info"]["id"])
            if user_obj.email == user_obj.organization.email_address:
                credit = float(credit)
                obj = User.objects.get(id=id)
                obj.credits += credit
                user_obj.credits -= credit
                user_obj.organization.credits -= credit
                obj.save()
                user_obj.save()
                user_obj.organization.save()
                obj = CreditPointsTransaction.objects.create(
                    user=obj, organization=obj.organization, amount=credit
                )
                obj.save()
            request.session["user_info"]["credits"] = (
                user_obj.organization.credits
                if user_obj.email == user_obj.organization.email_address
                else user_obj.credits
            )
        return HttpResponse(status=200)
    else:

        return HttpResponse(status=400)


def get_credit_transactions(request, id):
    user = User.objects.get(id=id)

    is_org_admin = user.email == user.organization.email_address

    if user.is_superuser:
        objs = CreditPointsTransaction.objects.all()
    elif is_org_admin:
        objs = CreditPointsTransaction.objects.filter(organization=user.organization)
    else:
        objs = CreditPointsTransaction.objects.filter(user=user)

    data = []

    # Loop through transactions and update the status if necessary
    for obj in objs:

        # Append the transaction data to the response list
        data.append(
            {
                "memb_id": obj.user.id if is_org_admin else None,
                "memb_name": obj.user.username if is_org_admin else None,
                "org": obj.user.organization.name if user.is_superuser else None,
                "email": (
                    obj.user.email if (is_org_admin or user.is_superuser) else None
                ),
                "amount": obj.amount,
                "type": obj.type,
                "debit_type": obj.debit_type,
                "feature": obj.feature.name if obj.feature else None,
                "created": obj.created_at.isoformat(),
            }
        )

    return JsonResponse({"data": data}, safe=False)


def add_credit_coupon(request, id, key):
    try:
        if id and key:
            if key in VGT_COUPONS:
                obj = User.objects.get(id=id)
                if obj.coupon_used:
                    return HttpResponse(content="coupon already used!", status=400)
                obj.credits += VGT_COUPONS[key]
                if obj.email == obj.organization.email_address:
                    obj.organization.credits += VGT_COUPONS[key]
                    obj.organization.save()
                obj.coupon_used = True
                obj.save()
                return HttpResponse(200)
            else:
                return HttpResponse(status=400)
    except Exception as e:
        traceback.print_exc()
        return HttpResponse(status=400)

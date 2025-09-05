from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import User
import os
import re
import traceback
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from urllib.error import HTTPError
from cryptography.fernet import Fernet
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from .stat import files
from .consts import *
from django.shortcuts import redirect

# Generate a Fernet key
fernet_key = os.getenv("FERNET_KEY")
fernet = Fernet(fernet_key)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


def is_college_email(email):
    educational_patterns = [
        r".+@.+\.edu$",  # General educational domains
        r".+@.+\.ac\.in$",  # Indian academic domains
        r".+@.+\.ac\.[a-z]{2}$",  # Academic domains (other countries)
        r".+@.+university\..+$",  # Domains containing "university"
        r".+@.+college\..+$",  # Domains containing "college"
        r".+@.+\.in$",  # Indian domains (including university.in)
    ]
    for pattern in educational_patterns:
        if re.match(pattern, email):
            return True
    return False


def send_email(email):
    # Saving user data
    try:
        os.environ["GOOGLE_AUTH_SUPPRESS_CREDENTIALS_WARNINGS"] = "true"
        memb = User.objects.get(email=email)
        creds = None
        if os.path.exists("config_files/token.json"):
            # Load Google API credentials
            creds = Credentials.from_authorized_user_file(
                "config_files/token.json", SCOPES
            )
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # Refresh expired credentials
                creds.refresh(Request())
            else:
                # Authenticate user and obtain credentials
                flow = InstalledAppFlow.from_client_secrets_file(
                    "config_files/credentials.json", SCOPES
                )
                creds = flow.run_local_server(port=0, launch_browser=False)
        # Build Gmail API service
        service = build("gmail", "v1", credentials=creds)
        # Encrypt user ID for security
        encoded_id = fernet.encrypt(str(memb.id).encode()).decode()

        # Add timestamp with expiry time (e.g., 5 seconds)
        expiry_time = datetime.now() + timedelta(seconds=300)
        encoded_id_with_expiry = f"{encoded_id},{expiry_time.timestamp()}"

        print(encoded_id_with_expiry)
        # Compose email message
        message = MIMEMultipart()
        message["to"] = email
        message["subject"] = (
            "Subject: Email Verification - Vasundharaa Geo Technologies"
        )
        verification_link = (
            f'<a href="{files}/maps/verify-user/{encoded_id_with_expiry}/">here</a>'
        )
        html_part = MIMEText(
            f"<html><body><p>Please verify your email by clicking {verification_link}.</p></body></html>",
            "html",
        )
        message.attach(html_part)
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": raw_message}
        # Send email using Gmail API
        sent_message = (
            service.users().messages().send(userId="me", body=create_message).execute()
        )
        print(f'Sent message to {message["to"]}. Message Id: {sent_message["id"]}')
        print("Message sent successfully.")
    except HTTPError as error:
        # Handle HTTP errors
        print(f"An error occurred: {error}")
        return False
    # Return successful response
    return True

# Return validation error response

def verify_email(request, encoded_id):
    print(request)
    try:
        # Split encoded ID and expiry timestamp

        encoded_id, expiry_timestamp = encoded_id.split(",")
        print(encoded_id)
        # Decode the encoded ID
        decoded_id = fernet.decrypt(encoded_id.encode()).decode()

        # Check if the link has expired
        print(decoded_id, datetime.now().timestamp(), float(expiry_timestamp))
        if datetime.now().timestamp() > float(expiry_timestamp):
            return redirect("/not-verified")

        # Retrieve the user object using the decoded ID
        try:
            user = User.objects.get(id=decoded_id)
        except User.DoesNotExist:
            import traceback

            traceback.print_exc()
            return HttpResponse(
                {"error": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update user verification status or perform any other necessary actions
        user.verified = True
        user.save()
        send_welcome_mail_with_coupon(user.email, user.username)

        # Return success response
        return redirect("/verified")
    except Exception as e:
        import traceback

        traceback.print_exc()
        # Handle decoding errors or invalid verification links
        return redirect("/not-verified")


def send_welcome_mail_with_coupon(email, name):
    try:
        creds = None
        if os.path.exists("config_files/token.json"):
            # Load Google API credentials
            creds = Credentials.from_authorized_user_file(
                "config_files/token.json", SCOPES
            )
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # Refresh expired credentials
                creds.refresh(Request())
            else:
                # Authenticate user and obtain credentials
                flow = InstalledAppFlow.from_client_secrets_file(
                    "config_files/credentials.json", SCOPES
                )
                creds = flow.run_local_server(port=0, launch_browser=False)
        service = build("gmail", "v1", credentials=creds)
        message = MIMEMultipart()
        if is_college_email(email):
            coupon_code = STUDENT_COUPON_CODE
        else:
            coupon_code = USER_COUPON_CODE
        message["to"] = email
        message["subject"] = "Subject: Welcome Mail - Vasundharaa Geo Technologies"
        html_part = MIMEText(
            f"<html><body>Hello {name}</br><h4>Welcome to Vasundharaa Geo Technologies</h4></br></br>Your email has been successfully verified. Kindly visit your profile section and use coupon code <h2>{coupon_code}</h2> to redeem free credits.</body></html>",
            "html",
        )
        message.attach(html_part)
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": raw_message}
        sent_message = (
            service.users().messages().send(userId="me", body=create_message).execute()
        )
        print(f'Sent message to {message["to"]}. Message Id: {sent_message["id"]}')
        print("Message sent successfully.")
    except Exception as e:
        traceback.print_exc()


def resend_email(request, email):
    send_email(email)
    return HttpResponse(status=200)


def send_email_with_csv(email, name, csv_buffer=None):
    """
    Sends an email with a CSV attachment using Gmail API.
    Either a CSV buffer or a file path should be provided.
    """
    try:
        # Authenticate with Gmail API
        os.environ["GOOGLE_AUTH_SUPPRESS_CREDENTIALS_WARNINGS"] = "true"

        creds = None
        if os.path.exists("config_files/token.json"):
            # Load Google API credentials
            creds = Credentials.from_authorized_user_file(
                "config_files/token.json", SCOPES
            )
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # Refresh expired credentials
                creds.refresh(Request())
            else:
                # Authenticate user and obtain credentials
                flow = InstalledAppFlow.from_client_secrets_file(
                    "config_files/credentials.json", SCOPES
                )
                creds = flow.run_local_server(port=0, launch_browser=False)
        # Build Gmail API service
        service = build("gmail", "v1", credentials=creds)
        if not service:
            return False

        # Compose the email message
        message = MIMEMultipart()
        message["to"] = email
        message["subject"] = f"{name} Survey CSV"

        # Add email body
        body_part = MIMEText(f"<p>Find the attached CSV for the {name}.</p>", "html")
        message.attach(body_part)

        # Attach the CSV from buffer or file
        if csv_buffer:
            csv_buffer.seek(0)  # Ensure buffer is at the beginning
            csv_attachment = MIMEApplication(csv_buffer.read(), Name=f"{name}.csv")
            csv_attachment["Content-Disposition"] = f'attachment; filename="{name}.csv"'
            message.attach(csv_attachment)
        else:
            return HttpResponse(
                {"error": "No valid CSV buffer or file provided"}, status=400
            )

        # Encode the message and send it
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent_message = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw_message})
            .execute()
        )
        print(f'Email sent to {email}. Message Id: {sent_message["id"]}')
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

from django.http import JsonResponse

from .phonepe_client import *
from .models import *
from map_app.models import User, CreditPointsTransaction

import uuid
import base64
import json
import traceback


def get_payment_url(request, amount, user_id):
    try:
        trans_id, url = get_url_phonepe(float(amount) * 118, user_id)
        user = User.objects.get(id=user_id)
        obj = PaymentTransaction.objects.create(
            user=user,
            amount=float(amount),
            key=trans_id,
            organization=user.organization,
        )
        obj.save()
        return JsonResponse({"url": url, "id": trans_id}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({}, status=500)


def check_status(request, id):
    try:
        # Call the checkstatus function to get the transaction status
        res = check_payment_status(id)

        # Check if the response was successful
        if res.get("success"):
            # Safely retrieve data and handle missing keys
            data = {
                "amount": res.get("data", {}).get("amount", None) / 100,
                "status": res.get("code", None),
                "method": res.get("data", {})
                .get("paymentInstrument", {})
                .get("type", None),
                "utr": res.get("data", {}).get("transactionId", None),
            }

            # Return a successful JSON response
            return JsonResponse(data, status=200)
        else:
            # If the response indicates failure, return an error message with relevant data
            error_data = {
                "error": res.get("message", "Failed to retrieve payment status"),
                "code": res.get("code", "UNKNOWN_ERROR"),
            }
            return JsonResponse(error_data, status=500)

    except Exception as e:
        # Handle unexpected exceptions and return a generic error message
        return JsonResponse(
            {"error": str(e), "message": "An error occurred while fetching the status"},
            status=500,
        )


def check_and_update_payment_status(transaction):
    """
    Function to check and update the payment status of a transaction.
    Only check if the status is not successful (status != 1).
    """
    if transaction.status == 0:
        # Check the payment status using the transaction key (merchant_transaction_id)
        res = check_payment_status(transaction.key)
        if res["success"]:
            if "SUCCESS" in res["code"]:
                if res["data"]["paymentState"] == "COMPLETED":
                    # Set transaction status to completed
                    transaction.status = 1
                    transaction.method = (
                        res["data"].get("paymentInstrument", {}).get("type", "")
                    )
                    transaction.utr = res["data"].get("transactionId", "")
                    transaction.user.credits += transaction.amount
                    if (
                        transaction.user.email
                        == transaction.user.organization.email_address
                    ):
                        transaction.user.organization.credits += transaction.amount
                        transaction.user.organization.save()
                    transaction.user.save()
                    obj = CreditPointsTransaction.objects.create(
                        user=transaction.user,
                        organization=transaction.user.organization,
                        amount=transaction.amount,
                        debit_type=1,
                    )
                    obj.save()
                else:

                    transaction.status = 2
            elif "PENDING" in res["code"]:
                transaction.status = 0
            else:
                transaction.status = 2
        else:
            transaction.status = 2
        transaction.save()


def get_transactions(request, pk):
    user = User.objects.get(id=pk)

    is_org_admin = user.email == user.organization.email_address

    if user.is_superuser:
        objs = PaymentTransaction.objects.all()
    elif is_org_admin:
        objs = PaymentTransaction.objects.filter(organization=user.organization)
    else:
        objs = PaymentTransaction.objects.filter(user=user)

    data = []

    # Loop through transactions and update the status if necessary
    for obj in objs:
        check_and_update_payment_status(obj)  # Check and update the status

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
                "status": obj.status,
                "method": obj.method if obj.status == 1 else None,
                "utr": obj.utr if obj.status == 1 else None,
                "created": obj.created_at.isoformat(),
            }
        )
    # request.session["user_info"]["credits"] = memb.credits # Add include credentials
    return JsonResponse({"data": data}, safe=False)


def payment_callback(request):
    if request.method == "POST":
        try:
            # Retrieve and verify the callback data
            callback_data = request.body
            x_verify = request.headers.get("X-Verify")
            if not x_verify:
                return JsonResponse({"error": "Missing X-Verify header"}, status=400)

            is_valid = phonepe_client.verify_response(
                x_verify=x_verify, response=callback_data
            )
            if not is_valid:
                return JsonResponse({"error": "Invalid verification"}, status=400)

            # Decode and parse the callback data
            callback_data = json.loads(callback_data)
            response_data = callback_data.get("response")
            if not response_data:
                return JsonResponse({"error": "No response data"}, status=400)

            merchant_transaction_id = (
                json.loads(base64.b64decode(response_data).decode("utf-8"))
                .get("data", {})
                .get("merchantTransactionId", "")
            )
            # Determine status based on payment state and response code

            # Update transaction status in the database
            if merchant_transaction_id:
                try:
                    transaction = PaymentTransaction.objects.get(
                        key=merchant_transaction_id,
                    )
                    check_and_update_payment_status(transaction)
                    try:
                        if "user_info" in request.session:
                            request.session["user_info"][
                                "credits"
                            ] = transaction.user.credits
                    except Exception as e:
                        traceback.print_exc()

                except PaymentTransaction.DoesNotExist:
                    print("Transaction not found")

            return JsonResponse({"status": "ok"})

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": "An error occurred"}, status=500)

    return JsonResponse({"status": "invalid method"}, status=405)

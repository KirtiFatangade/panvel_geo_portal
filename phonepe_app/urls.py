from django.urls import path
from .views import *

urlpatterns = [
    path("payment-url/<str:amount>/<str:user_id>", get_payment_url, name="Payment Url"),
    path("payment-status/<str:id>", check_status, name="payment-status"),
    path("payment-success", payment_callback, name="Payment Url"),
    path("get-transaction/<str:pk>", get_transactions, name="Get Transactions"),
]

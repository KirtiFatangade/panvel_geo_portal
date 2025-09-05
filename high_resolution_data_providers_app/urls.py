from django.urls import path
from .views import *


urlpatterns = [
    # skywatch urls
    path(
        "get-skywatch-results/",
        get_skywatch_results,
        name="get-skywatch-results",
    ),
    path(
        "place-order-skywatch/<str:user_id>",
        place_order_skywatch,
        name="place-order-skywatch",
    ),
    path(
        "get-orders-skywatch/<str:user_id>",
        fetch_order_skywatch,
        name="get-orders-skywatch",
    ),
    path(
        "fetch-order-assets-skywatch/<str:order_id>",
        downlaod_order_assets_skywatch,
        name="get-orders-up42",
    ),
    path(
        "cloud-order-assets-skywatch/<str:user_id>/<str:order_id>",
        skywatch_to_cloud,
        name="skywatch-order-assets-up42",
    ),
    # up42 urls
    path(
        "get-up42-results/",
        get_up42_results,
        name="get-up42-results",
    ),
    path(
        "get-up42-images/",
        get_up42_images,
        name="get-up42-images",
    ),
    path(
        "get-up42-image-preview/",
        get_up42_image_preview,
        name="get-up42-image-preview",
    ),
    path(
        "get-up42-estimate/",
        get_up42_estimate,
        name="get-estimate-up42",
    ),
    path(
        "place-order-up42/<str:user_id>",
        place_order_up42,
        name="place-order-up42",
    ),
    path(
        "get-orders-up42/<str:user_id>",
        fetch_orders_up42,
        name="get-orders-up42",
    ),
    path(
        "fetch-order-assets-up42/<str:order_id>",
        downlaod_order_assets_up42,
        name="get-orders-up42",
    ),
    path(
        "cloud-order-assets-up42/<str:user_id>/<str:order_id>",
        up42_to_cloud,
        name="cloud-order-assets-up42",
    ),
    path(
        "sse/updates/up42/<str:task_id>",
        up42_task_status,
        name="up42-task-status",
    ),
]

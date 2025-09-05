from django.urls import path
from .views import *

urlpatterns = [
    path("get-help/", get_help, name="get-help"),
    path("manage-support/<str:id>/", manage_support, name="manage-support"),
    path('update-support/<str:id>/', update_support, name='update-support'),
]

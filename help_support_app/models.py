from django.db import models
from map_app.models import BaseModel
from map_app.models import User


class Query(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    full_name = models.CharField(null=False, max_length=255)
    member_email = models.EmailField(null=False, max_length=255)
    message = models.TextField(null=False)
    resolved = models.BooleanField(null=False, default=False)

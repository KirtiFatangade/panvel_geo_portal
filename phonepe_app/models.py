from django.db import models
from map_app.models import BaseModel, Feature, Organization, User


class PaymentTransaction(BaseModel):
    choices = COMP_TYPE_CHOICES = ((0, "Pending"), (1, "Success"), (2, "Failed"))
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=False, blank=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=False
    )
    amount = models.FloatField(null=False)
    key = models.CharField(null=False)
    status = models.IntegerField(choices=choices, default=0, null=False, blank=False)
    method = models.CharField(null=True)
    utr = models.CharField(max_length=255, null=True)

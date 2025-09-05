from django.db import models
from map_app.models import User


class SkywatchOrder(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="skywatch_orders"
    )
    order_id = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.order_id} for {self.user.username} - {self.status}"


class UP42Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="up42_orders")
    order_id = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.order_id} for {self.user.username} - {self.status}"

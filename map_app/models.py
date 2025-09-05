from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from phonenumber_field.modelfields import PhoneNumberField
from datetime import datetime, timedelta
from django.db.models import JSONField
from django.contrib.auth.models import Permission
from django.contrib.postgres.fields import ArrayField


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Plan(BaseModel):
    type = models.IntegerField(null=False, unique=True)
    data = JSONField(default=dict)


class Organization(BaseModel):
    name = models.CharField(max_length=100, null=False, blank=False, unique=True)
    website_name = models.CharField(max_length=50, null=False, blank=False, unique=True)
    contact_number = PhoneNumberField(
        null=True,
        blank=False,
        unique=True,
        help_text="kindly start with country code",
        default=None,
        max_length=13,
    )
    email_address = models.EmailField(
        null=False,
        blank=False,
        unique=True,
        default=None,
    )
    address = models.TextField(null=True, blank=True)
    logo = models.ImageField(upload_to="organizations", default="no_picture.jpg")
    plan = models.ForeignKey(
        Plan, on_delete=models.CASCADE, null=True, blank=True, default=None
    )
    credits = models.FloatField(null=False, default=0)

    def __str__(self):
        return f"{self.name} | {self.email_address} | {self.website_name}"


class Role(models.Model):
    name = models.CharField(max_length=40, null=False, blank=False)
    is_active = models.BooleanField(null=False, default=True)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )

    def __str__(self):
        return self.name


# plan: { 0: "Individual", 1: "Basic", 2: "Advanced", 3: "Enterprise" }


class User(AbstractUser, BaseModel):
    validity_expiry_date = models.DateField(
        null=False, blank=False, default=datetime.now().date() + timedelta(days=365)
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, null=True, blank=True)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=False
    )
    number = PhoneNumberField(
        null=True,
        blank=False,
        unique=True,
        help_text="kindly start with country code",
        default=None,
        max_length=13,
    )
    profile_picture = models.ImageField(
        upload_to="profile_pictures/", null=True, blank=True
    )
    verified = models.BooleanField(default=False)
    sld = ArrayField(models.JSONField(), null=True, blank=True)
    credits = models.FloatField(null=False, default=0)
    up42 = ArrayField(JSONField(), null=True, blank=True, default=list)
    skywatch = ArrayField(JSONField(), null=True, blank=True, default=list)
    chat = JSONField(null=True, blank=True, default=dict)
    coupon_used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username}"

    class Meta(AbstractUser.Meta):
        swappable = "AUTH_USER_MODEL"
        permissions = (
            ("add_org_project", "Can Add Organization Project"),
            ("delete_org_project", "Can Delete Organization Project"),
            ("view_org_project", "Can View Organization Project"),
            ("change_org_project", "Can Edit Organization Project"),
        )


class Attribute(models.Model):
    id = models.OneToOneField(
        User, primary_key=True, to_field="id", on_delete=models.CASCADE
    )
    member_id = models.IntegerField(null=True)

    def __str__(self):
        return f"Attribute for User {self.id}"


class Project(BaseModel):
    project_name = models.CharField(max_length=255, null=True, blank=False)
    org_id = models.ForeignKey(
        Organization, null=True, blank=True, on_delete=models.CASCADE
    )
    member_id = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)
    deleted_at = models.DateTimeField(null=True)
    metadata = JSONField(default=dict)

    def __str__(self):
        return f"{self.id}: {self.project_name}"


class Activity(BaseModel):
    member_id = models.ForeignKey(User, on_delete=models.CASCADE, null=False)
    project_id = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)
    type = models.CharField(max_length=155, null=False, blank=False)
    parent_id = models.PositiveBigIntegerField(null=True)
    tab = models.CharField(null=False, max_length=10)
    data = JSONField(default=dict)


class Selfcache(models.Model):
    cache_id = models.CharField(max_length=8)
    progress = models.FloatField(null=True)
    opt = models.CharField(null=True, max_length=4)
    status = JSONField(null=True)


# class ChatHistory(BaseModel):
#     member_id = models.ForeignKey(User, on_delete=models.CASCADE, null=False)
#     chat_id = models.CharField(max_length=16, null=False, blank=False)
#     prompt_message = models.CharField(max_length=500, null=False, blank=False)
#     chat_response = models.CharField(max_length=5000, null=True, blank=False)
#     paths = ArrayField(models.CharField())
#     mode = models.IntegerField(null=True)
#     log_cleared = models.BooleanField(null=False, default=False)

#     def __str__(self):
#         return f"{self.id}"


class OrganizationRequest(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="organization_requests"
    )
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    status = models.BooleanField(default=False)
    read_attributes = models.BooleanField(default=False)

    def __str__(self):
        return f"Request from {self.user.username} to join {self.organization.name}"

    def accept_request(self):
        # Update the status of the request
        self.status = True
        self.save()
        # Assign the user to the organization
        self.user.organization = self.organization
        self.user.save()


class SurveyField(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255, null=False, blank=False)
    data_inputs = models.JSONField()
    response = ArrayField(models.JSONField(), default=list)
    selected_emails = ArrayField(models.EmailField(), default=list)  # Add this field

    def __str__(self):
        return f"({self.user.username} to {self.name}) ({self.organization.name})"


class Log(models.Model):
    LEVEL_CHOICES = (
        ("ERROR", "Error"),
        ("info", "info"),
    )
    level = models.CharField(max_length=5, choices=LEVEL_CHOICES)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    count = models.IntegerField(default=1)  # New field to count repetitions

    def __str__(self):
        return f"{self.level} - {self.message[:50]} (Count: {self.count})"

    class Meta:
        ordering = ["-timestamp"]


class FilePaths(models.Model):
    path = models.CharField()


# Visuals : {start,end,range,highlight,adv_params,adv_options,cloud,req_box,req_layer,req_region,start-min,start-max,end-min,end-max}
# Response : [{type,name,add_legend}]
class Feature(BaseModel):
    COMP_TYPE_CHOICES = (
        (0, "Dynamic"),
        (1, "Static"),
    )
    name = models.CharField(max_length=255, null=False, blank=False)
    comp_type = models.IntegerField(
        choices=COMP_TYPE_CHOICES, default=0, null=False, blank=False
    )
    comp = models.CharField(
        null=True,
    )
    url = models.URLField(null=True)
    url_params = ArrayField(models.CharField(), null=True)
    type = models.IntegerField(null=False, blank=False)
    address = models.CharField(max_length=255, null=True)
    visuals = JSONField(null=True)
    params = JSONField(null=True)
    sub_bool = models.BooleanField(null=False, blank=False, default=False)
    sub = ArrayField(models.IntegerField(), null=True)
    info = models.CharField(null=True)
    credit = models.FloatField(null=False, default=0)
    render = models.BooleanField(null=True)
    plan = models.IntegerField(null=False, default=0)


class CreditPointsTransaction(BaseModel):
    choices = (
        (0, "credit"),
        (1, "debit"),
    )
    debit = (
        (0, "admin"),
        (1, "self"),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=False, blank=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=False
    )
    amount = models.FloatField(null=False)
    type = models.IntegerField(choices=choices, default=0, null=False, blank=False)
    debit_type = models.IntegerField(choices=debit, default=0, null=True, blank=True)
    feature = models.ForeignKey(
        Feature,
        on_delete=models.CASCADE,
        null=True,
    )

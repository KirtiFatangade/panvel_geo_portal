from django.middleware.csrf import get_token
from django.http import JsonResponse


class SetCSRFTokenCookieMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Generate CSRF token
        csrf_token = get_token(request)

        # Pass the request to the next middleware or view
        response = self.get_response(request)

        # Set the CSRF token as a cookie in the response
        response.set_cookie("csrftoken", csrf_token)

        return response

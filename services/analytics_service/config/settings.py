import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-secret-key-change-me")
DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "apps.analytics",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("MYSQL_DATABASE") or os.environ.get("DATABASE_NAME", "legalflow_analytics"),
        "USER": os.environ.get("MYSQL_USER") or os.environ.get("DATABASE_USER", "legalflow"),
        "PASSWORD": os.environ.get("MYSQL_PASSWORD") or os.environ.get("DATABASE_PASSWORD", "legalflow_secret"),
        "HOST": os.environ.get("MYSQL_HOST") or os.environ.get("DATABASE_HOST", "localhost"),
        "PORT": os.environ.get("MYSQL_PORT") or os.environ.get("DATABASE_PORT", "3306"),
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.analytics.authentication.ServiceJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "LegalFlow - Analytics Service",
    "DESCRIPTION": "KPIs y métricas agregadas para el panel de control",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

MATTER_SERVICE_URL = os.environ.get("MATTER_SERVICE_URL", "http://matter_service:8003/api")
DOCUMENT_SERVICE_URL = os.environ.get("DOCUMENT_SERVICE_URL", "http://document_service:8002/api")
TIME_SERVICE_URL = os.environ.get("TIME_SERVICE_URL", "http://time_tracking_service:8004/api")
BILLING_SERVICE_URL = os.environ.get("BILLING_SERVICE_URL", "http://billing_service:8005/api")
CALENDAR_SERVICE_URL = os.environ.get("CALENDAR_SERVICE_URL", "http://calendar_service:8006/api")

LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

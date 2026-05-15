#!/usr/bin/env pwsh

$vars = @{
    "IAM_SERVICE_URL" = "https://iamservice-production.up.railway.app/api"
    "DOCUMENT_SERVICE_URL" = "https://documentservice-production-2877.up.railway.app/api"
    "MATTER_SERVICE_URL" = "https://matterservice-production.up.railway.app/api"
    "TIME_SERVICE_URL" = "https://timetrackingservice-production.up.railway.app/api"
    "BILLING_SERVICE_URL" = "https://billingservice-production-a8c9.up.railway.app/api"
    "CALENDAR_SERVICE_URL" = "https://calendarservice-production-31fb.up.railway.app/api"
    "ANALYTICS_SERVICE_URL" = "https://analyticsservice-production-1c85.up.railway.app/api"
    "PORTAL_SERVICE_URL" = "https://clientportalservice-production.up.railway.app/api"
}

Write-Host "Configurando variables..." -ForegroundColor Yellow

foreach ($key in $vars.Keys) {
    $value = $vars[$key]
    Write-Host "Setear $key"
    railway var set $key=$value
}

Write-Host "Listo!" -ForegroundColor Green

#!/bin/bash
# Script para configurar env vars en API Gateway de Railway

API_GATEWAY_ID="apigateway-production-a040"

echo "Configurando variables en API Gateway..."

railway var set IAM_SERVICE_URL="https://iamservice-production.up.railway.app/api" --service=$API_GATEWAY_ID
railway var set DOCUMENT_SERVICE_URL="https://documentservice-production-2877.up.railway.app/api" --service=$API_GATEWAY_ID
railway var set MATTER_SERVICE_URL="https://matterservice-production.up.railway.app/api" --service=$API_GATEWAY_ID
railway var set TIME_SERVICE_URL="https://timetrackingservice-production.up.railway.app/api" --service=$API_GATEWAY_ID
railway var set BILLING_SERVICE_URL="https://billingservice-production-a8c9.up.railway.app/api" --service=$API_GATEWAY_ID
railway var set CALENDAR_SERVICE_URL="https://calendarservice-production-31fb.up.railway.app/api" --service=$API_GATEWAY_ID
railway var set ANALYTICS_SERVICE_URL="https://analyticsservice-production-1c85.up.railway.app/api" --service=$API_GATEWAY_ID
railway var set PORTAL_SERVICE_URL="https://clientportalservice-production.up.railway.app/api" --service=$API_GATEWAY_ID

echo "✓ Variables configuradas!"
echo "Ahora redeploy API Gateway en Railway"

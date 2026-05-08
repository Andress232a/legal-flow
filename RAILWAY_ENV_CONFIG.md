# Railway Environment Variables Configuration

## URLs Públicas
```
IAM: https://iamservice-production.up.railway.app
Document: https://documentservice-production-2877.up.railway.app
Matter: https://matterservice-production.up.railway.app
Time Tracking: https://timetrackingservice-production.up.railway.app
Billing: https://billingservice-production-a8c9.up.railway.app
Calendar: https://calendarservice-production-31fb.up.railway.app
Analytics: https://analyticsservice-production-1c85.up.railway.app
Client Portal: https://clientportalservice-production.up.railway.app
API Gateway: https://apigateway-production-a040.up.railway.app
```

---

## 1. IAM Service
**Railway Project:** iamservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
ALLOWED_HOSTS=*
```

---

## 2. Document Service
**Railway Project:** documentservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
IAM_SERVICE_URL=https://iamservice-production.up.railway.app
ALLOWED_HOSTS=*
```

---

## 3. Matter Service
**Railway Project:** matterservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
IAM_SERVICE_URL=https://iamservice-production.up.railway.app
CALENDAR_SERVICE_URL=https://calendarservice-production-31fb.up.railway.app
ALLOWED_HOSTS=*
```

---

## 4. Time Tracking Service
**Railway Project:** timetrackingservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
IAM_SERVICE_URL=https://iamservice-production.up.railway.app
ALLOWED_HOSTS=*
```

---

## 5. Billing Service
**Railway Project:** billingservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
IAM_SERVICE_URL=https://iamservice-production.up.railway.app
ALLOWED_HOSTS=*
```

---

## 6. Calendar Service
**Railway Project:** calendarservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
IAM_SERVICE_URL=https://iamservice-production.up.railway.app
ALLOWED_HOSTS=*
```

---

## 7. Analytics Service
**Railway Project:** analyticsservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
MATTER_SERVICE_URL=https://matterservice-production.up.railway.app/api
DOCUMENT_SERVICE_URL=https://documentservice-production-2877.up.railway.app/api
TIME_SERVICE_URL=https://timetrackingservice-production.up.railway.app/api
BILLING_SERVICE_URL=https://billingservice-production-a8c9.up.railway.app/api
CALENDAR_SERVICE_URL=https://calendarservice-production-31fb.up.railway.app/api
ALLOWED_HOSTS=*
```

---

## 8. Client Portal Service
**Railway Project:** clientportalservice-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
MATTER_SERVICE_URL=https://matterservice-production.up.railway.app/api
ALLOWED_HOSTS=*
```

---

## 9. API Gateway
**Railway Project:** apigateway-production
**Variables to Add:**
```
SECRET_KEY=your_secret_key_here
DEBUG=False
IAM_SERVICE_URL=https://iamservice-production.up.railway.app
DOCUMENT_SERVICE_URL=https://documentservice-production-2877.up.railway.app
MATTER_SERVICE_URL=https://matterservice-production.up.railway.app
TIME_SERVICE_URL=https://timetrackingservice-production.up.railway.app
BILLING_SERVICE_URL=https://billingservice-production-a8c9.up.railway.app
CALENDAR_SERVICE_URL=https://calendarservice-production-31fb.up.railway.app
ANALYTICS_SERVICE_URL=https://analyticsservice-production-1c85.up.railway.app
PORTAL_SERVICE_URL=https://clientportalservice-production.up.railway.app
ALLOWED_HOSTS=*
```

---

## 10. Vercel - Frontend
**Project:** frontend
**Environment Variables:**
```
VITE_API_BASE_URL=https://apigateway-production-a040.up.railway.app
```

---

## 11. Vercel - Client Portal
**Project:** client-portal
**Environment Variables:**
```
VITE_API_BASE_URL=https://apigateway-production-a040.up.railway.app
```

---

## Steps to Configure

### For Each Railway Service:
1. Go to railway.app
2. Click on the project (e.g., iamservice-production)
3. Click on "Variables" tab
4. Add each variable from the list above
5. Redeploy (should auto-redeploy when vars change)
6. Wait for "Online" status

### For Vercel:
1. Go to vercel.com
2. Click project (frontend or client-portal)
3. Settings → Environment Variables
4. Add variables
5. Redeploy

---

## Test
After all configured:
1. Open frontend URL in browser
2. Try to login
3. Check if services communicate

If error → check Railway logs

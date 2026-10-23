# SmartWorkforce Login Credentials

## Default Admin Account

Use these credentials to log in to the system:

- **Email:** `admin@smartworkforce.internal`
- **Password:** `SmartWorkforce2024!`
- **Role:** Company Head (Full Access)

## Quick Login via API

You can also authenticate via curl:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "admin@smartworkforce.internal",
    "password": "SmartWorkforce2024!"
  }' \
  -c cookies.txt

# Then use the session in subsequent requests
curl http://localhost:3000/api/employees \
  -b cookies.txt
```

## Database Info

- **Total Employees:** 59
- **Currently Inside:** 28
- **Total Attendance Events:** 579
- **Departments:** 12 (Operations, Sales, HR, Finance, Marketing, Engineering, etc.)

## Viewing Data Without Login

For development/testing, you can temporarily disable auth or use the backend API directly.

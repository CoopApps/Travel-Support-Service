# Quick Endpoint Testing Scripts

Copy-paste these curl commands to test your endpoints quickly.

## 🔑 Step 1: Get Authentication Token

```bash
# Login as Sheffield Transport admin
curl -X POST http://localhost:3001/api/tenants/2/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sheffieldtransport.co.uk\",\"password\":\"admin123\"}"
```

**Save the token from response:**
```bash
# For Windows Command Prompt
set TOKEN=your_token_here

# For Windows PowerShell
$env:TOKEN="your_token_here"

# For Git Bash/WSL
export TOKEN="your_token_here"
```

---

## 🧪 Authentication Tests

### Test 1: Login (Should work)
```bash
curl -X POST http://localhost:3001/api/tenants/2/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sheffieldtransport.co.uk\",\"password\":\"admin123\"}"
```

### Test 2: Login with wrong password (Should fail)
```bash
curl -X POST http://localhost:3001/api/tenants/2/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sheffieldtransport.co.uk\",\"password\":\"wrongpassword\"}"
```

### Test 3: Get current user info
```bash
curl http://localhost:3001/api/tenants/2/auth/me \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 4: Invalid token (Should fail)
```bash
curl http://localhost:3001/api/tenants/2/auth/me \
  -H "Authorization: Bearer invalid_token"
```

---

## 👥 Customer Tests

### Test 1: List all customers
```bash
curl http://localhost:3001/api/tenants/2/customers \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 2: Get specific customer
```bash
curl http://localhost:3001/api/tenants/2/customers/1 \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 3: Create new customer
```bash
curl -X POST http://localhost:3001/api/tenants/2/customers \
  -H "Authorization: Bearer %TOKEN%" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Test\",\"last_name\":\"Customer\",\"email\":\"test@example.com\",\"phone\":\"+44 123 456 7890\"}"
```

### Test 4: Update customer
```bash
curl -X PUT http://localhost:3001/api/tenants/2/customers/1 \
  -H "Authorization: Bearer %TOKEN%" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"+44 999 888 7777\"}"
```

### Test 5: Delete customer
```bash
curl -X DELETE http://localhost:3001/api/tenants/2/customers/1 \
  -H "Authorization: Bearer %TOKEN%"
```

---

## 🚗 Driver Tests

### Test 1: List all drivers
```bash
curl http://localhost:3001/api/tenants/2/drivers \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 2: Get specific driver
```bash
curl http://localhost:3001/api/tenants/2/drivers/1 \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 3: Create new driver
```bash
curl -X POST http://localhost:3001/api/tenants/2/drivers \
  -H "Authorization: Bearer %TOKEN%" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Test\",\"last_name\":\"Driver\",\"email\":\"driver@example.com\",\"phone\":\"+44 123 456 7890\",\"license_number\":\"ABC123\"}"
```

---

## 🚙 Vehicle Tests

### Test 1: List all vehicles
```bash
curl http://localhost:3001/api/tenants/2/vehicles \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 2: Get specific vehicle
```bash
curl http://localhost:3001/api/tenants/2/vehicles/1 \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 3: Create new vehicle
```bash
curl -X POST http://localhost:3001/api/tenants/2/vehicles \
  -H "Authorization: Bearer %TOKEN%" \
  -H "Content-Type: application/json" \
  -d "{\"registration\":\"ABC123\",\"make\":\"Ford\",\"model\":\"Transit\",\"capacity\":8,\"wheelchair_accessible\":true}"
```

---

## 🗓️ Trip Tests

### Test 1: List all trips
```bash
curl http://localhost:3001/api/tenants/2/trips \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 2: Get specific trip
```bash
curl http://localhost:3001/api/tenants/2/trips/1 \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 3: Create new trip
```bash
curl -X POST http://localhost:3001/api/tenants/2/trips \
  -H "Authorization: Bearer %TOKEN%" \
  -H "Content-Type: application/json" \
  -d "{\"customer_id\":1,\"pickup_address\":\"123 Main St\",\"dropoff_address\":\"456 Oak Ave\",\"scheduled_date\":\"2025-01-15\",\"scheduled_time\":\"10:00:00\"}"
```

---

## 📊 Dashboard Tests

### Test 1: Get dashboard stats
```bash
curl http://localhost:3001/api/tenants/2/dashboard/stats \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 2: Get recent trips
```bash
curl http://localhost:3001/api/tenants/2/dashboard/recent-trips \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 3: Get upcoming trips
```bash
curl http://localhost:3001/api/tenants/2/dashboard/upcoming \
  -H "Authorization: Bearer %TOKEN%"
```

---

## 💰 Invoice Tests

### Test 1: List all invoices
```bash
curl http://localhost:3001/api/tenants/2/invoices \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 2: Get specific invoice
```bash
curl http://localhost:3001/api/tenants/2/invoices/1 \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 3: Create new invoice
```bash
curl -X POST http://localhost:3001/api/tenants/2/invoices \
  -H "Authorization: Bearer %TOKEN%" \
  -H "Content-Type: application/json" \
  -d "{\"customer_id\":1,\"amount\":100.00,\"description\":\"Monthly service\"}"
```

---

## 🔒 Multi-Tenant Isolation Tests

### Test 1: Try to access another tenant's data (Should fail)
```bash
# Login to tenant 2
curl -X POST http://localhost:3001/api/tenants/2/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sheffieldtransport.co.uk\",\"password\":\"admin123\"}"

# Try to access tenant 1's customers (Should fail)
curl http://localhost:3001/api/tenants/1/customers \
  -H "Authorization: Bearer %TOKEN%"
```

### Test 2: Verify tenant_id in all responses
Check that all returned data has the correct tenant_id field.

---

## 🚨 Error Handling Tests

### Test 1: Missing Authorization header
```bash
curl http://localhost:3001/api/tenants/2/customers
```
**Expected:** 401 Unauthorized

### Test 2: Invalid tenant ID
```bash
curl http://localhost:3001/api/tenants/999/customers \
  -H "Authorization: Bearer %TOKEN%"
```
**Expected:** 403 Forbidden or 404 Not Found

### Test 3: Invalid resource ID
```bash
curl http://localhost:3001/api/tenants/2/customers/99999 \
  -H "Authorization: Bearer %TOKEN%"
```
**Expected:** 404 Not Found

### Test 4: Invalid data format
```bash
curl -X POST http://localhost:3001/api/tenants/2/customers \
  -H "Authorization: Bearer %TOKEN%" \
  -H "Content-Type: application/json" \
  -d "{\"invalid_field\":\"test\"}"
```
**Expected:** 400 Bad Request with validation errors

---

## 📝 Testing Checklist

For each endpoint, verify:
- [ ] Returns correct status code (200, 201, 404, etc.)
- [ ] Returns data in expected format
- [ ] Requires authentication
- [ ] Respects tenant isolation
- [ ] Validates input data
- [ ] Returns helpful error messages
- [ ] Response time is acceptable (< 500ms)

---

## 🛠️ PowerShell Helper Script

Create a file `test-api.ps1`:

```powershell
# API Testing Script
$BASE_URL = "http://localhost:3001"
$TENANT_ID = 2

# Login and get token
function Get-AuthToken {
    $body = @{
        email = "admin@sheffieldtransport.co.uk"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body

    return $response.token
}

# Test endpoint
function Test-Endpoint {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [string]$Token,
        [object]$Body = $null
    )

    $headers = @{
        Authorization = "Bearer $Token"
    }

    $params = @{
        Uri = "$BASE_URL$Endpoint"
        Method = $Method
        Headers = $headers
    }

    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json)
        $params.ContentType = "application/json"
    }

    try {
        $response = Invoke-RestMethod @params
        Write-Host "✅ Success: $Endpoint" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ Failed: $Endpoint - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Main test execution
Write-Host "🔑 Getting auth token..." -ForegroundColor Yellow
$token = Get-AuthToken
Write-Host "✅ Token obtained" -ForegroundColor Green

Write-Host "`n👥 Testing Customers..." -ForegroundColor Yellow
Test-Endpoint -Endpoint "/api/tenants/$TENANT_ID/customers" -Token $token

Write-Host "`n🚗 Testing Drivers..." -ForegroundColor Yellow
Test-Endpoint -Endpoint "/api/tenants/$TENANT_ID/drivers" -Token $token

Write-Host "`n🚙 Testing Vehicles..." -ForegroundColor Yellow
Test-Endpoint -Endpoint "/api/tenants/$TENANT_ID/vehicles" -Token $token

Write-Host "`n📊 Testing Dashboard..." -ForegroundColor Yellow
Test-Endpoint -Endpoint "/api/tenants/$TENANT_ID/dashboard/stats" -Token $token

Write-Host "`n✅ All tests complete!" -ForegroundColor Green
```

Run with:
```powershell
.\test-api.ps1
```

---

## 🎯 Ready to Start Testing?

1. **Start your server:** `npm run dev` in backend folder
2. **Get your token:** Run the login command above
3. **Start testing:** Copy/paste commands for each module
4. **Document results:** Update MODULE_TESTING_TRACKER.md

Let me know when you're ready to start!

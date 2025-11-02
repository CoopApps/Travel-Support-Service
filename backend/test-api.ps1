# API Testing Script for Travel Support App
$BASE_URL = "http://localhost:3001"
$TENANT_ID = 2

Write-Host "`n===== AUTHENTICATION MODULE TEST =====" -ForegroundColor Cyan
Write-Host ""

# Test 1: Login
Write-Host "Test 1: Login with valid credentials" -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    Write-Host "✅ PASS - Login successful!" -ForegroundColor Green
    Write-Host "   User: $($response.user.username) ($($response.user.role))"
    Write-Host "   User ID: $($response.user.user_id)"
    Write-Host "   Tenant ID: $($response.user.tenant_id)"
    Write-Host "   Token: $($response.token.Substring(0,50))..."

    # Save token for next tests
    $global:TOKEN = $response.token
    $global:USER = $response.user

} catch {
    Write-Host "❌ FAIL - Login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    exit 1
}

Write-Host ""

# Test 2: Login with wrong password
Write-Host "Test 2: Login with wrong password (should fail)" -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "wrongpassword"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    Write-Host "❌ FAIL - Should have been rejected!" -ForegroundColor Red

} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS - Correctly rejected invalid password" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING - Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 3: Access protected endpoint without token
Write-Host "Test 3: Access protected endpoint without token (should fail)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers" `
        -Method Get

    Write-Host "❌ FAIL - Should have been rejected!" -ForegroundColor Red

} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS - Correctly requires authentication" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING - Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 4: Access protected endpoint with valid token
Write-Host "Test 4: Access protected endpoint with valid token" -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $global:TOKEN"
    }

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ PASS - Successfully accessed protected endpoint" -ForegroundColor Green
    Write-Host "   Customers found: $($response.Count)"
    if ($response.Count -gt 0) {
        Write-Host "   First customer: $($response[0].first_name) $($response[0].last_name)"
    }

} catch {
    Write-Host "❌ FAIL - Could not access endpoint" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

Write-Host ""

# Test 5: Cross-tenant access (should fail)
Write-Host "Test 5: Try to access different tenant's data (should fail)" -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $global:TOKEN"
    }

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/1/customers" `
        -Method Get `
        -Headers $headers

    Write-Host "❌ FAIL - Should have been blocked!" -ForegroundColor Red

} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ PASS - Correctly blocked cross-tenant access" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING - Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "===== AUTHENTICATION TESTS COMPLETE =====" -ForegroundColor Cyan
Write-Host ""
Write-Host "Token saved in `$global:TOKEN for further testing" -ForegroundColor Gray
Write-Host ""

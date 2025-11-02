# Customer Module Testing Script
$BASE_URL = "http://localhost:3001"
$TENANT_ID = 2

Write-Host "`n===== CUSTOMER MODULE TEST =====" -ForegroundColor Cyan
Write-Host ""

# First, login to get token
Write-Host "Getting authentication token..." -ForegroundColor Gray
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $global:TOKEN = $response.token
    Write-Host "✅ Token obtained" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to login" -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $global:TOKEN"
}

Write-Host ""

# Test 1: List all customers
Write-Host "Test 1: GET /api/tenants/$TENANT_ID/customers - List all customers" -ForegroundColor Yellow
try {
    $customers = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ PASS - Retrieved customers" -ForegroundColor Green
    Write-Host "   Total customers: $($customers.Count)"

    if ($customers.Count -gt 0) {
        Write-Host "   Sample customer:"
        Write-Host "     ID: $($customers[0].customer_id)"
        Write-Host "     Name: $($customers[0].first_name) $($customers[0].last_name)"
        Write-Host "     Email: $($customers[0].email)"

        # Save first customer ID for later tests
        $global:TEST_CUSTOMER_ID = $customers[0].customer_id
    }

} catch {
    Write-Host "❌ FAIL - Could not list customers" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

Write-Host ""

# Test 2: Get specific customer
if ($global:TEST_CUSTOMER_ID) {
    Write-Host "Test 2: GET /api/tenants/$TENANT_ID/customers/:id - Get specific customer" -ForegroundColor Yellow
    try {
        $customer = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers/$global:TEST_CUSTOMER_ID" `
            -Method Get `
            -Headers $headers

        Write-Host "✅ PASS - Retrieved customer details" -ForegroundColor Green
        Write-Host "   ID: $($customer.customer_id)"
        Write-Host "   Name: $($customer.first_name) $($customer.last_name)"
        Write-Host "   Phone: $($customer.phone)"
        Write-Host "   Address: $($customer.address)"

    } catch {
        Write-Host "❌ FAIL - Could not get customer" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
    }

    Write-Host ""
}

# Test 3: Create new customer
Write-Host "Test 3: POST /api/tenants/$TENANT_ID/customers - Create new customer" -ForegroundColor Yellow
try {
    $newCustomer = @{
        first_name = "Test"
        last_name = "Customer"
        email = "test.customer@example.com"
        phone = "+44 123 456 7890"
        address = "123 Test Street"
        city = "Sheffield"
        postcode = "S1 1AA"
        mobility_needs = "Wheelchair accessible vehicle required"
    } | ConvertTo-Json

    $created = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $newCustomer

    Write-Host "✅ PASS - Customer created successfully" -ForegroundColor Green
    Write-Host "   New customer ID: $($created.customer_id)"
    Write-Host "   Name: $($created.first_name) $($created.last_name)"

    $global:CREATED_CUSTOMER_ID = $created.customer_id

} catch {
    Write-Host "❌ FAIL - Could not create customer" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

Write-Host ""

# Test 4: Update customer
if ($global:CREATED_CUSTOMER_ID) {
    Write-Host "Test 4: PUT /api/tenants/$TENANT_ID/customers/:id - Update customer" -ForegroundColor Yellow
    try {
        $updateData = @{
            phone = "+44 999 888 7777"
            postcode = "S2 2BB"
        } | ConvertTo-Json

        $updated = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers/$global:CREATED_CUSTOMER_ID" `
            -Method Put `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $updateData

        Write-Host "✅ PASS - Customer updated successfully" -ForegroundColor Green
        Write-Host "   Updated phone: $($updated.phone)"
        Write-Host "   Updated postcode: $($updated.postcode)"

    } catch {
        Write-Host "❌ FAIL - Could not update customer" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
    }

    Write-Host ""
}

# Test 5: Delete customer
if ($global:CREATED_CUSTOMER_ID) {
    Write-Host "Test 5: DELETE /api/tenants/$TENANT_ID/customers/:id - Delete customer" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers/$global:CREATED_CUSTOMER_ID" `
            -Method Delete `
            -Headers $headers

        Write-Host "✅ PASS - Customer deleted successfully" -ForegroundColor Green

        # Verify it's actually deleted (or soft-deleted)
        try {
            $deleted = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers/$global:CREATED_CUSTOMER_ID" `
                -Method Get `
                -Headers $headers

            if ($deleted.is_active -eq $false) {
                Write-Host "   ✓ Soft delete confirmed (is_active = false)" -ForegroundColor Gray
            } else {
                Write-Host "   ⚠️  Customer still active" -ForegroundColor Yellow
            }
        } catch {
            if ($_.Exception.Response.StatusCode -eq 404) {
                Write-Host "   ✓ Hard delete confirmed (404 Not Found)" -ForegroundColor Gray
            }
        }

    } catch {
        Write-Host "❌ FAIL - Could not delete customer" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
    }

    Write-Host ""
}

# Test 6: Validation - Create customer with missing required fields
Write-Host "Test 6: Create customer with missing required fields (should fail)" -ForegroundColor Yellow
try {
    $invalidCustomer = @{
        email = "incomplete@example.com"
        # Missing first_name and last_name
    } | ConvertTo-Json

    $created = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $invalidCustomer

    Write-Host "❌ FAIL - Should have rejected invalid data" -ForegroundColor Red

} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ PASS - Correctly validated required fields" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING - Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 7: Non-existent customer
Write-Host "Test 7: Get non-existent customer (should return 404)" -ForegroundColor Yellow
try {
    $customer = Invoke-RestMethod -Uri "$BASE_URL/api/tenants/$TENANT_ID/customers/999999" `
        -Method Get `
        -Headers $headers

    Write-Host "❌ FAIL - Should have returned 404" -ForegroundColor Red

} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ PASS - Correctly returned 404 for non-existent customer" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING - Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "===== CUSTOMER MODULE TESTS COMPLETE =====" -ForegroundColor Cyan
Write-Host ""

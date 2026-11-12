[CmdletBinding()]
param(
    [string]$Feature = "",
    [string]$Tier = "",
    [switch]$CollectOnly = $false
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root

try {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "===   Book-Mall Opaque-Box E2E Test Suite Runner       ===" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    # Step 1: Execute Architecture & Security Harness
    Write-Host "`n[Step 1/2] Running Architecture & Security Compliance Harness..." -ForegroundColor Yellow
    $harnessScript = Join-Path $PSScriptRoot "verify-harness.ps1"
    if (Test-Path $harnessScript) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $harnessScript
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FAIL] Static architecture harness verification failed with exit code $LASTEXITCODE." -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } else {
        Write-Host "[WARN] verify-harness.ps1 not found, continuing to E2E suite..." -ForegroundColor Yellow
    }

    # Step 2: Run Playwright E2E Tests via Pytest
    Write-Host "`n[Step 2/2] Running Opaque-Box E2E Tests (System Chrome Headless)..." -ForegroundColor Yellow

    $pytestArgs = @("-m", "pytest", "tests/e2e")

    if ($CollectOnly) {
        $pytestArgs += "--collect-only"
    } else {
        $pytestArgs += "-v"
    }

    if ($Feature) {
        if ($Feature -match '^[fF]?(\d+)$') {
            $num = [int]$Matches[1]
            $fNorm = "f$num" + "_ or f{0:D2}_" -f $num
            $pytestArgs += @("-k", $fNorm)
        } else {
            $pytestArgs += @("-k", $Feature)
        }
    }

    if ($Tier) {
        if ($Tier -match '^[tT]?(\d+)$') {
            $tNorm = "tier" + $Matches[1]
        } else {
            $tNorm = $Tier.ToLower()
        }
        $pytestArgs += @("-m", $tNorm)
    }

    Write-Host "Executing command: python $($pytestArgs -join ' ')" -ForegroundColor DarkGray
    & python @pytestArgs
    $pytestExit = $LASTEXITCODE

    if ($pytestExit -ne 0) {
        Write-Host "`n[FAIL] E2E test execution failed with exit code $pytestExit." -ForegroundColor Red
        exit $pytestExit
    }

    Write-Host "`n[PASSED] All Architecture, Security, and E2E Test Suites Passed Successfully!" -ForegroundColor Green
    exit 0
} finally {
    Pop-Location
}

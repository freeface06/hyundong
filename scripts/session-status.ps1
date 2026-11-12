$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    if ([Console]::IsInputRedirected) {
        $null = [Console]::In.ReadToEnd()
    }

    $root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $adrPath = Join-Path $root "docs/adr/000-pending-decisions.md"

    $hasPendingAdr = $false
    if (Test-Path $adrPath) {
        $adrContent = Get-Content -Path $adrPath -Raw -Encoding UTF8
        if ($adrContent -match "PENDING") {
            $hasPendingAdr = $true
        }
    }

    $adminInitialized = (Test-Path (Join-Path $root "mall-admin/build.gradle")) -or
                        (Test-Path (Join-Path $root "mall-admin/build.gradle.kts")) -or
                        (Test-Path (Join-Path $root "mall-admin/pom.xml"))

    $frontInitialized = (Test-Path (Join-Path $root "mall-front/package.json")) -or
                        (Test-Path (Join-Path $root "mall-front/build.gradle")) -or
                        (Test-Path (Join-Path $root "mall-front/build.gradle.kts")) -or
                        (Test-Path (Join-Path $root "mall-front/pom.xml"))

    $statusMsg = "[Book-Mall Harness Active] " +
                 "mall-admin initialized=$adminInitialized | " +
                 "mall-front initialized=$frontInitialized | " +
                 "ADR-000 pending decisions=$hasPendingAdr. " +
                 "Reminder: Review docs/adr/000-pending-decisions.md before scaffolding, keep mall-front strictly API-only (zero DB access), enforce 100% responsive PC-to-Mobile layout adaptation across BOTH mall-front and mall-admin, use brand main color #918a7d, and encrypt all customer/recipient PII in mall-admin."

    $payload = @{
        injectSteps = @(
            @{
                systemMessage = @{
                    systemMessage = $statusMsg
                }
            }
        )
    }

    Write-Output ($payload | ConvertTo-Json -Depth 6 -Compress)
} catch {
    Write-Output "{}"
}

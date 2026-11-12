$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$violations = New-Object System.Collections.Generic.List[string]

Write-Host "=== Book-Mall Architecture & Security Harness Verifier ==="

# 1. Core Harness Files Check
$requiredFiles = @(
    "AGENTS.md",
    "mall-admin/AGENTS.md",
    "mall-front/AGENTS.md",
    "docs/architecture.md",
    "docs/adr/000-pending-decisions.md",
    "docs/specs/domain-erd.md",
    "docs/specs/security-pii-spec.md",
    "docs/specs/store-api-contract.md",
    "docs/specs/delivery-workflow-spec.md",
    "docs/specs/ui-design-system.md",
    "docs/specs/bookstore-benchmark-spec.md"
)

foreach ($rel in $requiredFiles) {
    $full = Join-Path $root $rel
    if (-not (Test-Path $full)) {
        $violations.Add("[HARNESS] Missing required harness file: $rel")
    }
}

# 2. Boundary Check: mall-front must NEVER touch DB/ORM or /api/v1/admin
$frontDir = Join-Path $root "mall-front"
if (Test-Path $frontDir) {
    $frontFiles = Get-ChildItem -Path $frontDir -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -ne "AGENTS.md" -and
            $_.FullName -notmatch "[\\/](node_modules|\.next|dist|build|target)[\\/]"
        }

    $forbiddenFrontPatterns = @(
        "spring-boot-starter-data-jpa",
        "jakarta\.persistence",
        "javax\.persistence",
        "jdbc:",
        """prisma""",
        """typeorm""",
        """drizzle-orm""",
        "/api/v1/admin"
    )

    foreach ($file in $frontFiles) {
        $text = Get-Content -Path $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($null -eq $text) { continue }
        foreach ($pat in $forbiddenFrontPatterns) {
            if ($text -match $pat) {
                $violations.Add("[BOUNDARY] Forbidden DB/Admin reference '$pat' found in mall-front: $($file.FullName)")
            }
        }

        if ($text -match "\b(bg|text|border|ring)-(blue|indigo|purple|violet)-[4567]00\b") {
            $violations.Add("[DESIGN] Default blue/indigo/purple utility detected in mall-front (use #918a7d brand tokens): $($file.FullName)")
        }

        if ($text -match "user-scalable\s*=\s*no") {
            $violations.Add("[RESPONSIVE] Viewport disables zoom (user-scalable=no) in mall-front: $($file.FullName)")
        }
    }

    $frontInitialized = (Test-Path (Join-Path $frontDir "package.json")) -or
                        (Test-Path (Join-Path $frontDir "build.gradle")) -or
                        (Test-Path (Join-Path $frontDir "build.gradle.kts")) -or
                        (Test-Path (Join-Path $frontDir "pom.xml"))

    if ($frontInitialized) {
        $hasBrandHex = $false
        foreach ($file in $frontFiles) {
            $text = Get-Content -Path $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($null -ne $text -and $text -match "#918a7d") {
                $hasBrandHex = $true
                break
            }
        }
        if (-not $hasBrandHex) {
            $violations.Add("[DESIGN] Brand primary color '#918a7d' is not defined anywhere in initialized mall-front.")
        }
    }
}

# 3. Spring Boot 4.1 & PII Encryption Check in mall-admin
$adminSrcDir = Join-Path $root "mall-admin/src/main"
if (Test-Path $adminSrcDir) {
    $codeFiles = Get-ChildItem -Path $adminSrcDir -Recurse -File -Include "*.java", "*.kt" -ErrorAction SilentlyContinue

    foreach ($file in $codeFiles) {
        $text = Get-Content -Path $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($null -eq $text) { continue }

        if ($text -match "import\s+javax\.(persistence|validation|servlet)\.") {
            $violations.Add("[BOOT4] Legacy javax.* import detected (use jakarta.*): $($file.FullName)")
        }

        if ($text -match "\.authorizeRequests\s*\(" -or $text -match "\.antMatchers\s*\(") {
            $violations.Add("[SECURITY7] Removed Spring Security API detected (use Lambda DSL authorizeHttpRequests/requestMatchers): $($file.FullName)")
        }

        if ($text -match "@Entity") {
            $piiFields = @("phoneNumber", "recipientName", "recipientPhone", "addressLine1", "addressLine2")
            foreach ($field in $piiFields) {
                if (($text -match "\b$field\b") -and ($text -notmatch "@Convert")) {
                    $violations.Add("[PII-CRYPTO] Entity contains PII field '$field' without JPA @Convert encryption: $($file.FullName)")
                }
            }
        }
    }

    # 4. Hardcoded Secret Check in tracked config files
    $configFiles = Get-ChildItem -Path $adminSrcDir -Recurse -File -Include "application.yml", "application.yaml", "application.properties", "application-prod.*" -ErrorAction SilentlyContinue
    foreach ($cfg in $configFiles) {
        $lines = Get-Content -Path $cfg.FullName -Encoding UTF8 -ErrorAction SilentlyContinue
        foreach ($line in $lines) {
            if ($line -match "^\s*#") { continue }
            if ($line -match "(enc-key|encKey|hmac-key|hmacKey|jwt-secret|jwtSecret)\s*[:=]\s*(.+)$") {
                $val = $Matches[2].Trim()
                if ($val.Length -gt 0 -and $val -notmatch "\$\{") {
                    $violations.Add("[SECRET] Hardcoded crypto/auth secret without env var placeholder in: $($cfg.FullName)")
                }
            }
        }
    }

    # 5. Admin UI Brand Color (#918a7d) & Responsive Hygiene Check (when Admin UI files exist)
    $adminDir = Join-Path $root "mall-admin"
    $adminUiFiles = Get-ChildItem -Path $adminDir -Recurse -File -Include "*.html", "*.css", "*.scss", "*.tsx", "*.jsx" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notmatch "[\\/](node_modules|\.next|dist|build|target)[\\/]"
        }

    if ($null -ne $adminUiFiles -and @($adminUiFiles).Count -gt 0) {
        $hasAdminBrandHex = $false
        foreach ($uiFile in $adminUiFiles) {
            $uiText = Get-Content -Path $uiFile.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($null -eq $uiText) { continue }

            if ($uiText -match "#918a7d") {
                $hasAdminBrandHex = $true
            }

            if ($uiText -match "\b(bg|text|border|ring)-(blue|indigo|purple|violet)-[4567]00\b") {
                $violations.Add("[ADMIN-DESIGN] Default blue/indigo/purple utility detected in mall-admin UI (use #918a7d brand tokens): $($uiFile.FullName)")
            }

            if ($uiText -match "user-scalable\s*=\s*no") {
                $violations.Add("[ADMIN-RESPONSIVE] Viewport disables zoom (user-scalable=no) in mall-admin UI: $($uiFile.FullName)")
            }
        }

        if (-not $hasAdminBrandHex) {
            $violations.Add("[ADMIN-DESIGN] Brand primary color '#918a7d' is not defined anywhere in mall-admin UI files.")
        }
    }
}

if ($violations.Count -gt 0) {
    Write-Host "`n[FAILED] Found $($violations.Count) harness violation(s):" -ForegroundColor Red
    foreach ($v in $violations) {
        Write-Host "  - $v" -ForegroundColor Red
    }
    exit 1
}

Write-Host "[PASSED] All harness architecture & security checks succeeded." -ForegroundColor Green
exit 0

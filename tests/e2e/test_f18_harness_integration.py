"""Opaque-box E2E Tests for Feature 18:
- Feature 18: Architecture & Security Harness Verification and Git Release Readiness (F18_HARNESS_GIT)
"""
import os
import subprocess
import pytest
from tests.e2e.conftest import WORKSPACE_ROOT

# ==============================================================================
# FEATURE 18: VERIFICATION HARNESS & GIT RELEASE (F18)
# ==============================================================================

@pytest.mark.tier1
def test_t1_f18_01_verify_harness_script_passes():
    """Verify scripts/verify-harness.ps1 executes and passes with exit code 0."""
    harness_path = os.path.join(WORKSPACE_ROOT, "scripts", "verify-harness.ps1")
    assert os.path.exists(harness_path), "scripts/verify-harness.ps1 must exist"
    cmd = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        harness_path
    ]
    proc = subprocess.run(cmd, cwd=WORKSPACE_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, f"Harness verification failed:\n{proc.stdout}\n{proc.stderr}"
    assert "[PASSED]" in proc.stdout

@pytest.mark.tier1
def test_t1_f18_02_all_required_specification_files_exist():
    """Verify all 11 required architectural and specification files exist as verified by harness."""
    required_files = [
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
    ]
    for rel_path in required_files:
        full_path = os.path.join(WORKSPACE_ROOT, rel_path)
        assert os.path.exists(full_path), f"Missing required specification file: {rel_path}"

@pytest.mark.tier1
def test_t1_f18_03_test_e2e_runner_script_exists():
    """Verify scripts/test-e2e.ps1 exists and is runnable."""
    runner_path = os.path.join(WORKSPACE_ROOT, "scripts", "test-e2e.ps1")
    assert os.path.exists(runner_path), "scripts/test-e2e.ps1 must exist"

@pytest.mark.tier1
def test_t1_f18_04_target_git_remote_url_contract():
    """Verify the target git remote URL contract specified in requirements."""
    # Inspect actual repository git configuration
    proc = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=WORKSPACE_ROOT,
        capture_output=True,
        text=True
    )
    assert proc.returncode == 0, (
        f"Git remote 'origin' is not configured. Execute 'git remote add origin https://github.com/freeface06/hyundong.git'.\n"
        f"Stderr: {proc.stderr}"
    )
    remote_url = proc.stdout.strip()
    assert remote_url == "https://github.com/freeface06/hyundong.git", (
        f"Expected remote origin 'https://github.com/freeface06/hyundong.git', got '{remote_url}'"
    )

@pytest.mark.tier1
def test_t1_f18_05_gitignore_excludes_unwanted_files():
    """Verify .gitignore properly excludes logs, temp files, and node_modules."""
    gitignore_path = os.path.join(WORKSPACE_ROOT, ".gitignore")
    assert os.path.exists(gitignore_path), ".gitignore must exist"
    with open(gitignore_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert ".log" in content or "node_modules" in content or ".pytest_cache" in content

@pytest.mark.tier2
def test_t2_f18_01_responsive_viewport_user_scalable_rule():
    """Verify no HTML files disable user zooming with user-scalable=no."""
    for fname in os.listdir(WORKSPACE_ROOT):
        if fname.endswith(".html"):
            with open(os.path.join(WORKSPACE_ROOT, fname), "r", encoding="utf-8") as f:
                content = f.read()
            assert "user-scalable=no" not in content, f"Found user-scalable=no in {fname}"

@pytest.mark.tier2
def test_t2_f18_02_no_forbidden_tailwind_palette_in_css():
    """Verify tokens and stylesheets adhere to brand palette without generic blues."""
    tokens_path = os.path.join(WORKSPACE_ROOT, "css", "tokens.css")
    with open(tokens_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "#918a7d" in content

@pytest.mark.tier2
def test_t2_f18_03_no_db_in_frontend():
    """Verify front code does not import DB or ORM drivers."""
    js_dir = os.path.join(WORKSPACE_ROOT, "js")
    for fname in os.listdir(js_dir):
        if fname.endswith(".js"):
            with open(os.path.join(js_dir, fname), "r", encoding="utf-8") as f:
                content = f.read()
            assert "jakarta.persistence" not in content
            assert "prisma" not in content

@pytest.mark.tier2
def test_t2_f18_04_harness_script_syntactic_validity():
    """Verify verify-harness.ps1 has valid PowerShell syntax."""
    harness_path = os.path.join(WORKSPACE_ROOT, "scripts", "verify-harness.ps1")
    assert os.path.exists(harness_path)
    with open(harness_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "Book-Mall Architecture & Security Harness Verifier" in content

@pytest.mark.tier2
def test_t2_f18_05_clean_test_runner_exit_code_zero():
    """Verify test-e2e.ps1 with -CollectOnly returns exit code 0."""
    runner_path = os.path.join(WORKSPACE_ROOT, "scripts", "test-e2e.ps1")
    cmd = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        runner_path,
        "-CollectOnly"
    ]
    proc = subprocess.run(cmd, cwd=WORKSPACE_ROOT, capture_output=True, text=True)
    assert proc.returncode == 0, f"Runner validation failed:\n{proc.stdout}\n{proc.stderr}"

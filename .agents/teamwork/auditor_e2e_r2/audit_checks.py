import glob
import os
import re

print("=== CHECK 1: dom_helpers.py sticky footer check ===")
dom_helpers_path = "tests/e2e/helpers/dom_helpers.py"
dom_helpers = open(dom_helpers_path, encoding="utf-8").read()
if "Math.round(r.top) >= 0" in dom_helpers:
    print("[FAIL] Flawed condition Math.round(r.top) >= 0 still present in dom_helpers.py!")
else:
    print("[PASS] Flawed condition Math.round(r.top) >= 0 is ABSENT.")

print("\n=== CHECK 2: Evaluate bypasses (return true/false/synthetic string) ===")
py_files = sorted(glob.glob("tests/e2e/*.py") + glob.glob("tests/e2e/helpers/*.py"))

# Specifically look for:
# 1) return true; or return false; or return '...'; as fallback inside if (!element)
# 2) synthetic return values in evaluate blocks
bypass_regexes = [
    re.compile(r"if\s*\(![^)]+\)\s*return\s+(true|false|['\"`][^'\"`]+['\"`])", re.IGNORECASE),
    re.compile(r"if\s*\(!el\)\s*return", re.IGNORECASE),
    re.compile(r"if\s*\(!row\)\s*return", re.IGNORECASE),
    re.compile(r"if\s*\(!c\)\s*return", re.IGNORECASE),
    re.compile(r"if\s*\(!actions\)\s*return", re.IGNORECASE),
    re.compile(r"return\s+['\"`].*?['\"`]\s*;\s*//\s*fallback", re.IGNORECASE),
]

bypass_found = []
for pf in py_files:
    content = open(pf, encoding="utf-8").read()
    for i, line in enumerate(content.splitlines(), start=1):
        for rgx in bypass_regexes:
            if rgx.search(line):
                bypass_found.append((pf, i, line.strip()))

if bypass_found:
    print(f"[FAIL] Found {len(bypass_found)} evaluate bypasses:")
    for f, line_num, l in bypass_found:
        print(f"  {f}:{line_num} -> {l}")
else:
    print(f"[PASS] Zero evaluate bypasses found across {len(py_files)} files.")

# Let's also inspect all evaluate blocks across all test files to see what they return
print("\n--- Inspecting all page.evaluate returns across test files ---")
eval_blocks = []
for pf in py_files:
    content = open(pf, encoding="utf-8").read()
    # Find evaluate calls
    for match in re.finditer(r"evaluate\(\s*(?:f?\"\"\"|f?\'\'\'|\"|\')(.*?)(?:\"\"\"|\'\'\'|\"|\')", content, re.DOTALL):
        snippet = match.group(1).strip()
        # check if it contains return
        returns = re.findall(r"return\s+([^;}\n]+)", snippet)
        for ret in returns:
            # Check if suspicious
            ret_clean = ret.strip()
            if ret_clean in ["true", "false", "'true'", '"true"'] and "if (" in snippet:
                eval_blocks.append((pf, snippet[:80], ret_clean))

print(f"Suspicious conditional boolean returns in evaluate blocks: {len(eval_blocks)}")
for pf, snip, ret in eval_blocks:
    print(f"  {pf}: return {ret} in: {snip!r}")

print("\n=== CHECK 3: Vacuous assertion guards (if ... count() > 0:) ===")
vacuous_guards = []
guard_regex = re.compile(r"if\s+.*count\(\)\s*>\s*0\s*:")
for pf in py_files:
    content = open(pf, encoding="utf-8").read()
    for i, line in enumerate(content.splitlines(), start=1):
        if guard_regex.search(line):
            vacuous_guards.append((pf, i, line.strip()))

if vacuous_guards:
    print(f"[FAIL] Found {len(vacuous_guards)} vacuous count() > 0 guards:")
    for f, line_num, l in vacuous_guards:
        print(f"  {f}:{line_num} -> {l}")
else:
    print(f"[PASS] Zero vacuous count() > 0 guards found across {len(py_files)} files.")

print("\n=== CHECK 4: Mathematical tautologies (count() >= 0, etc.) ===")
tautology_regexes = [
    re.compile(r"count\(\)\s*>=\s*0"),
    re.compile(r"r\.top\s*>=\s*0"),
    re.compile(r"top\s*>=\s*0\s*\|\|"),
    re.compile(r"target_remote\s*==\s*target_remote"),
    re.compile(r"assert\s+True\b"),
]
tautologies_found = []
for pf in py_files:
    content = open(pf, encoding="utf-8").read()
    for i, line in enumerate(content.splitlines(), start=1):
        for rgx in tautology_regexes:
            if rgx.search(line):
                tautologies_found.append((pf, i, line.strip()))

if tautologies_found:
    print(f"[FAIL] Found {len(tautologies_found)} tautologies:")
    for f, line_num, l in tautologies_found:
        print(f"  {f}:{line_num} -> {l}")
else:
    print(f"[PASS] Zero tautologies found across {len(py_files)} files.")

print("\n=== CHECK 5: Superficial stubs (assert page.locator('body').is_visible()) ===")
body_stubs = []
body_stub_regex = re.compile(r"assert\s+.*page\.locator\([\'\"`]body[\'\"`]\)\.is_visible\(\)")
for pf in py_files:
    content = open(pf, encoding="utf-8").read()
    for i, line in enumerate(content.splitlines(), start=1):
        if body_stub_regex.search(line):
            body_stubs.append((pf, i, line.strip()))

if body_stubs:
    print(f"[FAIL] Found {len(body_stubs)} superficial body.is_visible() stubs:")
    for f, line_num, l in body_stubs:
        print(f"  {f}:{line_num} -> {l}")
else:
    print(f"[PASS] Zero superficial body.is_visible() stubs found across {len(py_files)} files.")

print("\n=== CHECK 6: Audit F18 Git test (test_t1_f18_04_target_git_remote_url_contract) ===")
f18_file = "tests/e2e/test_f18_harness_integration.py"
f18_content = open(f18_file, encoding="utf-8").read()
print("Extracting test_t1_f18_04 implementation:")
m = re.search(r"def test_t1_f18_04_target_git_remote_url_contract.*?(?=\ndef |\Z)", f18_content, re.DOTALL)
if m:
    print(m.group(0))
else:
    print("[FAIL] Could not find test_t1_f18_04_target_git_remote_url_contract!")

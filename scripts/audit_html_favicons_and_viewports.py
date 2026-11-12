import os
import re
import glob

html_files = sorted(glob.glob("*.html"))
print(f"Auditing {len(html_files)} HTML files for favicon links and viewport tags...")

results = []
all_ok = True

for hf in html_files:
    with open(hf, "r", encoding="utf-8") as f:
        html = f.read()

    # Viewport check
    vp_match = re.search(r'<meta[^>]+name=["\']viewport["\'][^>]*>', html, re.I)
    has_vp = bool(vp_match)
    vp_str = vp_match.group(0) if vp_match else "NONE"
    user_scalable_no = "user-scalable=no" in vp_str.lower()

    # Favicon checks
    icon_links = re.findall(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]*>', html, re.I)
    svg_links = [l for l in icon_links if "favicon.svg" in l]
    ico_links = [l for l in icon_links if "favicon.ico" in l]

    # Verify targets exist on disk relative to the file
    svg_valid = False
    ico_valid = False
    if svg_links:
        # Extract href
        href_match = re.search(r'href=["\']([^"\']+)["\']', svg_links[0])
        if href_match:
            target = href_match.group(1).lstrip("./")
            svg_valid = os.path.exists(target)

    if ico_links:
        href_match = re.search(r'href=["\']([^"\']+)["\']', ico_links[0])
        if href_match:
            target = href_match.group(1).lstrip("./")
            ico_valid = os.path.exists(target)

    status = "OK"
    if not has_vp or user_scalable_no or not svg_valid:
        status = "FAIL"
        all_ok = False

    results.append({
        "file": hf,
        "has_vp": has_vp,
        "user_scalable_no": user_scalable_no,
        "icon_links_count": len(icon_links),
        "has_svg_favicon": bool(svg_links),
        "svg_file_exists": svg_valid,
        "has_ico_favicon": bool(ico_links),
        "ico_file_exists": ico_valid,
        "status": status
    })
    print(f"[{status}] {hf:22} | VP: {has_vp} (user-scalable=no: {user_scalable_no}) | Favicon SVG: {bool(svg_links)} (exists: {svg_valid}), ICO: {bool(ico_links)} (exists: {ico_valid})")

print("=" * 80)
if all_ok:
    print("ALL 14 HTML FILES COMPLY WITH FAVICON AND VIEWPORT REQUIREMENTS!")
else:
    print("SOME HTML FILES FAILED AUDIT!")

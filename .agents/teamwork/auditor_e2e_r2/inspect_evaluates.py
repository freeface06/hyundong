import glob
import re

for cf in sorted(glob.glob("tests/e2e/*.py")):
    content = open(cf, encoding="utf-8").read()
    matches = re.findall(r'evaluate\("""(.*?)"""', content, re.DOTALL)
    matches += re.findall(r'evaluate\(\'\'\'(.*?)\'\'\'', content, re.DOTALL)
    matches += re.findall(r'evaluate\("([^"]*)"', content)
    matches += re.findall(r'evaluate\(\'([^\']*)\'', content)
    for m in matches:
        for line in m.splitlines():
            line = line.strip()
            if re.search(r'return\s+(true|false|["\'][^"\']+["\'])', line, re.IGNORECASE):
                print(f"[{cf}] {line}")

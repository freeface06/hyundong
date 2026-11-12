import re

content = open("tests/e2e/test_f14_f17_order_fulfillment.py", encoding="utf-8").read()
# Find all page.evaluate or locator.evaluate with their surrounding lines
for i, line in enumerate(content.splitlines(), 1):
    if ".evaluate(" in line:
        print(f"Line {i}: {line.strip()[:100]}")

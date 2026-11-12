import os
import struct
import xml.etree.ElementTree as ET

try:
    from PIL import Image
    has_pil = True
except ImportError:
    has_pil = False

files = [
    'favicon.svg',
    'favicon.ico',
    'images/logo.svg',
    'images/hero-bg-pc.webp',
    'images/hero-bg-pc.svg',
    'images/hero-bg-mobile.webp',
    'images/hero-bg-mobile.svg'
]

print(f"PIL available: {has_pil}")
for f in files:
    path = os.path.abspath(f)
    if not os.path.exists(path):
        print(f"[FAIL] Missing: {f}")
        continue
    size = os.path.getsize(path)
    if size == 0:
        print(f"[FAIL] Empty file (0 bytes): {f}")
        continue
    
    with open(path, 'rb') as fp:
        head = fp.read(32)
    
    status = f"Size: {size} bytes"
    if f.endswith('.svg'):
        try:
            tree = ET.parse(path)
            root = tree.getroot()
            vb = root.get('viewBox') or root.get('viewbox') or "N/A"
            status += f" | XML valid, tag={root.tag}, viewBox={vb}"
            with open(path, 'r', encoding='utf-8') as sfp:
                scontent = sfp.read()
            if "#918a7d" in scontent.lower():
                status += " | Contains brand color #918a7d"
            else:
                status += " | [WARN] Brand color #918a7d not found in SVG content"
        except Exception as e:
            status += f" | XML parse error: {e}"
    elif f.endswith('.ico'):
        if head[:4] == b'\x00\x00\x01\x00':
            count = struct.unpack('<H', head[4:6])[0]
            status += f" | Valid ICO header (00 00 01 00), image count={count}"
        else:
            status += f" | Invalid ICO header: {head[:4].hex()}"
    elif f.endswith('.webp'):
        if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
            status += " | Valid WEBP header (RIFF...WEBP)"
            if has_pil:
                try:
                    img = Image.open(path)
                    status += f", format={img.format}, size={img.size}, mode={img.mode}"
                except Exception as e:
                    status += f", PIL open error: {e}"
        else:
            status += f" | Invalid WEBP header: {head[:12]}"
            
    print(f"[OK] {f}: {status}")

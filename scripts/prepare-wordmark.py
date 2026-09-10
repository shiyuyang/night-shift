"""Bake the existing sRGB luminance mask into alpha for native WebViews.

Run: uv run --with pillow python scripts/prepare-wordmark.py
Retains the source RGB and reproduces CSS mask-mode:luminance opacity.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'public/assets/yakin-byoutou-title-v4.png').convert('RGB')
alpha = source.convert('L', (0.2126, 0.7152, 0.0722, 0))
source.putalpha(alpha)
source.save(root / 'public/assets/yakin-byoutou-title-alpha-v1.webp', lossless=True, method=6)

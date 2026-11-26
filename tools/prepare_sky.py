"""Convert the credited CC0 panorama to a small self-contained, offline sky texture."""
import base64
import hashlib
import io
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

source = Path(sys.argv[1])
raw = source.read_bytes()
if hashlib.sha256(raw).hexdigest() != "5244534e9cf5b606f2ff513aa00ddb161b0a4826ffd88a0d3bd03ac29247d198":
    raise ValueError("Expected the credited Poly Haven 2K HDR panorama")
sky = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_UNCHANGED)
assert sky.shape == (1024, 2048, 3)
# Only the upper hemisphere is needed. ACES filmic roll-off preserves sunlit cloud detail.
linear = sky[:512, :, ::-1] * 1.08
mapped = np.clip((linear * (2.51 * linear + 0.03)) / (linear * (2.43 * linear + 0.59) + 0.14), 0, 1)
rgb = np.where(mapped <= 0.0031308, mapped * 12.92, 1.055 * mapped ** (1 / 2.4) - 0.055)
image = Image.fromarray(np.rint(rgb * 255).astype(np.uint8))
encoded = io.BytesIO()
image.save(encoded, "WEBP", quality=87, method=6)
target = Path(__file__).resolve().parents[1] / "dist" / "day-sky.js"
target.write_text('/* Poly Haven, Greg Zaal and Jarod Guest · CC0. See asset-sources.txt. */\n'
                  'window.CAMPUS_DAY_SKY="data:image/webp;base64,' +
                  base64.b64encode(encoded.getvalue()).decode("ascii") + '";\n', encoding="utf-8")

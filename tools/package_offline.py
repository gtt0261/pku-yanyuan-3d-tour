"""Package the authored website and its sources without hosting metadata or nested ZIPs."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
output = root / "dist" / "downloads" / "yanyuan-day-tour.zip"
files = [root / "README.md"]
for directory in ("dist", "tests", "tools"):
    files.extend(p for p in sorted((root / directory).rglob("*"))
                 if p.is_file() and output.parent not in p.parents
                 and "__pycache__" not in p.parts and not p.name.startswith("."))
output.parent.mkdir(exist_ok=True)
temporary = output.with_suffix(".partial")
with ZipFile(temporary, "w", ZIP_DEFLATED, compresslevel=8) as archive:
    for p in files:
        archive.write(p, p.relative_to(root).as_posix())
with ZipFile(temporary) as archive:
    assert archive.testzip() is None
    assert {"dist/index.html", "dist/vendor/LICENSE", "dist/campus-data.js",
            "dist/tour.js", "dist/sky-water.js", "README.md"} <= set(archive.namelist())
temporary.replace(output)
print(f"{len(files)} files, {output.stat().st_size:,} bytes")

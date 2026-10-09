"""Extract ordered PPT objects and original media shared by the two lecture modes."""
import hashlib
import json
import posixpath
from pathlib import Path
import subprocess
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "AI工程学/PPT材料/Fundamentals of Artificial Neural Networks.pptx"
OUT = ROOT / "AI工程学/.course-build/01-neural-networks"
NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def text(node):
    return [item.text or "" for item in node.iter() if item.tag.split("}")[-1] == "t"]


def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


OUT.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(SOURCE) as archive:
    def rels(part):
        name = posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")
        if name not in archive.namelist():
            return []
        return [dict(item.attrib) for item in ET.fromstring(archive.read(name))]

    ordered = ET.fromstring(archive.read("ppt/presentation.xml"))
    order_rels = {item["Id"]: item["Target"] for item in rels("ppt/presentation.xml")}
    slides = []
    assets = []
    for page, item in enumerate(ordered.findall("p:sldIdLst/p:sldId", NS), 1):
        part = posixpath.normpath(posixpath.join("ppt", order_rels[item.get("{" + NS["r"] + "}id")]))
        tree = ET.fromstring(archive.read(part))
        relationships = rels(part)
        objects = []
        for obj in tree.find("p:cSld/p:spTree", NS):
            if obj.tag.split("}")[-1] not in {"sp", "pic", "cxnSp", "graphicFrame", "grpSp"}:
                continue
            objects.append({
                "type": obj.tag.split("}")[-1],
                "text": text(obj),
                "xml": ET.tostring(obj, encoding="unicode"),
            })
        media = []
        notes = []
        for relation in relationships:
            target = posixpath.normpath(posixpath.join(posixpath.dirname(part), relation["Target"]))
            if relation["Type"].endswith("/notesSlide") and target in archive.namelist():
                notes = text(ET.fromstring(archive.read(target)))
            if "/media/" in target and relation.get("TargetMode") != "External":
                record = {"sourcePage": page, "part": target, "relationshipId": relation["Id"], "type": relation["Type"], "sha256": hashlib.sha256(archive.read(target)).hexdigest()}
                assets.append(record)
                media.append(record)
        slides.append({
            "sourcePage": page,
            "part": part,
            "hidden": tree.get("show") == "0",
            "exactText": text(tree),
            "formulas": [ET.tostring(node, encoding="unicode") for node in tree.findall(".//m:oMath", NS)],
            "notes": notes,
            "objects": objects,
            "relationships": relationships,
            "assets": media,
            "timingXml": [ET.tostring(node, encoding="unicode") for node in tree.findall("p:timing", NS)],
        })
    write_json("fact-index.json", {"source": str(SOURCE.relative_to(ROOT)), "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "canvas": dict(ordered.find("p:sldSz", NS).attrib), "slides": slides})
    write_json("asset-index.json", assets)

    # Keep source filenames mapped to stable local media paths.
    media_out = ROOT / "ai-engineering-course/media/intro/presentation"
    media_out.mkdir(parents=True, exist_ok=True)
    for original, output in [
        ("image7.png", "mango.png"),
        ("image94.jpg", "neuron-model.jpg"),
        ("image91.png", "development-directions.png"),
        ("image100.jpg", "linear-classifier.jpg"),
        ("image104.jpg", "linear-boundary.jpg"),
        ("image125.png", "commute-regression.png"),
        ("image341.png", "breast-ultrasound.png"),
        ("image338.png", "breast-mask.png"),
        ("image354.GIF", "annotation.gif"),
    ]:
        (media_out / output).write_bytes(archive.read("ppt/media/" + original))
    subprocess.run(["sips", "-c", "284", "289", "--cropOffset", "212", "0", str(media_out / "linear-classifier.jpg"), "--out", str(media_out / "linear-input.jpg")], check=True, capture_output=True)
print(f"Extracted {len(slides)} ordered slides and {len(assets)} asset relationships.")

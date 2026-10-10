"""Extract ordered source objects and media without discarding composite diagrams."""
import hashlib
import json
import posixpath
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "AI工程学/PPT材料/Self-supervised Learning.pptx"
BUILD = ROOT / "AI工程学/.course-build/05-self-supervised"
NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def texts(node):
    return [item.text or "" for item in node.iter() if item.tag.split("}")[-1] == "t"]


def resolve(part, target):
    return posixpath.normpath(target.lstrip("/") if target.startswith("/") else posixpath.join(posixpath.dirname(part), target))


BUILD.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(SOURCE) as archive:
    def relationships(part):
        name = posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")
        return [dict(item.attrib) for item in ET.fromstring(archive.read(name))] if name in archive.namelist() else []

    presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
    order = {item["Id"]: item["Target"] for item in relationships("ppt/presentation.xml")}
    slides, assets = [], {}
    for page, entry in enumerate(presentation.findall("p:sldIdLst/p:sldId", NS), 1):
        part = resolve("ppt/presentation.xml", order[entry.get("{" + NS["r"] + "}id")])
        tree = ET.fromstring(archive.read(part))
        rels, notes, page_assets = relationships(part), [], []
        for relation in rels:
            if relation.get("TargetMode") == "External":
                continue
            target = resolve(part, relation["Target"])
            if relation["Type"].endswith("/notesSlide"):
                notes = texts(ET.fromstring(archive.read(target)))
            if target.startswith("ppt/media/"):
                data = archive.read(target)
                item = {"part": target, "relationshipId": relation["Id"], "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                page_assets.append(item)
                assets.setdefault(target, {**item, "sourcePages": []})["sourcePages"].append(page)
        objects = []
        for obj in tree.find("p:cSld/p:spTree", NS):
            kind = obj.tag.split("}")[-1]
            if kind not in {"sp", "pic", "cxnSp", "graphicFrame", "grpSp", "AlternateContent"}:
                continue
            objects.append({
                "type": kind, "text": texts(obj),
                "imageRelationships": [node.get("{" + NS["r"] + "}embed") for node in obj.findall(".//a:blip", NS)],
                "mediaRelationships": [node.get("{" + NS["r"] + "}embed") or node.get("{" + NS["r"] + "}link") for node in obj.iter() if node.tag.split("}")[-1] in {"media", "videoFile"}],
                "transforms": [{"type": node.tag.split("}")[-1], **node.attrib} for node in obj.iter() if node.tag.split("}")[-1] in {"off", "ext", "xfrm", "srcRect", "rot"}],
                "geometry": [{"type": node.tag.split("}")[-1], **node.attrib} for node in obj.iter() if node.tag.split("}")[-1] in {"prstGeom", "headEnd", "tailEnd", "srgbClr", "schemeClr", "stCxn", "endCxn"}],
                "formulas": [ET.tostring(node, encoding="unicode") for node in obj.iter() if node.tag.split("}")[-1] == "oMath"],
            })
        slides.append({"sourcePage": page, "part": part, "hidden": tree.get("show") == "0", "exactText": texts(tree), "notes": notes, "objects": objects, "assets": page_assets, "relationships": rels, "hasAnimation": tree.find("p:timing", NS) is not None})
    result = {"source": str(SOURCE.relative_to(ROOT)), "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "canvas": presentation.find("p:sldSz", NS).attrib, "slides": slides}
    (BUILD / "source-review.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (BUILD / "assets.json").write_text(json.dumps(list(assets.values()), ensure_ascii=False, indent=2) + "\n")
print(f"Extracted {len(slides)} ordered pages and {len(assets)} media assets; hidden pages, notes, math and composite transforms retained.")

"""Read the ordered PPTX objects for the RNN teaching-logic review."""
import hashlib
import json
import posixpath
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "AI工程学/PPT材料/RNNs and LSTMs.pptx"
OUT = ROOT / "AI工程学/.course-build/03-rnns-lstms/source-review.json"
NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def texts(node):
    return [item.text or "" for item in node.iter() if item.tag.split("}")[-1] == "t"]


with zipfile.ZipFile(SOURCE) as archive:
    def relationships(part):
        name = posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")
        if name not in archive.namelist():
            return []
        return [dict(item.attrib) for item in ET.fromstring(archive.read(name))]

    presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
    order = {item["Id"]: item["Target"] for item in relationships("ppt/presentation.xml")}
    slides = []
    for page, entry in enumerate(presentation.findall("p:sldIdLst/p:sldId", NS), 1):
        part = posixpath.normpath(posixpath.join("ppt", order[entry.get("{" + NS["r"] + "}id")]))
        tree = ET.fromstring(archive.read(part))
        rels = relationships(part)
        notes = []
        assets = []
        for relation in rels:
            if relation.get("TargetMode") == "External":
                continue
            target = posixpath.normpath(posixpath.join(posixpath.dirname(part), relation["Target"]))
            if relation["Type"].endswith("/notesSlide"):
                notes = texts(ET.fromstring(archive.read(target)))
            if target.startswith("ppt/media/"):
                data = archive.read(target)
                assets.append({"part": target, "relationshipId": relation["Id"], "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        objects = []
        for obj in tree.find("p:cSld/p:spTree", NS):
            kind = obj.tag.split("}")[-1]
            if kind not in {"sp", "pic", "cxnSp", "graphicFrame", "grpSp"}:
                continue
            objects.append({
                "type": kind,
                "text": texts(obj),
                "imageRelationships": [node.get("{" + NS["r"] + "}embed") for node in obj.findall(".//a:blip", NS)],
                "transforms": [{"type": node.tag.split("}")[-1], **node.attrib} for node in obj.iter() if node.tag.split("}")[-1] in {"off", "ext", "xfrm", "srcRect"}],
            })
        slides.append({"sourcePage": page, "part": part, "hidden": tree.get("show") == "0", "exactText": texts(tree), "notes": notes, "objects": objects, "assets": assets, "relationships": rels, "hasAnimation": tree.find("p:timing", NS) is not None})
    result = {"source": str(SOURCE.relative_to(ROOT)), "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "canvas": presentation.find("p:sldSz", NS).attrib, "slides": slides}
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"Read {len(slides)} ordered slides, notes, object positions, media relationships and animation flags.")

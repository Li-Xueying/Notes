import Foundation
import Vision

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let build = root.deletingLastPathComponent().appendingPathComponent("AI工程学/.course-build/06-generative/part2")
let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: build.appendingPathComponent("asset-manifest.json"))) as! [String: Any]
var evidence: [[String: Any]] = []
for asset in manifest["assets"] as! [[String: Any]] {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US"]
    request.usesLanguageCorrection = false
    try VNImageRequestHandler(url: root.appendingPathComponent(asset["output"] as! String)).perform([request])
    let lines: [[String: Any]] = (request.results ?? []).compactMap { result in
        guard let text = result.topCandidates(1).first else { return nil }
        let box = result.boundingBox
        return ["text": text.string, "confidence": text.confidence, "boundsBottomLeftNormalized": [box.minX, box.minY, box.width, box.height]]
    }
    evidence.append(["id": asset["id"]!, "sourcePage": asset["sourcePage"]!, "sha256": asset["sha256"]!, "lines": lines])
}
let value: [String: Any] = ["sourceSha256": manifest["sourceSha256"]!, "method": "Apple Vision accurate English OCR, auxiliary only; equations and evidence require visual verification", "evidence": evidence]
var bytes = try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
bytes.append(10)
try bytes.write(to: build.appendingPathComponent("embedded-evidence-ocr.json"))
print("Indexed \(evidence.count) embedded evidence images without altering raw PDF text.")

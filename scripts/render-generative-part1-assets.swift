import AppKit
import CryptoKit
import Foundation
import PDFKit

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let part = CommandLine.arguments.dropFirst().first ?? "part1"
precondition(["part1", "part2"].contains(part), "Expected part1 or part2")
let build = root.deletingLastPathComponent().appendingPathComponent("AI工程学/.course-build/06-generative/" + part)
let filename = part == "part1" ? "Part I-Generative.pdf" : "Part II-Generative.pdf"
let bytes = try Data(contentsOf: root.appendingPathComponent("pdf/" + filename))
let pdf = PDFDocument(data: bytes)!
let spec = try JSONSerialization.jsonObject(with: Data(contentsOf: build.appendingPathComponent("source-crops.json"))) as! [String: Any]
let sourceHash = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
precondition(spec["sourceSha256"] as! String == sourceHash, "Crop specification must match the source PDF")
var assets: [[String: Any]] = []
for crop in spec["crops"] as! [[String: Any]] {
    let page = pdf.page(at: (crop["sourcePage"] as! Int) - 1)!
    let box = page.bounds(for: .mediaBox)
    let normalized = crop["boundsTopLeftNormalized"] as! [Double]
    let region = CGRect(x: normalized[0] * box.width, y: (1 - normalized[1] - normalized[3]) * box.height, width: normalized[2] * box.width, height: normalized[3] * box.height)
    let scale: CGFloat = 4
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(ceil(region.width * scale)), pixelsHigh: Int(ceil(region.height * scale)), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let context = NSGraphicsContext.current!.cgContext
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: bitmap.pixelsWide, height: bitmap.pixelsHigh))
    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: -region.minX, y: -region.minY)
    page.draw(with: .mediaBox, to: context)
    NSGraphicsContext.restoreGraphicsState()
    let png = bitmap.representation(using: .png, properties: [:])!
    let output = root.appendingPathComponent(crop["output"] as! String)
    try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    try png.write(to: output)
    var entry = crop
    entry["width"] = bitmap.pixelsWide
    entry["height"] = bitmap.pixelsHigh
    entry["sha256"] = SHA256.hash(data: png).map { String(format: "%02x", $0) }.joined()
    entry["sourceRectBottomLeft"] = [region.minX, region.minY, region.width, region.height]
    assets.append(entry)
}
var manifest = try JSONSerialization.data(withJSONObject: ["sourceSha256": sourceHash, "assets": assets], options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
manifest.append(10)
try manifest.write(to: build.appendingPathComponent("asset-manifest.json"))
print("Rendered \(assets.count) bounded PDF evidence images with original labels and pairings.")

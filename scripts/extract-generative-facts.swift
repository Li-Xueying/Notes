import AppKit
import CryptoKit
import Foundation
import PDFKit

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let workspace = root.deletingLastPathComponent()
let part = CommandLine.arguments.dropFirst().first ?? "part1"
precondition(["part1", "part2"].contains(part), "Expected part1 or part2")
let filename = part == "part1" ? "Part I-Generative.pdf" : "Part II-Generative.pdf"
let build = workspace.appendingPathComponent("AI工程学/.course-build/06-generative/" + part)
let manager = FileManager.default
try manager.createDirectory(at: build, withIntermediateDirectories: true)

func rect(_ box: CGRect) -> [String: Double] {
    ["x": box.origin.x, "y": box.origin.y, "width": box.width, "height": box.height]
}

func saveJSON(_ value: Any, to url: URL) throws {
    var data = try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
    data.append(10)
    try data.write(to: url)
}

func document(_ name: String) throws -> (PDFDocument, String) {
    let url = root.appendingPathComponent("pdf/" + name)
    let bytes = try Data(contentsOf: url)
    guard let pdf = PDFDocument(data: bytes) else { fatalError("Invalid PDF: " + name) }
    return (pdf, SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined())
}

let (pdf, hash) = try document(filename)
var pages: [[String: Any]] = []
for index in 0..<pdf.pageCount {
    let page = pdf.page(at: index)!
    let text = page.string ?? ""
    let native = text as NSString
    var lines: [[String: Any]] = []
    var cursor = 0
    while cursor < native.length {
        let range = native.lineRange(for: NSRange(location: cursor, length: 0))
        let content = native.substring(with: range).trimmingCharacters(in: .whitespacesAndNewlines)
        if !content.isEmpty, let selection = page.selection(for: range) {
            lines.append(["text": content, "bounds": rect(selection.bounds(for: page))])
        }
        cursor = NSMaxRange(range)
    }
    let annotations: [[String: Any]] = page.annotations.map { annotation in
        var value: [String: Any] = ["type": annotation.type ?? "unknown", "bounds": rect(annotation.bounds), "contents": annotation.contents ?? ""]
        if let action = annotation.action as? PDFActionURL { value["url"] = action.url?.absoluteString ?? "" }
        return value
    }
    pages.append(["sourcePage": index + 1, "label": page.label ?? "", "bounds": rect(page.bounds(for: .mediaBox)), "exactText": text, "textLines": lines, "annotations": annotations])
}
try saveJSON([
    "source": "ai-engineering-course/pdf/" + filename,
    "sha256": hash,
    "pageCount": pdf.pageCount,
    "sourceFormat": "PDF; no PPTX available. Text and line geometry extracted with PDFKit; original page graphics require visual review and bounded rendering.",
    "pages": pages,
], to: build.appendingPathComponent("source-review.json"))
let text = pages.map { "=== SOURCE PAGE \($0["sourcePage"]!) ===\n\($0["exactText"]!)\n" }.joined(separator: "\n")
try text.write(to: build.appendingPathComponent("source-text.txt"), atomically: true, encoding: .utf8)

if part == "part1" {
let (part2, hash2) = try document("Part II-Generative.pdf")
let boundaryIndices = Array(Set(Array(0..<min(4, part2.pageCount)) + Array(max(0, part2.pageCount - 2)..<part2.pageCount))).sorted()
try saveJSON([
    "source": "ai-engineering-course/pdf/Part II-Generative.pdf", "sha256": hash2,
    "pageCount": part2.pageCount, "scope": "Boundary review only; run this extractor with part2 to produce the full Part II index.",
    "pages": boundaryIndices.map { ["sourcePage": $0 + 1, "exactText": part2.page(at: $0)?.string ?? ""] },
], to: build.deletingLastPathComponent().appendingPathComponent("part2-boundary-review.json"))
}

let contact = build.appendingPathComponent("source-contact")
try manager.createDirectory(at: contact, withIntermediateDirectories: true)
for start in stride(from: 0, to: pdf.pageCount, by: 12) {
    let canvas = NSImage(size: NSSize(width: 1440, height: 1060))
    canvas.lockFocus()
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: 1440, height: 1060).fill()
    for offset in 0..<min(12, pdf.pageCount - start) {
        let page = pdf.page(at: start + offset)!
        let x = CGFloat(offset % 3) * 480
        let y = 1060 - CGFloat(offset / 3 + 1) * 265
        let label = "\(start + offset + 1)"
        label.draw(at: NSPoint(x: x + 10, y: y + 242), withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 16, weight: .medium), .foregroundColor: NSColor.black])
        page.thumbnail(of: NSSize(width: 460, height: 230), for: .mediaBox).draw(in: NSRect(x: x + 10, y: y + 5, width: 460, height: 230))
    }
    canvas.unlockFocus()
    let bitmap = NSBitmapImageRep(data: canvas.tiffRepresentation!)!
    try bitmap.representation(using: .png, properties: [:])!.write(to: contact.appendingPathComponent("sheet-\(start + 1).png"))
}
print("Extracted \(filename): \(pdf.pageCount) pages. Source index and contact sheets: \(build.path)")

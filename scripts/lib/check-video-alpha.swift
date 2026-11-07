import AVFoundation
import CoreVideo
import Foundation

let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
guard let track = try await asset.loadTracks(withMediaType: .video).first else {
  throw NSError(domain: "AlphaValidation", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track"])
}
let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData = false
reader.add(output)
guard reader.startReading() else { throw reader.error! }
var minimum = 255, maximum = 0, frames = 0
while let sample = output.copyNextSampleBuffer(), let buffer = CMSampleBufferGetImageBuffer(sample) {
  CVPixelBufferLockBaseAddress(buffer, .readOnly)
  let width = CVPixelBufferGetWidth(buffer), height = CVPixelBufferGetHeight(buffer)
  let stride = CVPixelBufferGetBytesPerRow(buffer)
  let bytes = CVPixelBufferGetBaseAddress(buffer)!.assumingMemoryBound(to: UInt8.self)
  for y in Swift.stride(from: 0, to: height, by: max(1, height / 16)) {
    for x in Swift.stride(from: 0, to: width, by: max(1, width / 16)) {
      let alpha = Int(bytes[y * stride + x * 4 + 3])
      minimum = min(minimum, alpha); maximum = max(maximum, alpha)
    }
  }
  CVPixelBufferUnlockBaseAddress(buffer, .readOnly)
  frames += 1
}
if reader.status == .failed { throw reader.error! }
print("{\"frames\":\(frames),\"alphaMin\":\(minimum),\"alphaMax\":\(maximum)}")

//
//  BlobMetalView.swift
//  makima-mobile
//
//  UIViewRepresentable wrapping MTKView to render the Perlin-noise
//  displaced icosahedron blob using Metal.
//

import SwiftUI
import MetalKit
import simd

// MARK: - Uniforms (must match BlobShaders.metal)

struct BlobUniforms {
    var mvp: simd_float4x4       // offset 0,  size 64
    var time: Float              // offset 64, size 4
    var intensity: Float         // offset 68, size 4
    var _pad0: Float = 0         // offset 72, size 4
    var baseColor: simd_float3   // offset 76, size 12
    var _pad1: Float = 0         // offset 88, size 4
}

// MARK: - SwiftUI Wrapper

struct BlobMetalView: UIViewRepresentable {
    var isTouching: Bool = false

    func makeUIView(context: Context) -> MTKView {
        guard let device = MTLCreateSystemDefaultDevice() else {
            return MTKView()
        }

        let view = MTKView(frame: .zero, device: device)
        view.delegate = context.coordinator
        view.preferredFramesPerSecond = 60
        view.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.enableSetNeedsDisplay = false
        view.isPaused = false
        view.colorPixelFormat = .bgra8Unorm

        context.coordinator.setup(device: device, view: view)

        return view
    }

    func updateUIView(_ uiView: MTKView, context: Context) {
        context.coordinator.isTouching = isTouching
    }

    func makeCoordinator() -> BlobRenderer {
        BlobRenderer()
    }
}

// MARK: - Renderer

final class BlobRenderer: NSObject, MTKViewDelegate {
    var isTouching = false

    private var device: MTLDevice?
    private var commandQueue: MTLCommandQueue?
    private var pipelineState: MTLRenderPipelineState?

    private var vertexBuffer: MTLBuffer?
    private var indexBuffer: MTLBuffer?
    private var uniformBuffer: MTLBuffer?
    private var indexCount: Int = 0

    private var startTime: CFAbsoluteTime = CFAbsoluteTimeGetCurrent()
    private var currentIntensity: Float = 0.5

    func setup(device: MTLDevice, view: MTKView) {
        self.device = device
        commandQueue = device.makeCommandQueue()

        buildPipeline(device: device, view: view)
        buildGeometry(device: device)

        uniformBuffer = device.makeBuffer(length: MemoryLayout<BlobUniforms>.stride, options: .storageModeShared)
    }

    // MARK: - Pipeline

    private func buildPipeline(device: MTLDevice, view: MTKView) {
        guard let library = device.makeDefaultLibrary(),
              let vertexFunc = library.makeFunction(name: "blob_vertex"),
              let fragmentFunc = library.makeFunction(name: "blob_fragment") else {
            return
        }

        let vertexDescriptor = MTLVertexDescriptor()

        // position: float3
        vertexDescriptor.attributes[0].format = .float3
        vertexDescriptor.attributes[0].offset = 0
        vertexDescriptor.attributes[0].bufferIndex = 0

        // normal: float3
        vertexDescriptor.attributes[1].format = .float3
        vertexDescriptor.attributes[1].offset = MemoryLayout<Float>.stride * 3
        vertexDescriptor.attributes[1].bufferIndex = 0

        // uv: float2
        vertexDescriptor.attributes[2].format = .float2
        vertexDescriptor.attributes[2].offset = MemoryLayout<Float>.stride * 6
        vertexDescriptor.attributes[2].bufferIndex = 0

        // stride: 3 + 3 + 2 = 8 floats
        vertexDescriptor.layouts[0].stride = MemoryLayout<Float>.stride * 8

        let descriptor = MTLRenderPipelineDescriptor()
        descriptor.vertexFunction = vertexFunc
        descriptor.fragmentFunction = fragmentFunc
        descriptor.vertexDescriptor = vertexDescriptor
        descriptor.colorAttachments[0].pixelFormat = view.colorPixelFormat
        descriptor.colorAttachments[0].isBlendingEnabled = true
        descriptor.colorAttachments[0].sourceRGBBlendFactor = .sourceAlpha
        descriptor.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha

        pipelineState = try? device.makeRenderPipelineState(descriptor: descriptor)
    }

    // MARK: - Icosahedron Geometry

    private func buildGeometry(device: MTLDevice) {
        let t: Float = (1.0 + sqrtf(5.0)) / 2.0

        // 12 base vertices of an icosahedron
        var baseVertices: [simd_float3] = [
            simd_float3(-1,  t,  0), simd_float3( 1,  t,  0),
            simd_float3(-1, -t,  0), simd_float3( 1, -t,  0),
            simd_float3( 0, -1,  t), simd_float3( 0,  1,  t),
            simd_float3( 0, -1, -t), simd_float3( 0,  1, -t),
            simd_float3( t,  0, -1), simd_float3( t,  0,  1),
            simd_float3(-t,  0, -1), simd_float3(-t,  0,  1),
        ]

        // Normalize to unit sphere
        for i in 0..<baseVertices.count {
            baseVertices[i] = normalize(baseVertices[i])
        }

        // 20 faces
        var faces: [(Int, Int, Int)] = [
            (0, 11,  5), (0,  5,  1), (0,  1,  7), (0,  7, 10), (0, 10, 11),
            (1,  5,  9), (5, 11,  4), (11, 10,  2), (10,  7,  6), (7,  1,  8),
            (3,  9,  4), (3,  4,  2), (3,  2,  6), (3,  6,  8), (3,  8,  9),
            (4,  9,  5), (2,  4, 11), (6,  2, 10), (8,  6,  7), (9,  8,  1),
        ]

        // Subdivide 4 times for ~5120 triangles
        var vertices = baseVertices
        for _ in 0..<4 {
            var newFaces: [(Int, Int, Int)] = []
            var midpointCache: [UInt64: Int] = [:]

            func midpoint(_ a: Int, _ b: Int) -> Int {
                let key: UInt64 = min(UInt64(a), UInt64(b)) << 32 | max(UInt64(a), UInt64(b))
                if let cached = midpointCache[key] { return cached }
                let mid = normalize((vertices[a] + vertices[b]) * 0.5)
                let idx = vertices.count
                vertices.append(mid)
                midpointCache[key] = idx
                return idx
            }

            for face in faces {
                let a = midpoint(face.0, face.1)
                let b = midpoint(face.1, face.2)
                let c = midpoint(face.2, face.0)
                newFaces.append((face.0, a, c))
                newFaces.append((face.1, b, a))
                newFaces.append((face.2, c, b))
                newFaces.append((a, b, c))
            }
            faces = newFaces
        }

        // Scale to radius 2
        let radius: Float = 2.0
        for i in 0..<vertices.count {
            vertices[i] = vertices[i] * radius
        }

        // Build interleaved vertex data: [pos.x, pos.y, pos.z, norm.x, norm.y, norm.z, u, v]
        var vertexData: [Float] = []
        vertexData.reserveCapacity(vertices.count * 8)
        for v in vertices {
            let n = normalize(v)
            // Spherical UV
            let u = 0.5 + atan2(n.z, n.x) / (2.0 * .pi)
            let vCoord = 0.5 - asin(n.y) / .pi
            vertexData.append(contentsOf: [v.x, v.y, v.z, n.x, n.y, n.z, u, vCoord])
        }

        var indices: [UInt32] = []
        indices.reserveCapacity(faces.count * 3)
        for face in faces {
            indices.append(contentsOf: [UInt32(face.0), UInt32(face.1), UInt32(face.2)])
        }

        indexCount = indices.count
        vertexBuffer = device.makeBuffer(bytes: vertexData, length: vertexData.count * MemoryLayout<Float>.stride, options: .storageModeShared)
        indexBuffer = device.makeBuffer(bytes: indices, length: indices.count * MemoryLayout<UInt32>.stride, options: .storageModeShared)
    }

    // MARK: - MTKViewDelegate

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

    func draw(in view: MTKView) {
        guard let pipelineState,
              let commandQueue,
              let descriptor = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let vertexBuffer,
              let indexBuffer,
              let uniformBuffer else { return }

        let elapsed = Float(CFAbsoluteTimeGetCurrent() - startTime)
        let time = elapsed * 0.4  // 0.4x real time, matching desktop

        // Lerp intensity
        let targetIntensity: Float = isTouching ? 0.7 : 0.5
        currentIntensity += (targetIntensity - currentIntensity) * 0.02

        // Camera and projection
        let aspect = Float(view.drawableSize.width / view.drawableSize.height)
        let projection = perspectiveMatrix(fovY: Float.pi / 4.0, aspect: aspect, near: 0.1, far: 100.0)
        let viewMatrix = lookAtMatrix(eye: simd_float3(0, 0, 8), center: simd_float3(0, 0, 0), up: simd_float3(0, 1, 0))
        let scale: Float = 1.5
        let modelMatrix = simd_float4x4(diagonal: simd_float4(scale, scale, scale, 1.0))
        let mvp = projection * viewMatrix * modelMatrix

        var uniforms = BlobUniforms(
            mvp: mvp,
            time: time,
            intensity: currentIntensity,
            baseColor: simd_float3(0.043, 0.043, 0.043)
        )
        memcpy(uniformBuffer.contents(), &uniforms, MemoryLayout<BlobUniforms>.stride)

        let commandBuffer = commandQueue.makeCommandBuffer()!
        let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: descriptor)!

        encoder.setRenderPipelineState(pipelineState)
        encoder.setVertexBuffer(vertexBuffer, offset: 0, index: 0)
        encoder.setVertexBuffer(uniformBuffer, offset: 0, index: 1)
        encoder.setFragmentBuffer(uniformBuffer, offset: 0, index: 1)

        encoder.drawIndexedPrimitives(
            type: .triangle,
            indexCount: indexCount,
            indexType: .uint32,
            indexBuffer: indexBuffer,
            indexBufferOffset: 0
        )

        encoder.endEncoding()
        commandBuffer.present(drawable)
        commandBuffer.commit()
    }
}

// MARK: - Matrix Helpers

private func perspectiveMatrix(fovY: Float, aspect: Float, near: Float, far: Float) -> simd_float4x4 {
    let yScale = 1.0 / tanf(fovY * 0.5)
    let xScale = yScale / aspect
    let zRange = far - near

    return simd_float4x4(columns: (
        simd_float4(xScale, 0, 0, 0),
        simd_float4(0, yScale, 0, 0),
        simd_float4(0, 0, -(far + near) / zRange, -1),
        simd_float4(0, 0, -2.0 * far * near / zRange, 0)
    ))
}

private func lookAtMatrix(eye: simd_float3, center: simd_float3, up: simd_float3) -> simd_float4x4 {
    let z = normalize(eye - center)
    let x = normalize(cross(up, z))
    let y = cross(z, x)

    return simd_float4x4(columns: (
        simd_float4(x.x, y.x, z.x, 0),
        simd_float4(x.y, y.y, z.y, 0),
        simd_float4(x.z, y.z, z.z, 0),
        simd_float4(-dot(x, eye), -dot(y, eye), -dot(z, eye), 1)
    ))
}

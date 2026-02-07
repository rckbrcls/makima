//
//  BlobShaders.metal
//  makima-mobile
//
//  Metal port of the desktop Perlin noise blob shader (blob-3d.tsx).
//  Vertex displacement via classic Perlin 3D noise on an icosahedron.
//

#include <metal_stdlib>
using namespace metal;

// MARK: - Shared Structs

struct Uniforms {
    float4x4 mvp;     // offset 0,  size 64
    float time;        // offset 64, size 4
    float intensity;   // offset 68, size 4
    float _pad0;       // offset 72, size 4  (alignment padding)
    packed_float3 baseColor; // offset 76, size 12
    float _pad1;       // offset 88, size 4  (trailing alignment)
};

struct VertexIn {
    float3 position [[attribute(0)]];
    float3 normal   [[attribute(1)]];
    float2 uv       [[attribute(2)]];
};

struct VertexOut {
    float4 position [[position]];
    float2 uv;
    float displacement;
};

// MARK: - Classic Perlin 3D Noise

static float4 permute(float4 x) {
    return fmod(((x * 34.0) + 1.0) * x, 289.0);
}

static float4 taylorInvSqrt(float4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

static float3 fade(float3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

static float cnoise(float3 P) {
    float3 Pi0 = floor(P);
    float3 Pi1 = Pi0 + float3(1.0);
    Pi0 = fmod(Pi0, 289.0);
    Pi1 = fmod(Pi1, 289.0);
    float3 Pf0 = fract(P);
    float3 Pf1 = Pf0 - float3(1.0);

    float4 ix = float4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    float4 iy = float4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
    float4 iz0 = float4(Pi0.z);
    float4 iz1 = float4(Pi1.z);

    float4 ixy  = permute(permute(ix) + iy);
    float4 ixy0 = permute(ixy + iz0);
    float4 ixy1 = permute(ixy + iz1);

    float4 gx0 = ixy0 / 7.0;
    float4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    float4 gz0 = float4(0.5) - abs(gx0) - abs(gy0);
    float4 sz0 = step(gz0, float4(0.0));
    gx0 -= sz0 * (step(float4(0.0), gx0) - 0.5);
    gy0 -= sz0 * (step(float4(0.0), gy0) - 0.5);

    float4 gx1 = ixy1 / 7.0;
    float4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    float4 gz1 = float4(0.5) - abs(gx1) - abs(gy1);
    float4 sz1 = step(gz1, float4(0.0));
    gx1 -= sz1 * (step(float4(0.0), gx1) - 0.5);
    gy1 -= sz1 * (step(float4(0.0), gy1) - 0.5);

    float3 g000 = float3(gx0.x, gy0.x, gz0.x);
    float3 g100 = float3(gx0.y, gy0.y, gz0.y);
    float3 g010 = float3(gx0.z, gy0.z, gz0.z);
    float3 g110 = float3(gx0.w, gy0.w, gz0.w);
    float3 g001 = float3(gx1.x, gy1.x, gz1.x);
    float3 g101 = float3(gx1.y, gy1.y, gz1.y);
    float3 g011 = float3(gx1.z, gy1.z, gz1.z);
    float3 g111 = float3(gx1.w, gy1.w, gz1.w);

    float4 norm0 = taylorInvSqrt(float4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    float4 norm1 = taylorInvSqrt(float4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, float3(Pf1.x, Pf0.y, Pf0.z));
    float n010 = dot(g010, float3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, float3(Pf1.x, Pf1.y, Pf0.z));
    float n001 = dot(g001, float3(Pf0.x, Pf0.y, Pf1.z));
    float n101 = dot(g101, float3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, float3(Pf0.x, Pf1.y, Pf1.z));
    float n111 = dot(g111, Pf1);

    float3 fade_xyz = fade(Pf0);
    float4 n_z  = mix(float4(n000, n100, n010, n110), float4(n001, n101, n011, n111), fade_xyz.z);
    float2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}

// MARK: - Vertex Shader

vertex VertexOut blob_vertex(
    VertexIn in [[stage_in]],
    constant Uniforms &uniforms [[buffer(1)]]
) {
    float disp = cnoise(in.position + float3(2.0 * uniforms.time));

    float3 newPosition = in.position + in.normal * (uniforms.intensity * disp);

    VertexOut out;
    out.position = uniforms.mvp * float4(newPosition, 1.0);
    out.uv = in.uv;
    out.displacement = disp;
    return out;
}

// MARK: - Fragment Shader

fragment float4 blob_fragment(
    VertexOut in [[stage_in]],
    constant Uniforms &uniforms [[buffer(1)]]
) {
    float distort = 2.0 * in.displacement * uniforms.intensity * sin(in.uv.y * 10.0 + uniforms.time);
    float3 color = mix(uniforms.baseColor, float3(1.0, 1.0, 1.0), distort);
    return float4(color, 1.0);
}

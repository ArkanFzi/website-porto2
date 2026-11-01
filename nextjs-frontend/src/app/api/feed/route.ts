import { NextResponse } from "next/server";

export async function GET() {
  const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>M. Arkan Fauzi — Systems Architecture &amp; Spatial Changelog</title>
  <subtitle>High-throughput Go microservices, distributed systems telemetry, and WebGL shader craft.</subtitle>
  <link href="https://arkanfauzi.dev/api/feed" rel="self"/>
  <link href="https://arkanfauzi.dev/"/>
  <updated>${new Date().toISOString()}</updated>
  <id>https://arkanfauzi.dev/</id>
  <author>
    <name>M. Arkan Fauzi</name>
    <email>contact@arkanfauzi.dev</email>
  </author>
  
  <entry>
    <title>Chiaroscuro Monolith: GPU Procedural Shader &amp; Audio Telemetry Engine</title>
    <link href="https://arkanfauzi.dev/#chapter-01"/>
    <id>https://arkanfauzi.dev/releases/2026-11-01</id>
    <updated>2026-11-01T10:00:00Z</updated>
    <summary>Single-canvas WebGL shader runtime featuring Leica M11 luminance contrast, GPU wireframe inspector, and Web Audio API synthesizer.</summary>
  </entry>

  <entry>
    <title>Enterprise Multi-Tenant HRIS Microservices Architecture</title>
    <link href="https://sekawanmedia.co.id"/>
    <id>https://sekawanmedia.co.id/case-study/hris</id>
    <updated>2026-10-20T00:00:00Z</updated>
    <summary>Distributed Go backend serving 12.8K RPS with p99 latency &lt; 15ms backed by PostgreSQL connection pooling and Redis distributed locks.</summary>
  </entry>
</feed>`;

  return new NextResponse(feed, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

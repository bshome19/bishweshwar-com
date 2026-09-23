---
id: apis-rest-graphql-grpc-websockets
title: "API Protocols Compared: REST vs GraphQL vs gRPC vs WebSockets"
track: apis
module: protocols
level: beginner
duration: 30
prerequisites: [networking-transport-protocols-tcp-udp]
concepts: [rest, graphql, grpc, websockets, protobuf, sse, api-design]
tags: [apis, architecture, rest, grpc, graphql, websockets]
order: 1
---

# API Protocols Compared: REST vs GraphQL vs gRPC vs WebSockets

Choosing an API protocol is one of the earliest and most consequential decisions in system design. No single communication protocol is universally superior; each solves a specific set of client-server interaction patterns while incurring unique trade-offs.

---

## 1. REST (Representational State Transfer)

REST is an architectural style built directly upon HTTP semantics (URIs, verbs like `GET`, `POST`, `PUT`, `DELETE`, and status codes).

### Strengths
- **Ubiquitous Standards**: Understood by every browser, API gateway, mobile client, and programming language.
- **Edge Caching**: Leverages standard HTTP cache-control headers (`ETag`, `Cache-Control: public, max-age=3600`) at CDNs (Cloudflare, Fastly) without executing server compute.
- **Statelessness**: Every request contains all necessary authorization and query metadata, simplifying horizontal scaling behind simple round-robin load balancers.

### Weaknesses
- **Over-Fetching**: Calling `/users/123` returns all 40 database columns when the client only needed the `username`.
- **Under-Fetching (N+1 Waterfall Requests)**: To render a dashboard, a client must make sequential network round-trips: `GET /users/123`, then `GET /users/123/posts`, then `GET /posts/456/comments`.
- **Inefficient Serialization**: Text-based JSON serialization and deserialization consumes significant CPU overhead at high QPS.

---

## 2. GraphQL

Developed by Facebook to eliminate under-fetching and over-fetching on high-latency mobile networks, GraphQL exposes a single HTTP endpoint where clients send a declarative query specifying the exact response schema.

### Strengths
- **Client-Specified Payloads**: The mobile app requests only `{ user(id: 123) { name, avatarUrl } }`, drastically minimizing wireless payload size.
- **Single Request Aggregation**: Multiple backend microservices can be resolved concurrently in a single client round-trip.
- **Strongly Typed Schema**: Automatic documentation, code generation, and compile-time client validation.

### Weaknesses
- **CDN Caching Complexity**: Because GraphQL queries are typically sent as `POST` requests to a single `/graphql` URL, traditional HTTP reverse proxy caching does not work out of the box.
- **Server-Side Complexity & DoS Risks**: A malicious or poorly constructed nested query (e.g., `user -> posts -> author -> posts -> author...`) can execute exponential database queries, exhausting server memory. Requires query complexity analysis, depth limits, and DataLoader batching.

---

## 3. gRPC (Google Remote Procedure Call)

Built on top of **HTTP/2** and **Protocol Buffers (Protobuf)**, gRPC is the dominant industry standard for high-performance service-to-service internal microservice communication.

```
Service A (Go) ──[ Binary Protobuf over HTTP/2 ]──► Service B (Java / Rust)
```

### Strengths
- **Binary Packing Efficiency**: Protobuf encodes structured messages into compact binary streams, often reducing network payload size by 60–80% compared to equivalent JSON payloads.
- **Blazing Fast Serialization**: Binary serialization uses direct memory copying without text parsing, yielding 5x–10x higher serialization throughput than JSON.
- **HTTP/2 Multiplexing**: Multiple parallel RPC requests and responses travel concurrently over a single long-lived TCP socket without Head-of-Line blocking.
- **Strict Schema Enforcement (`.proto`)**: Interface Definition Language (IDL) serves as the authoritative contract between engineering teams.

### Weaknesses
- **Browser Incompatibility**: Browsers cannot directly establish raw HTTP/2 framing without a translation proxy (e.g., Envoy `grpc-web`).
- **Debugging Friction**: Raw binary bytes cannot be read directly in standard curl terminal commands without specialized tools like `grpcurl`.

---

## 4. WebSockets vs Server-Sent Events (SSE)

When services require real-time push capabilities instead of client polling, architects evaluate persistent connection models:

### WebSockets (Full-Duplex TCP)
- **Bidirectional**: Both client and server can send arbitrary messages at any instant over a persistent TCP connection initiated via an HTTP Upgrade header.
- **Low Overhead**: Once established, message frames have only 2–10 bytes of header overhead (no repeated HTTP cookies or auth headers).
- **Use Cases**: Real-time collaborative documents (Google Docs, Figma), multiplayer gaming, chat applications, high-frequency trading platforms.
- **Trade-Off**: Stateful connections complicate horizontal scaling, requiring Redis Pub/Sub backplanes and sticky routing.

### Server-Sent Events (SSE: Unidirectional Push)
- **Server-to-Client Only**: Standard HTTP response stream that remains open indefinitely using `Content-Type: text/event-stream`.
- **Browser Native**: Built-in `EventSource` JavaScript API with automatic reconnection and event ID tracking.
- **Firewall Friendly**: Runs over standard HTTP/HTTPS ports without special proxy configurations.
- **Use Cases**: Live LLM token streaming (ChatGPT / Claude responses), stock ticker price displays, build pipeline status bars.

---

## Architecture Decision Matrix

| Dimension | REST | GraphQL | gRPC | WebSockets |
| :--- | :--- | :--- | :--- | :--- |
| **Transport** | HTTP/1.1 or HTTP/2 | HTTP/1.1 or HTTP/2 | HTTP/2 or HTTP/3 | TCP (Upgraded HTTP) |
| **Data Format** | JSON / XML | JSON | Binary Protobuf | Text or Binary |
| **Contract** | OpenAPI / Swagger | GraphQL Schema | `.proto` IDL | Custom App Protocol |
| **Client Control**| Fixed endpoints | Flexible query selection | Fixed RPC methods | Ad-hoc message frames |
| **Network Efficiency**| Moderate | Good | Maximum (Binary) | Maximum (Persistent) |
| **Primary Use** | Public APIs, CRUD | Complex Web/Mobile UIs | Internal Microservices | Real-Time Chat & Collaboration |

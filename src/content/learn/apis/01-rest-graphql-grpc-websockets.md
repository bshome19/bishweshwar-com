---
id: apis-rest-graphql-grpc-websockets
title: "How Services Talk: REST, GraphQL, gRPC, and WebSockets"
track: apis
module: communication-styles
level: beginner
duration: 22
prerequisites: [networking-dns-tls]
concepts: [rest, graphql, grpc, websockets, sse, protocol-buffers, request-response, streaming]
tags: [beginner, apis, rest, graphql, grpc, websockets, communication]
interactive:
  type: api-comparison
  enabled: true
order: 1
---

# How Services Talk: REST, GraphQL, gRPC, and WebSockets

Every time two pieces of software need to communicate over a network, someone has to decide *how*. What format is the data in? Who initiates the conversation? How do you handle errors? What happens when one side is slow?

These decisions are the API design problem. And while there are dozens of approaches, four dominate modern software: **REST**, **GraphQL**, **gRPC**, and **WebSockets**. Each was created to solve a specific pain point that the others handle poorly.

Understanding *when* to use each one — not just *what* each one is — is the skill that matters.

---

## REST: The Default You Should Understand Before Moving Past

REST (Representational State Transfer) is the most common API style on the web. If you've ever called an API, it was probably REST.

The idea is simple: treat every entity in your system as a **resource** with a URL, and use standard HTTP methods to interact with it.

```
GET    /users/42           → Read user 42
POST   /users              → Create a new user
PUT    /users/42           → Replace user 42's data entirely
PATCH  /users/42           → Update specific fields of user 42
DELETE /users/42           → Delete user 42
```

The elegance of REST is that it uses HTTP's existing infrastructure. Caches understand GET requests are safe to cache. Proxies can route based on URL paths. Load balancers don't need to understand the API — it's just HTTP.

**When REST works beautifully**: CRUD applications. Simple resource-oriented APIs. Public APIs where clients are diverse (mobile, web, third-party). APIs where cacheability is important.

**Where REST becomes painful**:

**The N+1 problem**: Your mobile app needs a user's profile, their 10 most recent posts, and the comments on each post. In REST, that's:
```
GET /users/42                          → 1 request
GET /users/42/posts?limit=10           → 1 request
GET /posts/101/comments                → 1 request per post
GET /posts/102/comments                → ...
...                                    → 10 more requests
```

12 HTTP round-trips. On a mobile network with 100ms latency per round-trip, that's 1.2 seconds *just in network latency*, before any processing happens.

You could add a custom endpoint (`GET /users/42/feed`) that returns everything in one call. But that's a bespoke endpoint that breaks the clean resource model. Multiply this across every screen in your app, and you have an explosion of custom aggregation endpoints.

**Over-fetching**: `GET /users/42` returns the full user object — 50 fields — even if you only need the name and avatar. On a mobile connection, those extra bytes matter.

**Under-fetching**: The user object includes `team_id: 7` but not the team name. You need another request to `GET /teams/7`. More round-trips.

These problems led directly to the creation of GraphQL.

---

## GraphQL: Let the Client Ask for Exactly What It Needs

Facebook created GraphQL in 2012 (open-sourced in 2015) specifically to solve the mobile N+1 and over-fetching problems.

The core idea: instead of fixed endpoints that return fixed shapes of data, you have a single endpoint where the client specifies exactly what data it wants, in what shape.

```graphql
query {
  user(id: 42) {
    name
    avatarUrl
    posts(limit: 10) {
      title
      createdAt
      comments {
        body
        author {
          name
        }
      }
    }
  }
}
```

One request. One response. The client gets exactly the fields it asked for — no over-fetching. Nested relationships are resolved in one round-trip — no N+1 problem.

**When GraphQL shines**: Mobile apps with limited bandwidth. Screens that aggregate data from multiple resources. Rapidly evolving UIs where different views need different subsets of the same data.

**Where GraphQL has costs**:

**Caching is harder**: REST responses are cacheable because each URL has a predictable shape. A GraphQL query is a POST body — CDNs don't know how to cache it without custom logic. You need application-level caching (Apollo Client, Relay).

**Complexity on the server**: The server needs a "resolver" for every field in the schema. Complex queries can trigger unexpectedly expensive database operations. Without safeguards, a malicious client can send deeply nested queries that exhaust server resources (the "query depth" attack).

**Rate limiting is hard**: In REST, you can rate-limit by endpoint. In GraphQL, every request hits the same endpoint — but one query might be trivial and another might touch 50 database tables. You need query-cost analysis to rate-limit fairly.

**Schema evolution**: Adding fields is easy. Removing or changing fields is hard — you need deprecation strategies because any client might be querying any field.

---

## gRPC: When Performance and Type Safety Matter

**gRPC** (Google Remote Procedure Call) is designed for service-to-service communication where performance, type safety, and code generation matter more than human readability.

The key differences from REST:

**Protocol Buffers** instead of JSON: Data is serialized as a compact binary format, not human-readable text. A typical protobuf message is 3-10x smaller than the JSON equivalent.

```protobuf
// user.proto
service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
}

message GetUserRequest {
  int64 id = 1;
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
}
```

From this `.proto` file, gRPC generates client and server code in any supported language (Go, Java, Python, Rust, etc.). The generated code handles serialization, connection management, and error handling. No hand-writing HTTP clients.

**HTTP/2 native**: gRPC uses HTTP/2, getting multiplexing, header compression, and streaming for free.

**Streaming**: gRPC natively supports four communication patterns:
- Unary: request → response (like REST)
- Server streaming: request → stream of responses
- Client streaming: stream of requests → response
- Bidirectional streaming: both sides stream simultaneously

**When gRPC shines**: Internal microservice communication. High-throughput, low-latency service-to-service calls. Polyglot environments where services are written in different languages. Streaming workloads.

**Where gRPC has costs**:
- Not browser-native: browsers can't make raw gRPC calls (you need gRPC-Web, a compatibility layer)
- Binary format isn't human-debuggable: you can't `curl` a gRPC endpoint and read the response
- Protobuf schema changes must be backward-compatible (adding fields is fine; removing or renumbering is not)

---

## WebSockets: When the Server Needs to Talk First

REST, GraphQL, and gRPC are all fundamentally **request-response**: the client initiates, the server responds.

But what about scenarios where the server needs to send data to the client without being asked?

- A chat application: when Alice sends a message, Bob's client needs to receive it immediately — without polling
- A live dashboard: stock prices, server metrics, or game scores update in real-time
- Collaborative editing: when one user types, all other users see the changes instantly

**WebSockets** establish a persistent, bidirectional TCP connection between client and server. Either side can send messages at any time. No polling, no waiting for the client to ask.

```javascript
// Client
const ws = new WebSocket('wss://chat.example.com');

ws.onmessage = (event) => {
  console.log('Received:', event.data);  // Server sent a message
};

ws.send(JSON.stringify({ type: 'chat', text: 'Hello!' }));  // Client sends

// Server pushes messages whenever they arrive — no client request needed
```

**When WebSockets shine**: Real-time applications. Chat. Live feeds. Multiplayer games. Collaborative tools.

**Where WebSockets have costs**:

**Stateful connections**: Each WebSocket connection is a persistent TCP connection. A server handling 100,000 WebSocket connections has 100,000 open TCP connections — that's significant memory and file descriptor usage. REST is stateless: the connection opens, the response is sent, the connection closes.

**Load balancing is harder**: A WebSocket connection is sticky — it's tied to a specific server. If you need to scale down or restart a server, those connections need to be migrated or reconnected. REST connections are ephemeral and can be routed to any server.

**No built-in reliability**: WebSocket doesn't have request-response semantics. There's no "ack" for a message by default. If you need guaranteed delivery, you have to build it into your application protocol.

**Server-Sent Events (SSE)** are a simpler alternative when you only need server-to-client streaming (no bidirectional communication). SSE uses a regular HTTP connection, works with standard load balancers and CDNs, and auto-reconnects if the connection drops. It's the right choice for live dashboards and feeds where the client doesn't send data back.

---

## When to Use What: The Decision Framework

| Scenario | Best Fit | Why |
|---|---|---|
| Public API for third parties | REST | Universal, cacheable, well-understood |
| Mobile app with complex data needs | GraphQL | Flexible queries, no over-fetching |
| Internal service-to-service calls | gRPC | Performance, type safety, code generation |
| Real-time bidirectional communication | WebSockets | Server can push messages, persistent connection |
| Live server-to-client updates | SSE | Simpler than WebSockets, auto-reconnect |
| High-throughput data pipeline | gRPC streaming | Efficient binary format, backpressure support |

**Most systems use multiple protocols**: REST for public APIs, gRPC between internal services, WebSockets for real-time features, SSE for live updates. Each has its niche.

The mistake is reaching for the most complex option first. REST covers 80% of use cases well. Reach for GraphQL, gRPC, or WebSockets when you've identified the specific problem they solve and REST can't.

In the next lesson, we'll dive deeper into API design details that matter enormously in production: idempotency (making operations safe to retry), versioning (evolving APIs without breaking clients), and pagination (handling large result sets efficiently).

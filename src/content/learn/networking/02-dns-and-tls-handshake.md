---
id: networking-dns-tls
title: "What Happens When You Type a URL"
track: networking
module: application-protocols
level: beginner
duration: 20
prerequisites: [networking-tcp-udp]
concepts: [dns, tls, https, certificates, http, http2, handshake, encryption, certificate-authority]
tags: [beginner, networking, dns, tls, https, http, certificates]
interactive:
  type: http-request-tracer
  enabled: true
order: 2
---

# What Happens When You Type a URL

Type `https://github.com` and press Enter.

About 200 milliseconds later, you're looking at GitHub's homepage.

In those 200 milliseconds, your browser performed roughly 8-10 distinct network operations, negotiated cryptographic keys with a server it had never directly met before, proved (to a mathematical certainty) that it was talking to GitHub and not an impostor, and loaded the first bytes of a response.

This lesson traces every step of that journey. Not as a list of protocols to memorize, but as a story of problems and solutions — each step exists because the previous step introduced a problem.

---

## Step 1: Turning a Name Into an Address (DNS)

You typed `github.com`. Your computer needs to turn that name into an IP address (like `140.82.121.3`) to know where to send the connection.

But your computer doesn't have a directory of all domain names and their IP addresses. Nobody does — there are over 350 million registered domains. Instead, the internet uses a distributed, hierarchical lookup system called **DNS** (Domain Name System).

Your browser doesn't contact one server and ask "what's github.com?" Instead, it navigates a tree of servers, each knowing about a smaller portion of the namespace:

```
Your Browser
    │
    ▼
Your OS DNS Resolver (checks its cache first)
    │ (if not cached)
    ▼
Recursive Resolver (usually your ISP or 8.8.8.8)
    │
    ├─► Root Nameservers ("who handles .com?")
    │        Answer: "Go ask the .com nameservers"
    │
    ├─► .com Nameservers ("who handles github.com?")
    │        Answer: "Go ask ns1.github.com"
    │
    └─► github.com Nameservers ("what's the IP for github.com?")
             Answer: "140.82.121.3"
```

The final answer — `github.com = 140.82.121.3` — gets cached at every level. Your OS caches it for the TTL specified in the DNS record (could be 60 seconds, could be a day). Your browser caches it. The recursive resolver caches it. So subsequent lookups are instant.

**Why does DNS caching TTL matter for system design?**

If you're doing a disaster recovery failover and need to redirect traffic from your primary datacenter to a backup — you change the DNS record. But anyone with the old record cached won't pick up the change until their TTL expires. If your TTL is 24 hours, some users continue hitting the failed datacenter for up to 24 hours.

The trade-off: short TTL = faster propagation of changes, but more DNS queries (more cost, more latency on cache misses). Long TTL = less DNS traffic, but slower failover. Most production systems use TTLs of 60-300 seconds for load-balanced services.

---

## Step 2: Opening a Connection (TCP Handshake)

With the IP address in hand, your browser initiates a TCP connection to port 443 (the default HTTPS port).

As we covered in the previous lesson, this is a three-way handshake:
- SYN → SYN-ACK → ACK

One round-trip. For GitHub's servers (likely in a US datacenter), this might be 20-80ms depending on where you are.

---

## Step 3: The Cryptographic Puzzle (TLS Handshake)

Here's where things get interesting.

You're connected to `140.82.121.3`. But how do you know that IP address is actually GitHub, and not an attacker who's intercepted your connection? Without verification, your "secure" connection could be to an impostor who will read all your data.

This is the problem that **TLS** (Transport Layer Security) solves. And it's a genuinely hard problem: you need to verify that you're talking to the right server, and exchange cryptographic keys, over a network you don't control and can't trust.

The TLS handshake (TLS 1.3, the modern version) works like this:

**Client Hello**: Your browser sends: "I want to use TLS 1.3. Here are the cipher suites I support. Here are my cryptographic key exchange parameters."

**Server Hello + Certificate**: The server responds: "OK, using TLS 1.3 with this cipher. Here's my **certificate**." The certificate contains GitHub's public key and is **signed by a Certificate Authority** (CA) — a trusted third party.

**Certificate Verification**: Your browser checks GitHub's certificate:
1. Was it signed by a CA that your browser trusts? (Browsers ship with a list of ~100 trusted CAs)
2. Is the domain name in the certificate `github.com`?
3. Is the certificate still valid (not expired, not revoked)?

If all checks pass, your browser knows it's talking to a server that a trusted CA has vouched for as being `github.com`. The CA couldn't sign a certificate for GitHub unless they verified GitHub actually owns that domain.

**Key Exchange**: Both sides use the server's public key (from the certificate) and some mathematical magic (elliptic curve Diffie-Hellman key exchange) to agree on a **symmetric encryption key** — without ever sending that key over the network. Even if someone captured every packet of this handshake, they couldn't compute the key.

All subsequent communication is encrypted with this session key. Nobody can read it without that key.

**Total TLS handshake cost in TLS 1.3**: 1 round-trip (down from 2 in TLS 1.2). Plus the TCP handshake was 1 round-trip. So before sending a single byte of your actual request: 2 round-trips.

For 80ms of round-trip time: 160ms just to establish a secure connection. This is why HTTPS has more latency than HTTP, and why TLS 1.3's 1-RTT handshake was a meaningful improvement over TLS 1.2's 2-RTT.

---

## Step 4: The Actual Request (HTTP)

Finally, your browser can send the actual request:

```http
GET / HTTP/2
Host: github.com
Accept: text/html,application/xhtml+xml
Accept-Encoding: gzip, br
User-Agent: Mozilla/5.0...
```

And receives a response:

```http
HTTP/2 200 OK
Content-Type: text/html
Content-Encoding: br
Cache-Control: no-cache
...

[HTML body]
```

This all flows over the already-established TLS connection, encrypted.

HTTP/2 (which GitHub uses) introduces a few improvements over HTTP/1.1 that matter enormously for performance:

**Header compression (HPACK)**: HTTP headers are repetitive — `User-Agent`, `Accept`, `Cookie` are sent with every request. HTTP/2 compresses headers by maintaining a shared dictionary between client and server, so headers only need to be sent once and referenced by index thereafter.

**Multiplexing**: Multiple requests and responses can interleave over a single TCP connection. In HTTP/1.1, requests were serialized — you had to wait for one response before sending the next. HTTP/2 sends all requests simultaneously and the responses arrive as they're ready.

**Server Push**: The server can send resources the browser will need (CSS, JS files) before the browser explicitly requests them, based on what it knows about the page.

---

## The Full Timeline

Let's put numbers on the whole journey:

```
t=0ms:    Type URL, press Enter
t=1ms:    DNS lookup starts
t=5ms:    DNS answer received (cached at recursive resolver)
t=5ms:    TCP SYN sent
t=80ms:   TCP SYN-ACK received (20ms RTT for US servers, 80ms for overseas)
t=80ms:   TCP ACK sent; TCP connection established
t=80ms:   TLS Client Hello sent
t=160ms:  TLS Server Hello + Certificate received
t=160ms:  TLS Finished (key exchange complete)
t=160ms:  HTTP/2 GET request sent
t=200ms:  First HTTP response bytes received
t=200-500ms: Browser renders page as bytes arrive
```

This is a simplified timeline for a first visit with no caches. On repeat visits:
- DNS: 0ms (cached in browser)
- TCP + TLS: 0ms (connection reused, or 0-RTT with QUIC)
- HTTP: the dominant time

---

## HTTPS Everywhere: Why It Matters Beyond Security

You might think HTTPS is mainly about privacy (encrypting your traffic so ISPs and attackers can't read it). That's true. But HTTPS has become essential for performance reasons too:

**HTTP/2 requires TLS**: The HTTP/2 specification doesn't technically require TLS, but all major browsers only support HTTP/2 over TLS. So to get HTTP/2's multiplexing and header compression, you need TLS.

**HSTS** (HTTP Strict Transport Security): A header that tells browsers "only ever connect to this domain over HTTPS, even if someone types http://." This prevents downgrade attacks where an attacker redirects you to HTTP.

**Certificate Transparency**: A public, append-only log of all certificates ever issued. If a CA issues a fraudulent certificate for github.com, it will appear in the log. GitHub (and other sites) monitor these logs for unauthorized certificates.

The ecosystem around HTTPS has become a meaningful piece of internet infrastructure security.

---

## What This Means for API Design

Every API call between services follows the same protocol stack (unless you're using a private network where some steps are skipped). The lesson:

**Minimize round-trips**: HTTP/2 multiplexing helps. But if you need 5 pieces of data, a GraphQL query or a batch API call (one round-trip) is much faster than 5 REST calls (five round-trips × RTT each).

**Keep connections alive**: Don't open a new TCP connection for every API call. Use a connection pool. The handshake overhead is real.

**Use gRPC over HTTP/2**: For service-to-service communication, gRPC is built on HTTP/2 and uses Protocol Buffers (compact binary encoding) instead of JSON. Smaller payloads, multiplexing, efficient transport.

**Respect TTLs and caching**: HTTP has a rich caching model (Cache-Control, ETag, Last-Modified). Using it correctly means CDNs and browsers serve your content without hitting your origin servers for every request.

**Certificates expire**: In production, you need to monitor TLS certificate expiration and automate renewal (Let's Encrypt + cert-manager, ACM in AWS). A forgotten certificate that expires causes an outage — all clients will refuse to connect.

In the next track, we'll look at what happens at the API boundary between services — how REST, GraphQL, gRPC, and WebSockets each make different trade-offs about communication style, and when each is the right tool.

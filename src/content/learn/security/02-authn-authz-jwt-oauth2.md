---
id: security-authn-authz
title: "Authentication and Authorization: Proving Who You Are and What You Can Do"
track: security
module: identity
level: advanced
duration: 22
prerequisites: [security-zero-trust-mtls]
concepts: [authentication, authorization, jwt, oauth2, oidc, rbac, abac, session, token]
tags: [advanced, security, authentication, authorization, jwt, oauth2]
interactive:
  type: auth-flow
  enabled: true
order: 2
---

# Authentication and Authorization: Proving Who You Are and What You Can Do

Two concepts that sound similar but are fundamentally different:

**Authentication (AuthN)**: "Who are you?" — Verifying identity. Are you really Alice, or someone pretending to be Alice?

**Authorization (AuthZ)**: "What can you do?" — Verifying permissions. Alice is authenticated, but is she allowed to delete this file?

Getting these right is critical. Getting them wrong means either users can't access things they should, or attackers access things they shouldn't.

---

## Session-Based Authentication: The Traditional Approach

The oldest pattern: the server remembers who you are.

```
1. User sends: POST /login { username: "alice", password: "secret123" }
2. Server verifies credentials against database
3. Server creates a session: { session_id: "abc123", user_id: 42, created_at: ... }
4. Server stores session in memory or Redis
5. Server sends: Set-Cookie: session_id=abc123
6. Browser automatically sends this cookie with every subsequent request
7. Server looks up session_id, finds user_id, knows it's Alice
```

**Advantages**: Server controls sessions completely. Can revoke any session instantly (delete from Redis). Can track all active sessions.

**Disadvantages**: Server must store session state. With 1 million active users, that's 1 million sessions in Redis. And sessions are tied to a server — you need shared session storage (Redis) for multiple servers.

---

## Token-Based Authentication: JWTs

**JWTs (JSON Web Tokens)** flip the model: instead of the server storing session state, the client carries a signed token that contains all the information the server needs.

A JWT has three parts: `header.payload.signature`

```json
// Header (how it's signed)
{ "alg": "RS256", "typ": "JWT" }

// Payload (claims about the user)
{
  "sub": "user-42",
  "name": "Alice",
  "role": "admin",
  "exp": 1725000000,  // Expires at this timestamp
  "iat": 1724913600   // Issued at this timestamp
}

// Signature
HMAC-SHA256(base64(header) + "." + base64(payload), secret_key)
```

The server signs the token with a secret key. When a request comes in with a JWT, the server verifies the signature — if it's valid, the payload was created by the server and hasn't been tampered with. The server doesn't need to look anything up.

**Advantages**: Stateless — no server-side storage needed. Works across multiple servers without shared state. Can include user information (name, role) directly in the token, avoiding database lookups.

**Disadvantages**: Can't be revoked easily. Once a JWT is issued, it's valid until it expires. If a user's account is compromised, you can't invalidate their JWT without maintaining a blacklist (which re-introduces server-side state). Keep JWTs short-lived (15 minutes) and use refresh tokens for longer sessions.

**Common JWT mistakes**:
- Storing sensitive data in the payload (JWTs are base64-encoded, not encrypted — anyone can read the payload)
- Using `"alg": "none"` (some libraries accept unsigned tokens if the algorithm is set to "none")
- Not validating expiration (`exp` claim)
- Using symmetric keys (HS256) when asymmetric (RS256) would be more secure

---

## OAuth 2.0: "Sign in with Google"

When you click "Sign in with Google" on a website, you're using **OAuth 2.0** — a protocol that lets a third-party application access your data without knowing your password.

The flow (Authorization Code Grant):

```
1. User clicks "Sign in with Google" on YourApp
2. YourApp redirects to Google:
   "Hey Google, YourApp wants to access this user's email. Here's my client_id."
3. Google asks user: "YourApp wants to see your email. Allow?"
4. User clicks "Allow"
5. Google redirects back to YourApp with an authorization_code
6. YourApp sends the code to Google (server-to-server, with client_secret):
   "Here's the code. Give me an access token."
7. Google verifies and returns an access_token
8. YourApp uses the access_token to call Google's API:
   "GET /userinfo with Bearer access_token"
9. Google returns { email: "alice@gmail.com", name: "Alice" }
```

**Why the code exchange?** Security. The authorization code goes through the browser (visible). If it were the access token itself, a malicious script in the browser could steal it. Instead, the code is exchanged for a token in a server-to-server call that the browser never sees.

**OIDC (OpenID Connect)** extends OAuth 2.0 with standardized identity claims. OAuth tells you "this user allowed access." OIDC additionally tells you "this user is alice@gmail.com and her name is Alice" — through a standardized ID token.

---

## Authorization: RBAC vs ABAC

Once you know who the user is, you need to determine what they're allowed to do.

**RBAC (Role-Based Access Control)**: Users are assigned roles. Roles have permissions. Simple and widely used.

```
Roles:
  admin  → can: read, write, delete, manage_users
  editor → can: read, write
  viewer → can: read

Users:
  Alice → role: admin
  Bob   → role: editor
  Carol → role: viewer
```

Checking: `if user.role == "admin" or "write" in role_permissions[user.role]`

RBAC works well when permissions map cleanly to roles. It breaks down when permissions are contextual: "Alice can edit posts *she created* but not others' posts."

**ABAC (Attribute-Based Access Control)**: Permissions are based on attributes of the user, the resource, and the context.

```
Policy: Allow if
  - user.department == resource.department
  - user.role in ["editor", "admin"]
  - current_time is during business_hours
  - resource.classification != "top_secret" OR user.clearance_level >= resource.classification
```

ABAC is more expressive but more complex. It's used when permission logic depends on many factors (data classification, time of day, geographic location, resource ownership).

**In practice**: Start with RBAC. Move to ABAC when your permission model becomes too complex for simple roles. Most applications never need ABAC.

---

## The Practical Summary

1. **Use JWTs for stateless authentication** with short expiration (15-30 minutes) and refresh tokens for session continuity
2. **Use OAuth 2.0/OIDC** for third-party login — don't build your own "Sign in with X"
3. **Start with RBAC** for authorization — upgrade to ABAC only when roles aren't expressive enough
4. **Hash passwords with bcrypt or argon2** — never store plaintext, never use MD5 or SHA256 alone (they're too fast; purpose-built password hashes are intentionally slow)
5. **Always use HTTPS** — never transmit tokens or credentials over unencrypted connections

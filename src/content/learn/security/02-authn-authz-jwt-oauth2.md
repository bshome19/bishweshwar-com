---
id: security-authn-authz-jwt-oauth2
title: "Authentication vs Authorization: JWTs, OAuth2, and Session Security"
track: security
module: identity
level: intermediate
duration: 25
prerequisites: [security-zero-trust-architecture-and-mtls]
concepts: [authentication, authorization, jwt, oauth2, rbac, abac, session-management, token-revocation]
tags: [security, authn, authz, jwt, oauth2, identity]
order: 2
---

# Authentication vs Authorization: JWTs, OAuth2, and Session Architecture

Identity architecture is the cornerstone of user security. A critical first step is disentangling two distinct concepts:
- **Authentication (AuthN)**: *"Who are you?"* (Verifying the user's claimed identity via passwords, biometric passkeys, or multi-factor tokens).
- **Authorization (AuthZ)**: *"What are you allowed to do?"* (Verifying whether the authenticated entity has permission to read or modify a specific resource).

---

## 1. JSON Web Tokens (JWT) vs Opaque Session IDs

Architects face a fundamental trade-off when selecting a session representation:

```
┌────────────────────────────────────────────────────────┐
│ Option A: Opaque Random Session Token (Redis-Backed)  │
├────────────────────────────────────────────────────────┤
│ Client sends: Bearer 7a9f...b12                        │
│ Server MUST query Redis on EVERY request to look up    │
│ { user_id, permissions }                               │
│ Pro: Instant revocation (delete key in Redis).         │
│ Con: Adds network I/O to every single API request.     │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Option B: Self-Contained JWT (Stateless Signature)    │
├────────────────────────────────────────────────────────┤
│ Client sends: eyJhbGciOiJSUzI1Ni... (Header.Payload.Sig)│
│ Server validates signature locally with public key.    │
│ Zero database or Redis lookups required!               │
│ Pro: Extreme scalability for microservices.            │
│ Con: Revoking a stolen token immediately is hard.      │
└────────────────────────────────────────────────────────┘
```

### The Anatomy of a JWT
A JWT is composed of three Base64URL-encoded parts separated by periods:
1. **Header**: Algorithms used (`{"alg": "RS256", "typ": "JWT"}`).
2. **Payload (Claims)**: Identity data (`{"sub": "123", "role": "admin", "exp": 1774353600}`).
3. **Signature**: Cryptographic signature calculated using the issuer's private key:

$$\text{Signature} = \text{RSASHA256}(\text{Header} + "." + \text{Payload}, \text{PrivateKey})$$

### The Token Revocation Problem
Because JWTs are stateless, if an employee is terminated or a laptop is stolen, a valid 24-hour JWT remains valid until its `exp` timestamp arrives.

**Production Solution**: **Short-Lived Access Tokens + Refresh Tokens**.
- **Access Token (JWT)**: Valid for only **5 to 15 minutes**. Verified statelessly by all downstream microservices.
- **Refresh Token (Opaque UUID)**: Valid for **30 days**, stored securely in an `HttpOnly, Secure, SameSite=Strict` cookie, and tracked in a persistent database table.
- When the 15-minute access token expires, the client calls `/auth/refresh`. The auth service checks the DB: if the user was banned, the refresh is denied immediately!

---

## 2. OAuth 2.0 Authorization Code Flow with PKCE

When users sign in via third-party identity providers ("Sign in with Google / GitHub"), modern architecture mandates the **Authorization Code Flow with Proof Key for Code Exchange (PKCE)**:

```
User App (Client)                  Browser                       Auth0 / Google
    │                                 │                                │
    │── 1. Generate code_verifier     │                                │
    │      and code_challenge (SHA256)│                                │
    │                                 │                                │
    │── 2. Open login page with challenge ────────────────────────────►│
    │                                 │                                │
    │◄── 3. User authenticates; Redirect with auth_code ───────────────│
    │                                 │                                │
    │── 4. POST /token (auth_code + code_verifier) ───────────────────►│
    │                                                                  │ (Verifies SHA256 of verifier
    │                                                                  │  matches initial challenge!)
    │◄── 5. Returns Access Token & ID Token ───────────────────────────│
```

PKCE prevents malicious applications from intercepting the authorization code, establishing a secure standard for single-page web applications and native mobile devices.

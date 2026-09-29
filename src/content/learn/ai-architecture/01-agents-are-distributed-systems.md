---
id: ai-architecture-distributed-systems
title: "Why AI Systems Are Distributed Systems Problems"
track: ai-architecture
module: ai-fundamentals
level: advanced
duration: 22
prerequisites: [distributed-systems-cap-pacelc, reliability-circuit-breakers-retries]
concepts: [llm-architecture, non-determinism, prompt-engineering, tool-use, guardrails, latency-management]
tags: [advanced, ai-architecture, llm, non-determinism, distributed-systems]
interactive:
  type: llm-architecture
  enabled: true
order: 1
---

# Why AI Systems Are Distributed Systems Problems

LLMs are not just smart APIs. They're a fundamentally different kind of service — one that is **non-deterministic**, has **unbounded latency**, produces **unstructured outputs**, and can **fail in ways that look like success** (confidently wrong answers).

Building reliable software that incorporates AI requires treating LLMs as distributed systems components — with the same rigor you'd apply to any external dependency: timeouts, retries, circuit breakers, monitoring, and graceful degradation.

---

## What Makes LLMs Different from Traditional Services

**Non-determinism**: The same input can produce different outputs. Traditional services are deterministic — `getUser(42)` always returns the same user. An LLM given the same prompt might return different responses each time. This breaks assumptions baked into most testing, caching, and debugging practices.

**Unbounded latency**: A simple prompt might return in 500ms. A complex one might stream tokens for 30 seconds. Traditional services have predictable latency distributions. LLM latency varies dramatically based on prompt complexity, output length, and model load.

**Unstructured outputs**: Traditional APIs return JSON with a defined schema. LLMs return natural language text that might or might not match the format you asked for. Parsing LLM output is itself an error-prone operation.

**Failure that looks like success**: When a database query fails, you get an error. When an LLM "fails," it might return a plausible-sounding but completely incorrect answer (hallucination). There's no error code for "this is wrong."

---

## Designing Around Non-Determinism

**Structured output enforcement**: Use function calling / tool use features to force the LLM to return structured JSON matching a schema, rather than free-form text. Parse and validate the schema. Reject responses that don't conform.

**Temperature and determinism**: Set temperature to 0 for tasks requiring consistency (classification, extraction). Use higher temperatures only for creative tasks where variation is desirable.

**Output validation**: Don't trust LLM output. Validate it against business rules. If the LLM is extracting a date from text, verify it's a valid date in a plausible range. If it's classifying sentiment, verify the output is one of your expected categories.

**Retry with variation**: If the LLM produces an invalid response, retry with a modified prompt that includes the error: "Your previous response was invalid because [reason]. Please try again and return valid JSON."

---

## Latency Management

LLM calls are slow compared to traditional services. A single GPT-4 call might take 2-15 seconds. In a system where users expect sub-second responses, this requires specific architectural choices:

**Streaming**: Return tokens as they're generated, rather than waiting for the complete response. Users perceive a streaming response as faster, even though total time is the same.

**Async processing**: For non-interactive use cases (email drafting, report generation), process LLM calls asynchronously. The user submits a request, gets an immediate acknowledgment, and the result is delivered when ready.

**Caching**: If the same or similar inputs occur frequently, cache LLM responses. This requires semantic matching (not just exact string matching), which introduces complexity but can dramatically reduce latency and cost.

**Model selection by latency**: Use faster, smaller models for latency-sensitive tasks and larger, more capable models for quality-sensitive tasks. Route based on the task's requirements.

---

## Cost Management

LLM API pricing is per-token. A system making thousands of LLM calls per hour can accumulate significant costs.

**Prompt optimization**: Shorter prompts cost less. Remove unnecessary context. Use concise system prompts.

**Token limits**: Set `max_tokens` to limit response length. An LLM generating a 4,000-token response when you need 100 tokens is wasteful.

**Caching**: Cache responses for repeated queries. Even imperfect caching (matching queries by semantic similarity) can reduce API calls by 30-50%.

**Model tier selection**: Not every task needs the most capable model. Classification tasks might work perfectly with a smaller model at 10x lower cost.

---

## Reliability Patterns for LLM Integration

Apply the same reliability patterns from the reliability track:

**Timeouts**: Set aggressive timeouts on LLM calls. If the response doesn't start streaming within 10 seconds, fall back.

**Circuit breakers**: If the LLM provider is experiencing issues (high error rates, extreme latency), stop calling it and use a fallback (cached response, simpler model, or graceful degradation).

**Graceful degradation**: If the AI feature is unavailable, what does the user see? A recommendation system that falls back to "most popular items" is better than one that shows an error page.

**Guardrails**: Validate both inputs and outputs. Filter harmful or off-topic prompts before sending. Validate responses before showing to users. Implement content safety checks.

The full reliability stack (timeouts + circuit breakers + retries + graceful degradation) applies to LLM integrations exactly as it does to any external service dependency.

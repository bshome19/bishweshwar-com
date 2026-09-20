---
title: "AI Agents for MR Diff Coverage & Automated Unit Testing"
description: "Designing autonomous LLM-powered developer productivity workflows that analyze merge request diffs, detect uncovered execution paths, and synthesize robust unit tests."
category: "ai"
status: "active"
technologies: ["AI Agents", "LLMs", "GitLab CI/CD", "AST Parsing", "Go Testing", "Python"]
github: "https://github.com/bshome19"
featured: false
order: 5
---

## 1. Overview

Maintaining high code quality across large microservice architectures requires comprehensive unit testing. However, manual test authoring often lags feature delivery, resulting in coverage regressions when new code paths are introduced in merge requests.

During my work as SDE III at F5 Networks, I engineered **AI agent workflows** that analyze Git merge request (MR) diffs, identify uncovered changed lines, and generate targeted, compilable unit tests — pushing repo test coverage beyond **90%+**.

---

## 2. The Problem: The Coverage Regression Gap

Traditional CI pipelines run blanket coverage tools like `go test -coverprofile`. While these detect the global coverage percentage, they have major limitations:
- A large existing test suite can mask that 100% of newly added lines in an MR have 0% coverage.
- Developers lack immediate actionable feedback showing exactly *which* branches were missed.
- Writing extensive mock setups and edge-case assertions is time-consuming.

---

## 3. Architecture of the Diff-Coverage Agent

```
            GitLab / GitHub Pull Request
                         │
                         ▼
        ┌──────────────────────────────────┐
        │   MR Diff Extractor & AST Parser │
        │   (Filters only modified lines)  │
        └────────────────┬─────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │   LCOV Coverage Correlator       │
        │   (Matches diff with coverage)   │
        └────────────────┬─────────────────┘
                         │
              Uncovered Modified Lines
                         │
                         ▼
        ┌──────────────────────────────────┐
        │    Context-Enriched AI Agent     │
        │   (Injects AST, types, fixtures) │
        └────────────────┬─────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │    Automated Test Compilation    │
        │   (`go test` verification loop)  │
        └────────────────┬─────────────────┘
                         │
                         ▼
            Generated Unit Test PR / Patch
```

---

## 4. Key Agentic Workflow Components

1. **Diff AST Slicing**: Rather than sending the entire repository into the LLM context window, the tool parses the Abstract Syntax Tree (AST) around the modified functions to provide precise call-graph context.
2. **Deterministic Mock Generation**: Synthesizes interface mocks matching project conventions (e.g. `mockgen` or test doubles).
3. **Compilation & Self-Correction Loop**: The agent runs the generated test in an isolated Docker container. If compilation fails or assertions fail, the error output is fed back into the agent to refine the test before submitting a suggested commit.

---

## 5. Outcomes

- Elevated test coverage to **90%+ across multiple core services**.
- Eliminated coverage regressions on newly merged features.
- Reduced developer time spent writing boilerplate table-driven tests by over 60%.

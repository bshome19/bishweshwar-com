---
id: ai-architecture-agentic-patterns
title: "Agentic Patterns: When AI Calls Other Systems"
track: ai-architecture
module: agentic-systems
level: advanced
duration: 22
prerequisites: [ai-architecture-distributed-systems]
concepts: [agent, tool-use, reflection, plan-and-solve, mcp, a2a, human-in-the-loop, state-machine]
tags: [advanced, ai-architecture, agents, tool-use, mcp, patterns]
interactive:
  type: agent-flow
  enabled: true
order: 2
---

# Agentic Patterns: When AI Calls Other Systems

An "agent" in AI is an LLM that doesn't just generate text — it takes actions. It reads databases, calls APIs, writes files, sends emails. The LLM is the reasoning engine; the actions are its hands.

This is powerful and dangerous. Powerful because an agent can automate complex multi-step workflows. Dangerous because a misguided agent can corrupt data, send incorrect emails, or make expensive API calls — and do it confidently.

Building reliable agentic systems requires treating them as **state machines with external effects** — not as smart chatbots.

---

## The Core Agentic Loop

Every agent follows the same fundamental loop:

```
1. Observe: Gather context (user query, tool results, conversation history)
2. Think: Reason about what to do next (the LLM's core job)
3. Act: Execute an action (call a tool, generate output)
4. Observe: See the result of the action
5. Repeat until done
```

This is the ReAct (Reasoning + Acting) pattern. The agent interleaves reasoning ("I need to find the user's order history") with actions ("Call the orders API for user_id=42") until it has enough information to answer.

---

## Tool Use: Giving the Agent Hands

**Tool use** (also called function calling) lets the LLM declare which tools it wants to call and with what arguments. The system executes the tool and returns the result to the LLM.

```
User: "What's the weather in Tokyo?"

LLM thinks: I need to call the weather API.
LLM outputs: { "tool": "get_weather", "args": { "city": "Tokyo" } }

System executes: get_weather("Tokyo") → { "temp": 22, "condition": "sunny" }

System sends result back to LLM.

LLM outputs: "It's 22°C and sunny in Tokyo right now."
```

**Key design decisions for tool use**:

**Tool descriptions matter enormously.** The LLM selects tools based on their descriptions. A vague description leads to wrong tool selection. A precise description guides correct selection.

**Validate tool arguments.** The LLM generates arguments as JSON. These might be malformed, missing required fields, or contain unsafe values. Validate before executing.

**Limit tool access.** An agent shouldn't have access to every tool in your system. Give it only the tools relevant to its task. An agent helping with customer support shouldn't be able to delete production databases.

---

## Multi-Agent Patterns

Complex tasks often benefit from multiple specialized agents collaborating:

**The Orchestrator Pattern**: A central agent receives the user's request, breaks it into sub-tasks, delegates each to a specialized agent, and synthesizes the results.

```
User Request → Orchestrator Agent
                ├── Research Agent (searches knowledge base)
                ├── Analysis Agent (analyzes data)
                └── Writing Agent (composes response)
                
Orchestrator combines results → Final response
```

**The Pipeline Pattern**: Agents are chained sequentially, each refining the output of the previous one. Agent 1 drafts. Agent 2 reviews and edits. Agent 3 formats.

**The Debate Pattern**: Multiple agents with different "perspectives" argue about a question. A judge agent evaluates their arguments and selects the best answer. This improves accuracy on complex reasoning tasks.

---

## Human-in-the-Loop: The Safety Net

For high-stakes actions (sending money, deleting data, sending emails to customers), agents should **propose actions for human approval** rather than executing directly.

```
Agent: "I'd like to refund $150 to order #4523. Approve? [Yes/No]"
Human: "Yes"
Agent: [executes refund]
```

This pattern is essential for:
- Financial transactions
- Data mutations
- External communications
- Any action that's difficult or impossible to reverse

The agent does the research and reasoning. The human provides the judgment and authorization. This is the pattern that makes agents useful in enterprise settings where full autonomy isn't appropriate.

---

## MCP and A2A: The Emerging Standards

**Model Context Protocol (MCP)**: A standardized way for LLMs to connect to external data sources and tools. Instead of building custom integrations for each tool, MCP provides a common protocol that any tool can implement.

**Agent-to-Agent (A2A)**: A protocol for agents to discover, communicate with, and delegate to other agents. This enables multi-agent systems where specialized agents can be composed dynamically.

These protocols are still evolving, but they point toward a future where agents are composable components in larger systems — much like microservices are composable components in traditional architectures.

---

## Reliability for Agentic Systems

Agents fail in unique ways:
- **Infinite loops**: The agent keeps calling the same tool, never converging on an answer
- **Hallucinated tool calls**: The agent tries to call a tool that doesn't exist
- **Context window overflow**: The conversation grows too long, older context is lost
- **Cost runaway**: The agent makes dozens of expensive API calls for a simple question

**Guardrails**:
- Maximum step count (kill the agent after 20 steps)
- Maximum token budget per request
- Tool call rate limiting
- Output validation at every step
- Logging every step for debugging and audit

Treat agents as untrusted processes with bounded resources — the same way you'd treat a user-submitted script running in a sandbox.

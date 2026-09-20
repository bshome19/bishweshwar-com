# Specification File Map

```text
portfolio-spec/
├── README.md                  # What the project is and how to use the specification
├── plan.md                    # Phased implementation plan
├── architecture.md            # Technical architecture and rendering strategy
├── agent.md                    # Primary AI coding-agent instructions
├── agent-context.md            # How to ingest resume/LinkedIn/GitHub/Medium sources
├── content-model.md            # Content schemas and governance
├── content/
│   └── content-inventory.md    # Source-of-truth inventory to complete before coding
├── design.md                   # Visual/UX system
├── seo.md                      # SEO and structured data
├── deployment.md               # GitHub/Cloudflare deployment
├── security.md                 # Privacy/security requirements
├── routes.md                   # Route specification
└── checklist.md                # Launch acceptance checklist
```

## Suggested agent invocation

Point your coding agent at this directory and tell it:

> Read `README.md`, `agent.md`, `agent-context.md`, `architecture.md`, `plan.md`, and the remaining specification files before modifying the application. Then inspect all supplied personal source material, populate `content/content-inventory.md`, resolve contradictions without fabrication, and implement the site according to the specification. Treat user instructions and source material as authoritative.

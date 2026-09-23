export interface TrackModule {
  id: string;
  title: string;
  description: string;
}

export interface LearnTrack {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'all';
  description: string;
  badge: string;
  icon: string;
  order: number;
  modules?: TrackModule[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  badge: string;
  targetAudience: string;
  trackIds: string[];
  estimatedHours: number;
}

export const LEARN_TRACKS: LearnTrack[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    level: 'beginner',
    badge: 'Core CS',
    icon: '⚡',
    description: 'Hardware realities, latency vs throughput, process and thread models, memory hierarchies, and core mental models for architectural reasoning.',
    order: 1,
  },
  {
    id: 'networking',
    title: 'Networking & Transport',
    level: 'beginner',
    badge: 'Protocols',
    icon: '🌐',
    description: 'TCP 3-way handshakes, UDP trade-offs, TLS 1.3 cryptographic handshakes, DNS resolution mechanics, and HTTP evolution through HTTP/3 and QUIC.',
    order: 2,
  },
  {
    id: 'apis',
    title: 'APIs & Communication',
    level: 'beginner',
    badge: 'API Design',
    icon: '🔌',
    description: 'Stateless REST, GraphQL queries, low-overhead binary gRPC via Protocol Buffers, persistent WebSockets, SSE, idempotency keys, and backward compatibility.',
    order: 3,
  },
  {
    id: 'databases',
    title: 'Databases & Storage',
    level: 'intermediate',
    badge: 'Persistence',
    icon: '💾',
    description: 'B-Trees vs LSM-Trees, Write-Ahead Logs (WAL), SSTables, Bloom filters, ACID transactions, isolation anomalies, query planners, and sharding.',
    order: 4,
  },
  {
    id: 'caching',
    title: 'Caching & Performance',
    level: 'intermediate',
    badge: 'In-Memory',
    icon: '🚀',
    description: 'Cache-aside, read-through, write-through, write-back, TTL expiration, LRU/LFU eviction math, and preventing thundering herds and stampedes.',
    order: 5,
  },
  {
    id: 'distributed-systems',
    title: 'Distributed Systems',
    level: 'intermediate',
    badge: 'Distributed',
    icon: '📡',
    description: 'Partial failures, network partitions, PACELC theorem, quorum reads/writes, consensus via Raft and Paxos, distributed locking, and fencing tokens.',
    order: 6,
  },
  {
    id: 'messaging',
    title: 'Messaging & Streaming',
    level: 'intermediate',
    badge: 'Async Pipelines',
    icon: '📬',
    description: 'Point-to-point queues, publish-subscribe, append-only event logs, Kafka partition ordering, consumer lag, Change Data Capture (CDC), and outbox patterns.',
    order: 7,
  },
  {
    id: 'reliability',
    title: 'Reliability Engineering',
    level: 'advanced',
    badge: 'Resilience',
    icon: '🛡️',
    description: 'Timeout budgets, exponential backoff with full jitter, circuit breaker state machines, bulkheads, load shedding, graceful degradation, and SLO error budgets.',
    order: 8,
  },
  {
    id: 'scalability',
    title: 'Scalability & Capacity',
    level: 'advanced',
    badge: 'Capacity Math',
    icon: '📈',
    description: 'Traffic estimation, peak QPS multipliers, storage and bandwidth calculations, memory sizing, connection pooling, and Little\'s Law for server capacity.',
    order: 9,
  },
  {
    id: 'hld',
    title: 'High-Level Design (HLD)',
    level: 'intermediate',
    badge: 'Macro Architecture',
    icon: '🏗️',
    description: 'A 12-step architectural blueprint: decomposing requirements into scale budgets, API contracts, data models, resilient topologies, and defensible trade-offs.',
    order: 10,
  },
  {
    id: 'lld',
    title: 'Low-Level Design (LLD)',
    level: 'intermediate',
    badge: 'Object-Oriented',
    icon: '🧩',
    description: 'The 5-step machine coding framework: clarifying requirements, domain entity modeling, SOLID principles, composition over inheritance, and thread safety.',
    order: 11,
  },
  {
    id: 'patterns',
    title: 'Design Patterns',
    level: 'beginner',
    badge: 'Design Patterns',
    icon: '🎯',
    description: 'Problem-driven design patterns: Strategy, State, Observer, Factory, Facade, plus distributed primitives like Circuit Breaker, Saga, and Transactional Outbox.',
    order: 12,
  },
  {
    id: 'machine-coding',
    title: 'Machine Coding',
    level: 'advanced',
    badge: 'Hands-On Code',
    icon: '💻',
    description: '45–60 minute runnable implementations: Multi-Floor Parking Lot, Elevator Controller (SCAN algorithm), LRU + TTL Cache, and Rate Limiter engines.',
    order: 13,
  },
  {
    id: 'security',
    title: 'Security Architecture',
    level: 'advanced',
    badge: 'Zero-Trust',
    icon: '🔒',
    description: 'Authentication tokens, RBAC vs ABAC, OAuth 2.0 / OIDC, secrets rotation, encryption at rest/in transit, threat modeling, tenant isolation, and supply chain security.',
    order: 14,
  },
  {
    id: 'observability',
    title: 'Observability & Operations',
    level: 'advanced',
    badge: 'Telemetry',
    icon: '📊',
    description: 'Structured logging, Prometheus metrics, distributed tracing with correlation IDs, RED & USE operational methods, alerting thresholds, and postmortems.',
    order: 15,
  },
  {
    id: 'cloud',
    title: 'Cloud & Infrastructure',
    level: 'advanced',
    badge: 'Cloud Native',
    icon: '☁️',
    description: 'Regions, Availability Zones, VPC peering, L4/L7 load balancers, managed databases, Kubernetes orchestration concepts, and Infrastructure as Code.',
    order: 16,
  },
  {
    id: 'ai-architecture',
    title: 'AI-Native Architecture',
    level: 'advanced',
    badge: 'Agentic Systems',
    icon: '🤖',
    description: 'Managing non-deterministic LLM runtimes: Reflection, Plan & Solve, Tool Use, Multi-Agent Collaboration (MCP/A2A), HITL gates, and RAG vector search pipelines.',
    order: 17,
  },
  {
    id: 'case-studies',
    title: 'System Design Case Studies',
    level: 'all',
    badge: 'Case Studies',
    icon: '📚',
    description: 'Step-by-step evolutionary architectures from single node to global scale: URL Shortener, Distributed Cache, Real-Time Chat, and Distributed Rate Limiters.',
    order: 18,
  },
  {
    id: 'expert',
    title: 'Staff / Principal Architecture',
    level: 'expert',
    badge: 'Staff Engineer',
    icon: '👑',
    description: 'Architecture Decision Records (ADRs), organizational domain boundaries, migration blueprints, fitness functions, tech debt governance, and reliability economics.',
    order: 19,
  },
];

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'beginner-to-architect',
    title: 'Foundations to Distributed Systems',
    description: 'Start from CPU and network realities, advance through API design, persistent storage, and distributed consensus.',
    badge: 'Foundations',
    targetAudience: 'Software engineers wanting genuine first-principles understanding of distributed architecture.',
    trackIds: ['foundations', 'networking', 'apis', 'databases', 'caching', 'distributed-systems'],
    estimatedHours: 12,
  },
  {
    id: 'hld-mastery',
    title: 'High-Level Design & System Scaling',
    description: 'Master the 12-step HLD framework, capacity estimations, fault tolerance, and comprehensive real-world case studies.',
    badge: 'HLD Track',
    targetAudience: 'Mid to Senior engineers designing high-scale cloud platforms and preparing for architecture interviews.',
    trackIds: ['hld', 'scalability', 'reliability', 'messaging', 'case-studies'],
    estimatedHours: 16,
  },
  {
    id: 'lld-machine-coding',
    title: 'LLD, Patterns & Machine Coding',
    description: 'Master SOLID principles, design patterns, thread safety, and runnable machine-coding implementations in 45–60 minutes.',
    badge: 'LLD & Code',
    targetAudience: 'Engineers preparing for low-level design, clean coding loops, and technical leadership.',
    trackIds: ['lld', 'patterns', 'machine-coding'],
    estimatedHours: 14,
  },
  {
    id: 'agentic-ai-architecture',
    title: 'Agentic AI & Non-Deterministic Systems',
    description: 'Bridge distributed systems with generative AI: Reflection, Plan & Solve, Tool calling, MCP protocols, and RAG vector search pipelines.',
    badge: '2026 AI Native',
    targetAudience: 'Backend and systems architects integrating production LLMs and autonomous agent workflows.',
    trackIds: ['ai-architecture', 'distributed-systems', 'observability'],
    estimatedHours: 10,
  },
  {
    id: 'staff-principal-thinking',
    title: 'Staff / Principal Architecture & Governance',
    description: 'Operate, defend, migrate, and evolve systems over five-year horizons using ADRs, fitness functions, and cost trade-offs.',
    badge: 'Staff / Principal',
    targetAudience: 'Senior engineers stepping into Staff, Principal, and Lead Architect responsibilities.',
    trackIds: ['expert', 'reliability', 'security', 'observability'],
    estimatedHours: 8,
  },
];

export function getTrackById(id: string): LearnTrack | undefined {
  return LEARN_TRACKS.find((track) => track.id === id);
}

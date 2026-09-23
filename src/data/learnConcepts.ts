export interface ConceptItem {
  id: string;
  name: string;
  category: string;
  description: string;
  related: string[];
}

export const LEARN_CONCEPTS: ConceptItem[] = [
  {
    id: 'latency',
    name: 'Latency',
    category: 'Performance',
    description: 'The time required for an operation to complete or for a packet to travel from source to destination.',
    related: ['throughput', 'tail-latency', 'timeouts'],
  },
  {
    id: 'throughput',
    name: 'Throughput (QPS)',
    category: 'Performance',
    description: 'The volume of work, requests, or data processed by a system in a given unit of time.',
    related: ['latency', 'capacity', 'backpressure'],
  },
  {
    id: 'caching',
    name: 'Caching',
    category: 'In-Memory',
    description: 'Storing precomputed or frequently accessed data in fast transient memory to bypass slow persistent disks.',
    related: ['ttl', 'lru', 'cache-invalidation'],
  },
  {
    id: 'sharding',
    name: 'Sharding',
    category: 'Databases',
    description: 'Partitioning a single logical dataset horizontally across multiple autonomous database server instances.',
    related: ['partitioning', 'consistent-hashing', 'hot-partition'],
  },
  {
    id: 'consistent-hashing',
    name: 'Consistent Hashing',
    category: 'Distributed Systems',
    description: 'Mapping keys and nodes onto a circular hash ring so that adding/removing nodes only remaps K/n keys.',
    related: ['sharding', 'virtual-nodes', 'distributed-cache'],
  },
  {
    id: 'consistency',
    name: 'Consistency Models',
    category: 'Distributed Systems',
    description: 'The guarantees a distributed system provides regarding the order and freshness of concurrent reads and writes.',
    related: ['replication', 'quorum', 'cap', 'pacelc'],
  },
  {
    id: 'idempotency',
    name: 'Idempotency',
    category: 'API Design',
    description: 'The property of an operation where executing it multiple times produces the identical side-effect as executing once.',
    related: ['retries', 'payments', 'queues'],
  },
  {
    id: 'backpressure',
    name: 'Backpressure',
    category: 'Reliability',
    description: 'Signaling upstream producers to throttle arrival rates when downstream consumer buffers are saturated.',
    related: ['queues', 'streaming', 'load-shedding'],
  },
  {
    id: 'consensus',
    name: 'Distributed Consensus',
    category: 'Distributed Systems',
    description: 'Achieving agreement on shared state machine logs across untrusted, crash-prone network nodes (Raft/Paxos).',
    related: ['raft', 'paxos', 'leader-election'],
  },
  {
    id: 'solid',
    name: 'SOLID Principles',
    category: 'Low-Level Design',
    description: 'Five design principles for writing modular, maintainable, extensible object-oriented software architectures.',
    related: ['composition', 'interfaces', 'dependency-inversion'],
  },
  {
    id: 'agentic-reflection',
    name: 'Agent Reflection Loop',
    category: 'AI Architecture',
    description: 'A two-stage generator-evaluator loop where an agent autonomously audits and refines its output before responding.',
    related: ['agent-tool-use', 'guardrails', 'evaluation'],
  },
  {
    id: 'agent-tool-use',
    name: 'Agent Tool Calling',
    category: 'AI Architecture',
    description: 'Exposing external deterministic APIs and sandboxed environments to non-deterministic LLMs via typed schemas.',
    related: ['authorization', 'idempotency', 'audit'],
  },
];

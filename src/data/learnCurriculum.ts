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
    title: 'How Computing Works',
    level: 'beginner',
    badge: 'First Principles',
    icon: '⚡',
    description: 'Before you can design systems, you need to understand the machine they run on. Why is RAM 100,000x faster than a hard disk? What does a CPU actually do? What happens when two threads touch the same variable? These aren\'t trivia questions — they\'re the physical laws your architecture has to live inside.',
    order: 1,
  },
  {
    id: 'networking',
    title: 'How Data Travels',
    level: 'beginner',
    badge: 'Packets & Protocols',
    icon: '🌐',
    description: 'Every network request is a tiny miracle. Your data leaves as electrical signals, becomes light pulses, bounces between routers that don\'t know the whole picture, and reassembles perfectly on the other side — usually. Understanding what can go wrong, and why, is the foundation of building systems that work reliably over a network you don\'t control.',
    order: 2,
  },
  {
    id: 'apis',
    title: 'How Services Talk to Each Other',
    level: 'beginner',
    badge: 'Contracts & Communication',
    icon: '🔌',
    description: 'An API is a contract. But contracts can be ambiguous, violated, or misunderstood. Why does REST become awkward at scale? When does the "just use HTTP" approach break down? What does a protocol buffer actually buy you? This track is about understanding communication between services — not just the options, but why each one exists.',
    order: 3,
  },
  {
    id: 'databases',
    title: 'How Databases Actually Work',
    level: 'intermediate',
    badge: 'Storage Internals',
    icon: '💾',
    description: 'Most engineers use databases like black boxes. But the moment your data grows — or your queries slow down — you need to know what\'s inside. How does a B-Tree actually find your row? Why does a `LIKE \'%foo\'` query kill your performance? What does "ACID" mean in practice, not in marketing? Start here to stop guessing.',
    order: 4,
  },
  {
    id: 'caching',
    title: 'Why Fast Systems Cache',
    level: 'intermediate',
    badge: 'Memory Hierarchies',
    icon: '🚀',
    description: 'Caching isn\'t just a performance trick — it\'s a fundamental consequence of the physics of memory. Your CPU L1 cache is 4ns. RAM is 100ns. A network round-trip is 500,000ns. Caching is how systems cope with these gaps. Understanding *why* we cache — not just *how* — makes every caching decision obvious instead of mysterious.',
    order: 5,
  },
  {
    id: 'distributed-systems',
    title: 'When One Machine Isn\'t Enough',
    level: 'intermediate',
    badge: 'Distributed Complexity',
    icon: '📡',
    description: 'The moment you have two machines, everything gets harder. Not because networks are unreliable (though they are) — but because there\'s no shared clock, no atomic state, and no global "now". This track builds deep intuition for the hardest problems in software: partial failures, consensus, and the impossibility results that tell you what you can\'t ever have.',
    order: 6,
  },
  {
    id: 'messaging',
    title: 'Async: When You Can\'t Be Synchronous',
    level: 'intermediate',
    badge: 'Events & Streams',
    icon: '📬',
    description: 'When does a synchronous request-response break down? Why do distributed transactions cause more problems than they solve? What does it actually mean when a message queue "guarantees delivery"? This track unpacks the async world: queues, event logs, CDC, and the profound difference between "at least once" and "exactly once" delivery.',
    order: 7,
  },
  {
    id: 'reliability',
    title: 'How Systems Fail (And Recover)',
    level: 'advanced',
    badge: 'Failure as First-Class',
    icon: '🛡️',
    description: 'Every system eventually fails. The question isn\'t *whether* — it\'s *how gracefully*. What happens to your service when a downstream dependency starts taking 30 seconds instead of 30ms? How do you detect that you\'re failing without making the failure worse? This track treats failure as a first-class engineering concern, not an afterthought.',
    order: 8,
  },
  {
    id: 'scalability',
    title: 'From 100 to 100 Million Users',
    level: 'advanced',
    badge: 'Growth Engineering',
    icon: '📈',
    description: 'Scaling isn\'t magic and it isn\'t just "add more servers." It\'s a series of decisions with real mathematical consequences. How many servers do you actually need? Where will you hit the wall first? How do you estimate this before you\'re already on fire? This track builds the quantitative intuition that separates engineers who design for scale from engineers who react to it.',
    order: 9,
  },
  {
    id: 'hld',
    title: 'Thinking in Systems',
    level: 'intermediate',
    badge: 'Architectural Thinking',
    icon: '🏗️',
    description: 'How do you look at a system you\'ve never seen and quickly understand it? How do you design a system that will still make sense five years from now? This track is about the meta-skill: reading architectures, making trade-offs explicit, decomposing complexity, and reasoning about systems that are too big to hold in one head.',
    order: 10,
  },
  {
    id: 'lld',
    title: 'Writing Code That Grows',
    level: 'intermediate',
    badge: 'Object-Oriented Depth',
    icon: '🧩',
    description: 'Code rots. Every codebase you\'ve worked on has areas you\'re afraid to touch. It doesn\'t have to be this way. SOLID principles aren\'t academic rules — they\'re answers to specific questions like "why does this change break five other things?" and "why is this class untestable?" This track gives those principles real motivation.',
    order: 11,
  },
  {
    id: 'patterns',
    title: 'Patterns as Solutions to Real Problems',
    level: 'beginner',
    badge: 'Design Patterns',
    icon: '🎯',
    description: 'Design patterns have a reputation for being over-engineered jargon. That\'s because they\'re usually taught as a catalog to memorize, not as solutions that emerged from real pain. This track tells the story of each pattern: what problem was making engineers cry before it existed, and why this particular shape of solution emerged.',
    order: 12,
  },
  {
    id: 'machine-coding',
    title: 'Building Real Systems in Code',
    level: 'advanced',
    badge: 'Implementation',
    icon: '💻',
    description: 'Designing a system on a whiteboard is one skill. Implementing it with all the edge cases, concurrency bugs, and real-world constraints is another. This track builds both: starting from requirements, discovering the hard problems as they naturally emerge, and writing clean, correct, concurrent code.',
    order: 13,
  },
  {
    id: 'security',
    title: 'Adversarial Systems Engineering',
    level: 'advanced',
    badge: 'Security Thinking',
    icon: '🔒',
    description: 'Security isn\'t a feature you add at the end. It\'s a different way of thinking about systems: assuming someone intelligent is actively trying to break them. This track builds that adversarial mental model — not as a list of vulnerabilities to patch, but as a systematic way of reasoning about trust, boundaries, and what "verified" actually means.',
    order: 14,
  },
  {
    id: 'observability',
    title: 'Making Systems Legible',
    level: 'advanced',
    badge: 'Observability',
    icon: '📊',
    description: 'A system you can\'t observe is a system you can\'t trust. But observability isn\'t just "add logging everywhere" — it\'s a discipline of asking the right questions before things break, so you have the answers when they do. This track covers what metrics, logs, and traces actually tell you — and more importantly, what they don\'t.',
    order: 15,
  },
  {
    id: 'cloud',
    title: 'What Cloud Actually Gives You',
    level: 'advanced',
    badge: 'Cloud Primitives',
    icon: '☁️',
    description: 'Cloud providers sell managed complexity — you get databases, queues, and compute without thinking about hardware. But every abstraction leaks eventually. Understanding what\'s underneath helps you know when to use the managed version, when to build your own, and why that $3,000 monthly AWS bill suddenly appeared.',
    order: 16,
  },
  {
    id: 'ai-architecture',
    title: 'Integrating Non-Deterministic Systems',
    level: 'advanced',
    badge: 'AI Systems',
    icon: '🤖',
    description: 'LLMs are not just smart APIs. They\'re non-deterministic systems with unbounded latency, unpredictable outputs, and new failure modes that don\'t show up in traditional monitoring. Building reliable software that incorporates AI is a distributed systems problem — this track shows you how to treat it like one.',
    order: 17,
  },
  {
    id: 'case-studies',
    title: 'Full System Deep Dives',
    level: 'all',
    badge: 'End-to-End',
    icon: '📚',
    description: 'Theory becomes real when you trace it through an actual system. These deep dives follow the evolutionary arc of real architectures: from the simplest solution that works, through each scaling crisis and the engineering choice it forced, to the distributed system at the end. The goal isn\'t the final diagram — it\'s understanding every decision along the way.',
    order: 18,
  },
  {
    id: 'expert',
    title: 'Architecture at Depth and at Scale',
    level: 'expert',
    badge: 'Staff+ Engineering',
    icon: '👑',
    description: 'At the staff and principal level, your job isn\'t to write code — it\'s to make good decisions last. This means understanding long-term consequences, writing down your reasoning so future engineers can evaluate it, managing technical debt as a real economic quantity, and knowing when "good enough" is actually better than "perfect".',
    order: 19,
  },
];

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'first-principles-path',
    title: 'First Principles: From Bits to Distributed Systems',
    description: 'Build understanding from the ground up. Start with how computers physically work, follow the journey through networks, APIs, and databases, and arrive at the hard problems of distributed systems — all with deep conceptual grounding, not memorization.',
    badge: 'Start Here',
    targetAudience: 'Engineers who want genuine understanding, not surface-level familiarity.',
    trackIds: ['foundations', 'networking', 'apis', 'databases', 'caching', 'distributed-systems'],
    estimatedHours: 18,
  },
  {
    id: 'systems-at-scale',
    title: 'Systems at Scale: Reliability, Messaging & Growth',
    description: 'For engineers whose systems have outgrown simple architectures. Deep dives into failure modes, async communication, and the mathematics of scaling — with the goal of building systems that degrade gracefully instead of collapsing suddenly.',
    badge: 'Scaling Up',
    targetAudience: 'Mid to senior engineers dealing with real scale problems.',
    trackIds: ['scalability', 'reliability', 'messaging', 'observability', 'case-studies'],
    estimatedHours: 20,
  },
  {
    id: 'code-design-mastery',
    title: 'Code That Ages Well: Design Principles & Patterns',
    description: 'The other half of engineering — the code side. Starting from the real motivation behind SOLID principles, through the patterns that emerged from collective engineering pain, to the concrete skill of building complex systems in code under time constraints.',
    badge: 'Code Craft',
    targetAudience: 'Engineers who want to write code that\'s still maintainable five years from now.',
    trackIds: ['lld', 'patterns', 'machine-coding'],
    estimatedHours: 14,
  },
  {
    id: 'ai-systems-path',
    title: 'AI Systems Engineering',
    description: 'Building reliable systems that incorporate LLMs requires a fresh mental model. Non-determinism, prompt injection, tool boundaries, RAG pipelines, and agentic workflows — approached as distributed systems problems, because that\'s what they are.',
    badge: 'AI Engineering',
    targetAudience: 'Backend engineers integrating AI into production systems.',
    trackIds: ['ai-architecture', 'distributed-systems', 'reliability', 'observability'],
    estimatedHours: 12,
  },
  {
    id: 'staff-thinking',
    title: 'Staff+ Engineering: Decisions That Last',
    description: 'Technical leadership is mostly about making good decisions and recording your reasoning so future engineers can evaluate it. ADRs, architecture reviews, technical debt economics, long-horizon thinking, and the uncomfortable reality that you\'ll be wrong sometimes.',
    badge: 'Staff / Principal',
    targetAudience: 'Senior engineers growing into Staff, Principal, or Architect roles.',
    trackIds: ['expert', 'hld', 'reliability', 'security'],
    estimatedHours: 10,
  },
];

export function getTrackById(id: string): LearnTrack | undefined {
  return LEARN_TRACKS.find((track) => track.id === id);
}

---
id: ai-rag-vector-search-systems
title: "Production RAG Architecture: Vector Databases, Chunking, and Hybrid Search"
track: ai-architecture
module: data-systems
level: advanced
duration: 35
prerequisites: [ai-agents-distributed-systems]
concepts: [rag, vector-database, embeddings, chunking, hybrid-search, reranking, hnsw]
tags: [ai, rag, vector-search, embeddings, architecture, search]
order: 3
---

# Production RAG Architecture: Vector Databases, Chunking, and Hybrid Search

Retrieval-Augmented Generation (RAG) grounds non-deterministic Large Language Models with authoritative external enterprise knowledge, eliminating hallucinations without requiring expensive model fine-tuning.

Building a demo with 10 PDF files in LangChain takes 20 lines of Python. Building a production RAG system that searches across 100,000,000 documents with sub-100ms latency, high precision, and strict user-level access control requires rigorous distributed systems engineering.

---

## 1. The Production RAG Pipeline

```
INGESTION PIPELINE (Offline / Asynchronous)
Document ──► Text Extraction ──► Chunking ──► Embedding Model (e.g., text-embedding-3-small)
                                                    │
                                                    ▼
                                            Vector DB (Pinecone, Qdrant, pgvector)

QUERY PIPELINE (Online / Real-Time)
User Query ──► Query Embedding ──► Hybrid Search (BM25 + Dense Vector) ──► Re-Ranker
                                                                               │
                                                                               ▼ Top K Chunks
User Query + Retrieved Chunks ──► LLM Prompt Context ──► Grounded Response to User
```

---

## 2. Chunking Strategies and Context Preservation

How you split text into discrete embedding chunks dictates retrieval accuracy:
- **Fixed-Size Chunking (e.g. 500 tokens with 50-token overlap)**: Simple, but frequently splits sentences in half or separates a table header from its rows.
- **Hierarchical / Parent-Document Retrieval**:
  - Split documents into tiny child chunks (e.g. 100 tokens) for precise vector search matching.
  - When a child chunk matches the query, retrieve its larger parent section (1,000 tokens) to pass to the LLM prompt, ensuring complete context without semantic fragmentation.

---

## 3. Why Dense Vector Search Fails Alone: The Need for Hybrid Search

Dense embeddings represent high-level conceptual semantics. However, they frequently fail on exact keywords, part numbers, and acronyms:
- If a user searches for *"Error code ERR_SOCKET_4091"*, an embedding model might return general networking articles about TCP sockets because the mathematical vector distance is close, while completely missing the exact technical manual page for error `ERR_SOCKET_4091`.

### Hybrid Search Architecture
Combine two complementary search paradigms using **Reciprocal Rank Fusion (RRF)**:

```
User Query
    │
    ├── 1. Sparse Search (BM25 / Keyword / Full-Text) ──► Ranks exact keyword matches
    │
    └── 2. Dense Vector Search (HNSW Cosine Distance) ──► Ranks semantic conceptual matches
            │
            ▼
    Reciprocal Rank Fusion (RRF) / Cross-Encoder Re-Ranker (e.g. Cohere ReRank)
            │
            ▼
    Precise, Highly Relevant Top 5 Results
```

---

## 4. Vector Indexing: Hierarchical Navigable Small World (HNSW)

Brute-force calculating cosine distance across 10,000,000 1536-dimensional vectors requires seconds of compute. Modern vector databases (Qdrant, Milvus, pgvector) use **Approximate Nearest Neighbor (ANN)** indexing:
- **HNSW (Hierarchical Navigable Small World)**: A multi-layer graph structure where upper layers have long-range skip links (analogous to a SkipList) and lower layers provide dense local connectivity.
- Yields $O(\log N)$ search latency, enabling sub-15ms vector retrieval across millions of items.

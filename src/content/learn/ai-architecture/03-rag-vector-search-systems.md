---
id: ai-architecture-rag
title: "How RAG Systems Work: Retrieval-Augmented Generation"
track: ai-architecture
module: rag-systems
level: advanced
duration: 22
prerequisites: [ai-architecture-distributed-systems]
concepts: [rag, embeddings, vector-search, chunking, retrieval, semantic-similarity, indexing]
tags: [advanced, ai-architecture, rag, embeddings, vector-search, retrieval]
interactive:
  type: rag-pipeline
  enabled: true
order: 3
---

# How RAG Systems Work: Retrieval-Augmented Generation

LLMs have a knowledge cutoff date. They don't know about your company's internal documents, your product catalog, or anything that happened after their training. And even for knowledge they were trained on, they might hallucinate — confidently stating something incorrect.

**RAG (Retrieval-Augmented Generation)** solves both problems: before the LLM generates a response, a retrieval system finds relevant documents and includes them in the prompt. The LLM generates its response based on the retrieved context, not just its training data.

```
User: "What's our refund policy for enterprise customers?"

Step 1 - Retrieve: Search internal docs → find "Enterprise Refund Policy v3.2"
Step 2 - Augment: Add the document to the LLM prompt as context
Step 3 - Generate: LLM answers based on the actual policy document
```

The response is grounded in real, retrievable documents — not hallucinated from training data.

---

## How Embeddings Work

The core technology enabling RAG is **vector embeddings**: converting text into numerical vectors that capture semantic meaning.

An embedding model (like OpenAI's text-embedding-3-small) converts a chunk of text into a vector of ~1536 numbers. Texts with similar meanings produce vectors that are close together in vector space.

```
"refund policy for enterprise"     → [0.12, -0.34, 0.56, ...]
"return guidelines for business"   → [0.11, -0.33, 0.55, ...]  ← similar!
"weather forecast for tomorrow"    → [-0.87, 0.42, -0.19, ...]  ← very different
```

**Cosine similarity** measures the angle between two vectors. Similar texts have cosine similarity close to 1.0. Unrelated texts have similarity close to 0.0.

This is fundamentally different from keyword search. A keyword search for "refund" wouldn't find a document that says "return and exchange policy" — different words, same meaning. Embedding-based search would find it because the vectors are similar.

---

## The RAG Pipeline

**Step 1: Document Ingestion (offline)**

Take your documents (PDFs, web pages, database records) and prepare them:

1. **Chunk**: Split documents into smaller pieces (typically 200-500 tokens each). An entire 50-page PDF is too much context for an LLM — you need the relevant paragraph, not the whole document.

2. **Embed**: Convert each chunk into a vector using an embedding model.

3. **Index**: Store the vectors in a vector database (Pinecone, Weaviate, Qdrant, pgvector) that supports fast similarity search.

**Step 2: Query (online)**

When a user asks a question:

1. **Embed the query**: Convert the user's question into a vector using the same embedding model.

2. **Search**: Find the K most similar document chunks by querying the vector database (typically K=5 to K=20).

3. **Construct prompt**: Insert the retrieved chunks into the LLM prompt as context.

4. **Generate**: The LLM generates a response grounded in the retrieved documents.

```python
def rag_query(user_question: str) -> str:
    # Embed the question
    query_embedding = embedding_model.embed(user_question)
    
    # Find similar chunks
    results = vector_db.search(query_embedding, top_k=5)
    
    # Build prompt with context
    context = "\n---\n".join([r.text for r in results])
    prompt = f"""Answer the question based on the following context.
    
Context:
{context}

Question: {user_question}

Answer:"""
    
    return llm.generate(prompt)
```

---

## Chunking: The Most Underrated Design Decision

How you split documents into chunks dramatically affects retrieval quality.

**Fixed-size chunks** (e.g., 500 tokens each): Simple, but might split a paragraph mid-sentence, losing context.

**Semantic chunks**: Split at natural boundaries (paragraphs, sections, headings). Preserves the logical structure of the document.

**Overlapping chunks**: Each chunk overlaps with the previous one by some amount (e.g., 50 tokens). This ensures that information at chunk boundaries isn't lost.

**Hierarchical chunks**: Create chunks at multiple granularities — paragraphs within sections within documents. Search at the paragraph level but include the section context for the LLM.

In practice, semantic chunking with overlap produces the best results for most use cases.

---

## When RAG Falls Short

RAG is powerful but not a silver bullet:

**Multi-hop reasoning**: "What products did our top 3 customers by revenue purchase last quarter?" requires retrieving customer revenue data, identifying the top 3, then retrieving their purchase history. A single retrieval step won't capture this — you need iterative retrieval or a structured query pipeline.

**Numerical reasoning**: "What was our average order value last month?" requires aggregating data, not retrieving a document. RAG is for finding relevant text, not for computation. Use SQL for analytical queries.

**Freshness**: The vector index reflects the documents at the time of ingestion. If a document is updated, the index must be re-ingested. Set up an incremental ingestion pipeline that detects and re-processes changed documents.

**Retrieval quality**: If the retrieval step returns irrelevant chunks, the LLM generates a response based on irrelevant context — which might look correct but isn't. Monitoring retrieval relevance is critical.

---

## Hybrid Search: The Best of Both Worlds

Pure vector search sometimes misses exact keyword matches. Pure keyword search misses semantic matches. **Hybrid search** combines both:

1. Run a vector similarity search (semantic matching)
2. Run a keyword search (BM25, exact term matching)
3. Combine results using reciprocal rank fusion or weighted scoring

Most production RAG systems use hybrid search. It catches both the "semantically similar but different words" cases (vector search) and the "exact term must be present" cases (keyword search).

Vector databases like Weaviate and Elasticsearch support hybrid search natively.

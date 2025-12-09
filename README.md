
# Consistent Hashing for AI Caching and Sharding (Exercise 2)

This repository implements **Exercise 2: Consistent Hashing for AI Caching and Sharding** using **TypeScript**.

The goal is to design and implement a **ConsistentHasher** component that can:

- Distribute keys (e.g. `userId`, `embeddingId`, `modelArtifactId`) across multiple **nodes/shards**
- Support **elasticity**: adding/removing nodes with **minimal key remapping**
- Provide **even load distribution**
- Achieve **O(log N)** lookup times
- Fit naturally into **AI infrastructure** such as vector databases, feature stores, model response caches, and model artifact storage

---

# 1. Why Exercise 2?

Out of the three exercises, this one is:

- The easiest to implement end-to-end in the time available
- Demonstrates system design skills
- Shows understanding of distributed systems
- Maps directly to real AI infrastructure patterns (vector DB, embedding stores, caching layers, artifact sharding)
- Requires no frontend, backend, or concurrency handling

This README covers:

- **Phase 1: Design**
- **Phase 2: Implementation**
- Architecture diagrams
- Test strategy and execution steps

---

# 2. Phase 1 — High-Level Design

## 2.1 Problem Context

AI workloads often require large-scale distributed systems.

Examples:

### ✔️ Vector Databases (FAISS, Milvus, Weaviate)
Store billions of embeddings across multiple shards.

### ✔️ Model Response Caches for LLMs
Cache expensive inference results like:

```
cacheKey = modelId + ":" + hash(prompt)
```

### ✔️ Model Artifact / Checkpoint Storage
Sharding checkpoints, LoRA adapters, or dataset chunks across machines.

In all these cases, we need a strategy to:

- Distribute keys across nodes
- Handle scale-out and node removal
- Avoid remapping all data when the cluster size changes

---

## 2.2 Why Consistent Hashing?

Naive approach:

```
shard = hash(key) % N
```

Problem:  
When N changes (e.g., adding 1 node), **almost all keys move**, destroying cache locality and forcing massive data movement.

Consistent hashing solves this:

- Nodes and keys are placed on a **hash ring**
- A key maps to the **first node clockwise**
- Adding or removing a node only affects keys in its neighborhood
- Typically **only ~1/(N+1)** keys move

---

## 2.3 Architecture Diagram

### 2.3.1 Logical Ring Layout

```
          (Node A#7)
              |
   (Node C#2) |      (Node B#5)
        \     |     /
         \    |    /
          \   |   /
----------- (keyHash) -------------
                                              (Node D#3)
```

- Each physical node (A/B/C/D) is represented by many **virtual nodes** (`A#1`, `A#2`, ...)
- Keys are placed on the ring using their hash
- Assigned node = next virtual node clockwise

---

## 2.4 Virtual Nodes (Replicas)

Without virtual nodes, hash positions may cluster unevenly → hot spots.

Instead, we assign multiple positions per node:

```
Node A → A#0, A#1, ... A#99
```

Benefits:

- Highly even load distribution
- Smooth scaling
- Lower variance even with random hashing

---

## 2.5 Core Data Structures

| Structure | Purpose |
|----------|----------|
| `sortedHashes: number[]` | Sorted list of all virtual node positions |
| `ring: Map<number, string>` | Maps hash position → nodeId |
| `nodePositions: Map<string, number[]>` | Track replica positions for node removal |

Lookup is:

1. Hash the key
2. Binary search in `sortedHashes` (O(log N))
3. Wrap around ring if needed
4. Return mapped node

---

## 2.6 AI-Specific Use Cases

### Vector DB Sharding
```ts
const node = hasher.getNode(embeddingId);
```
Distribute embeddings across shards with minimal movement.

### Model Response Cache
```ts
const node = hasher.getNode(modelId + ":" + promptHash);
```
Protect GPUs by preventing cache invalidation during scaling.

### Model Artifact Storage
```ts
const node = hasher.getNode(modelArtifactId);
```
Evenly distribute checkpoints or LoRA adapters.

---

# 3. Phase 2 — Implementation

The full implementation is found in:

```
src/consistentHasher.ts
src/demo.ts
src/consistentHasher.test.ts
```

---

# 4. Running the Project

## 4.1 Install dependencies

```bash
npm install
```

If starting from scratch:

```bash
npm install --save-dev typescript ts-node @types/node
npx tsc --init
```

---

## 4.2 Run the demo

```bash
npm run demo
```

Example output:

```
=== After adding A ===
{ A: 1000 }

=== After adding B and C ===
{ A: 330, B: 340, C: 330 }

=== After adding D ===
{ A: 250, B: 260, C: 240, D: 250 }

=== After removing B ===
{ A: 360, C: 330, D: 310 }
```

Interpretation:

- Single node → all keys map to A  
- Multiple nodes → balanced distribution  
- Adding a node → only part of keys move  
- Removing a node → only that node's keys remap

This demonstrates correct consistent hashing behavior.

---

# 5. Test Suite

The tests are located in:

```
src/consistentHasher.test.ts
```

Run tests:

```bash
npm test
```

Expected test output:

```
🎉 All tests passed
```

---

# 6. Summary

This assignment demonstrates:

- Strong understanding of **consistent hashing**
- Clean TypeScript implementation
- Practical AI infrastructure application
- Testing & validation of key behaviors
- Clear design documentation & architecture diagrams

The `ConsistentHasher` implemented here is suitable as a foundational building block in:

- Large-scale AI embedding stores  
- Distributed inference caches  
- Model artifact and checkpoint storage systems  
- Multi-tenant feature stores  

---

# 🎉 End of README

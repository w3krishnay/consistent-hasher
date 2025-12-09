import * as crypto from "crypto";

/**
 * ConsistentHasher
 *
 * - Maintains a hash ring with virtual nodes for each physical node (shard).
 * - Supports addNode, removeNode, and getNode(key) operations.
 * - Uses a sorted array for ring positions + binary search => O(log N) lookup.
 *
 * AI Context:
 * - Can be used to shard:
 *   - vector embeddings across multiple vector DB nodes,
 *   - model response cache entries across cache servers,
 *   - model artifacts (checkpoints, LoRA adapters) across storage nodes.
 */
export class ConsistentHasher {
  // Number of virtual nodes per physical node
  private replicas: number;

  // Map: ring position (hash) -> nodeId
  private ring: Map<number, string> = new Map();

  // Sorted list of all ring positions (hashes)
  private sortedHashes: number[] = [];

  // Map: nodeId -> list of hash positions (for easy removal)
  private nodePositions: Map<string, number[]> = new Map();

  constructor(replicas: number = 100) {
    if (replicas <= 0) {
      throw new Error("replicas must be > 0");
    }
    this.replicas = replicas;
  }

  /**
   * Hash function using MD5:
   * - Converts arbitrary string into a 32-bit unsigned integer.
   * - Not for security, just for even distribution on the ring.
   */
  private hashFn(value: string): number {
    const hash = crypto.createHash("md5").update(value).digest();
    // Use the first 4 bytes as a 32-bit unsigned integer
    return hash.readUInt32BE(0);
  }

  /**
   * Binary search to find the index of the first hash >= target.
   * If all hashes are < target, returns sortedHashes.length (caller will wrap to 0).
   */
  private findFirstGreaterOrEqual(target: number): number {
    let low = 0;
    let high = this.sortedHashes.length - 1;
    let result = this.sortedHashes.length; // default: not found, wrap

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = this.sortedHashes[mid];
      if (midVal === undefined) {
        throw new Error("Unexpected state: midVal is undefined");
      }
      if (midVal >= target) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return result;
  }

  /**
   * Insert a hash into sortedHashes, keeping it sorted.
   */
  private insertHashPosition(pos: number) {
    const idx = this.findFirstGreaterOrEqual(pos);
    this.sortedHashes.splice(idx, 0, pos);
  }

  /**
   * Remove a hash from sortedHashes.
   */
  private removeHashPosition(pos: number) {
    const idx = this.findFirstGreaterOrEqual(pos);
    if (idx < this.sortedHashes.length && this.sortedHashes[idx] === pos) {
      this.sortedHashes.splice(idx, 1);
    }
  }

  /**
   * Adds a new physical node (shard) to the hash ring, along with its virtual nodes.
   */
  addNode(nodeId: string): void {
    if (this.nodePositions.has(nodeId)) {
      throw new Error(`Node '${nodeId}' already exists`);
    }

    const positions: number[] = [];

    for (let i = 0; i < this.replicas; i++) {
      const replicaKey = `${nodeId}#${i}`; // virtual node id
      let pos = this.hashFn(replicaKey);

      // Handle rare collisions by linear probing
      while (this.ring.has(pos)) {
        pos = (pos + 1) >>> 0;
      }

      this.ring.set(pos, nodeId);
      this.insertHashPosition(pos);
      positions.push(pos);
    }

    this.nodePositions.set(nodeId, positions);
  }

  /**
   * Removes a physical node (and all its virtual nodes) from the hash ring.
   */
  removeNode(nodeId: string): void {
    const positions = this.nodePositions.get(nodeId);
    if (!positions) {
      // Node not present; nothing to do
      return;
    }

    for (const pos of positions) {
      this.ring.delete(pos);
      this.removeHashPosition(pos);
    }

    this.nodePositions.delete(nodeId);
  }

  /**
   * Given a key (e.g. userId, embeddingId, cache key), returns the nodeId
   * responsible for that key according to the consistent hashing ring.
   */
  getNode(key: string): string {
    if (this.sortedHashes.length === 0) {
      throw new Error("No nodes in the ring");
    }

    const keyHash = this.hashFn(key);
    let idx = this.findFirstGreaterOrEqual(keyHash);

    // Wrap around if needed (end of ring ⇒ go to first position)
    if (idx === this.sortedHashes.length) {
      idx = 0;
    }

    const ringHash = this.sortedHashes[idx];
    if (ringHash === undefined) {
      throw new Error("Unexpected ring state: ringHash undefined");
    }
    const nodeId = this.ring.get(ringHash);
    if (!nodeId) {
      throw new Error("Inconsistent ring state: hash exists in list but not in map");
    }

    return nodeId;
  }

  /**
   * Helper: list all physical nodes currently in the ring.
   */
  getNodes(): string[] {
    return Array.from(this.nodePositions.keys());
  }
}

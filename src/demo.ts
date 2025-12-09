import { ConsistentHasher } from "./consistentHasher";

// Helper to count how many keys go to each node
function simulateDistribution(hasher: ConsistentHasher, label: string) {
  const counts: Record<string, number> = {};
  const keysToTest = 1000;

  for (let i = 0; i < keysToTest; i++) {
    const key = `key-${i}`;
    const node = hasher.getNode(key);
    counts[node] = (counts[node] || 0) + 1;
  }

  console.log(`\n=== ${label} ===`);
  console.log("Nodes:", hasher.getNodes());
  console.log("Key distribution:", counts);
}

function main() {
  const hasher = new ConsistentHasher(100); // 100 virtual nodes per physical node

  // 1. One node: all keys map there
  hasher.addNode("A");
  simulateDistribution(hasher, "After adding A");

  // 2. Add more nodes: keys spread across them
  hasher.addNode("B");
  hasher.addNode("C");
  simulateDistribution(hasher, "After adding B and C");

  // 3. Add a fourth node: a subset of keys move to D, but distribution becomes more balanced
  hasher.addNode("D");
  simulateDistribution(hasher, "After adding D");

  // 4. Remove a node: only keys that were on B move to the remaining nodes
  hasher.removeNode("B");
  simulateDistribution(hasher, "After removing B");
}

main();

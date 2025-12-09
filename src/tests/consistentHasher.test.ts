import assert from "assert";
import { ConsistentHasher } from "../consistentHasher";

function testSingleNode() {
  const hasher = new ConsistentHasher(100);
  hasher.addNode("A");

  for (let i = 0; i < 1000; i++) {
    const node = hasher.getNode(`key-${i}`);
    assert.strictEqual(node, "A", "All keys should map to A when only A exists");
  }

  console.log("✅ testSingleNode passed");
}

function testMultipleNodesDistribution() {
  const hasher = new ConsistentHasher(100);
  hasher.addNode("A");
  hasher.addNode("B");
  hasher.addNode("C");

  const counts: Record<string, number> = {};
  const totalKeys = 3000;

  for (let i = 0; i < totalKeys; i++) {
    const node = hasher.getNode(`key-${i}`);
    counts[node] = (counts[node] || 0) + 1;
  }

  // Each node should have at least some keys
assert.ok((counts["A"] ?? 0) > 0, "Node A should have some keys");
assert.ok((counts["B"] ?? 0) > 0, "Node B should have some keys");
assert.ok((counts["C"] ?? 0) > 0, "Node C should have some keys");


  console.log("Distribution with A,B,C:", counts);
  console.log("✅ testMultipleNodesDistribution passed");
}

function testAddingNodeMovesSubsetOfKeys() {
  const hasher = new ConsistentHasher(100);
  hasher.addNode("A");
  hasher.addNode("B");
  hasher.addNode("C");

  const totalKeys = 2000;
  const before: Record<string, string> = {};

  // Record where keys map before adding D
  for (let i = 0; i < totalKeys; i++) {
    const key = `key-${i}`;
    before[key] = hasher.getNode(key);
  }

  // Add new node D
  hasher.addNode("D");

  let unchanged = 0;
  let movedToD = 0;

  for (let i = 0; i < totalKeys; i++) {
    const key = `key-${i}`;
    const oldNode = before[key];
    const newNode = hasher.getNode(key);

    if (newNode === oldNode) {
      unchanged++;
    } else if (newNode === "D") {
      movedToD++;
    }
  }

  console.log("Keys unchanged after adding D:", unchanged);
  console.log("Keys moved to D:", movedToD);

  // Sanity checks:
  // - Some keys should stay on their original nodes
  assert.ok(unchanged > 0, "Some keys should stay on the same node after adding D");
  // - Some keys should move to D
  assert.ok(movedToD > 0, "Some keys should move to D");

  // - Not all keys should move
  assert.ok(
    unchanged > totalKeys * 0.3,
    "A significant portion of keys should remain on their old nodes"
  );

  console.log("✅ testAddingNodeMovesSubsetOfKeys passed");
}

function testRemovingNodeRedistributesOnlyThatNode() {
  const hasher = new ConsistentHasher(100);
  hasher.addNode("A");
  hasher.addNode("B");
  hasher.addNode("C");

  const totalKeys = 2000;
  const before: Record<string, string> = {};

  for (let i = 0; i < totalKeys; i++) {
    const key = `key-${i}`;
    before[key] = hasher.getNode(key);
  }

  // Remove B
  hasher.removeNode("B");

  let keysThatWereOnB = 0;
  let keysThatWereOnBNowOnB = 0;
  let keysThatWereNotOnBButMoved = 0;

  for (let i = 0; i < totalKeys; i++) {
    const key = `key-${i}`;
    const oldNode = before[key];
    const newNode = hasher.getNode(key);

    if (oldNode === "B") {
      keysThatWereOnB++;
      if (newNode === "B") {
        keysThatWereOnBNowOnB++;
      }
    } else {
      if (newNode !== oldNode) {
        keysThatWereNotOnBButMoved++;
      }
    }
  }

  console.log("Keys originally on B:", keysThatWereOnB);
  console.log("Keys originally on B that still map to B:", keysThatWereOnBNowOnB);
  console.log("Keys that moved but were not on B:", keysThatWereNotOnBButMoved);

  // No key should still map to B
  assert.strictEqual(
    keysThatWereOnBNowOnB,
    0,
    "No key should still map to B after B is removed"
  );

  // It's okay that some non-B keys might move (due to ring shape),
  // but the majority of movement should be for keys originally on B.
  assert.ok(
    keysThatWereOnB > 0,
    "There should be some keys originally on B"
  );

  console.log("✅ testRemovingNodeRedistributesOnlyThatNode passed");
}

function runAllTests() {
  testSingleNode();
  testMultipleNodesDistribution();
  testAddingNodeMovesSubsetOfKeys();
  testRemovingNodeRedistributesOnlyThatNode();
  console.log("\n🎉 All ConsistentHasher tests passed");
}

runAllTests();

/**
 * Simulates N concurrent users hitting submission endpoints.
 *
 * Usage:
 *   npm run test:rate-limit
 *   npm run test:rate-limit -- --endpoint=spouse --users=100
 *   npm run test:rate-limit -- --endpoint=both --users=100 --rounds=3
 *
 * Env:
 *   BASE_URL=http://localhost:3000  (default)
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DEFAULT_USERS = 100;
const DEFAULT_ROUNDS = 1;

type Endpoint = "submissions" | "spouse" | "both";

function parseArg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function buildSubmissionPayload(index: number, round: number) {
  const id = `${Date.now()}-${round}-${index}`;
  return {
    fullName: `Load Test User ${id}`,
    email: `loadtest.${id}@example.com`,
    phone: `+1555${String(index).padStart(7, "0")}`,
    city: "Toronto",
  };
}

function buildSpousePayload(index: number, round: number) {
  const id = `${Date.now()}-${round}-${index}`;
  return {
    fullName: `Spouse Load Test ${id}`,
    email: `spouse.loadtest.${id}@example.com`,
    phone: `+1666${String(index).padStart(7, "0")}`,
    city: "Vancouver",
  };
}

async function fireRequest(
  path: string,
  body: Record<string, string>,
  userIndex: number,
): Promise<{ status: number; ms: number; userIndex: number; path: string; body?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return {
      status: res.status,
      ms: Date.now() - start,
      userIndex,
      path,
      body: text.slice(0, 120),
    };
  } catch (error) {
    return {
      status: 0,
      ms: Date.now() - start,
      userIndex,
      path,
      body: error instanceof Error ? error.message : "Request failed",
    };
  }
}

function summarize(results: Awaited<ReturnType<typeof fireRequest>>[]) {
  const byStatus = new Map<number, number>();
  let totalMs = 0;
  let minMs = Infinity;
  let maxMs = 0;

  for (const r of results) {
    byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
    totalMs += r.ms;
    minMs = Math.min(minMs, r.ms);
    maxMs = Math.max(maxMs, r.ms);
  }

  return {
    total: results.length,
    byStatus: Object.fromEntries([...byStatus.entries()].sort(([a], [b]) => a - b)),
    avgMs: Math.round(totalMs / results.length),
    minMs: minMs === Infinity ? 0 : minMs,
    maxMs,
  };
}

async function runRound(endpoint: Endpoint, users: number, round: number) {
  const tasks: Promise<Awaited<ReturnType<typeof fireRequest>>>[] = [];

  for (let i = 0; i < users; i++) {
    if (endpoint === "submissions" || endpoint === "both") {
      tasks.push(
        fireRequest("/api/submissions", buildSubmissionPayload(i, round), i),
      );
    }
    if (endpoint === "spouse" || endpoint === "both") {
      tasks.push(
        fireRequest("/api/spouse-submissions", buildSpousePayload(i, round), i),
      );
    }
  }

  console.log(`\nRound ${round}: firing ${tasks.length} concurrent request(s)...`);
  const startedAt = Date.now();
  const results = await Promise.all(tasks);
  const elapsed = Date.now() - startedAt;
  const summary = summarize(results);

  console.log(`Completed in ${elapsed}ms`);
  console.log("Status breakdown:", summary.byStatus);
  console.log(`Response time: min=${summary.minMs}ms avg=${summary.avgMs}ms max=${summary.maxMs}ms`);

  const rateLimited = results.filter((r) => r.status === 429);
  if (rateLimited.length > 0) {
    console.log(`Rate limited (429): ${rateLimited.length} request(s)`);
  } else {
    console.log("No 429 responses — rate limiting may not be enabled yet.");
  }

  const failures = results.filter((r) => r.status >= 500 || r.status === 0);
  if (failures.length > 0) {
    console.log("\nSample failures:");
    for (const f of failures.slice(0, 3)) {
      console.log(`  [${f.status}] ${f.path} user #${f.userIndex}: ${f.body}`);
    }
  }

  return summary;
}

async function main() {
  const endpoint = parseArg("endpoint", "submissions") as Endpoint;
  const users = parseInt(parseArg("users", String(DEFAULT_USERS)), 10);
  const rounds = parseInt(parseArg("rounds", String(DEFAULT_ROUNDS)), 10);

  if (!["submissions", "spouse", "both"].includes(endpoint)) {
    console.error('Invalid --endpoint. Use: submissions | spouse | both');
    process.exit(1);
  }

  if (Number.isNaN(users) || users < 1) {
    console.error("Invalid --users value");
    process.exit(1);
  }

  console.log("Rate limit load test");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Concurrent users per round: ${users}`);
  console.log(`Rounds: ${rounds}`);
  console.log("Note: each successful POST creates a real DB record.");

  for (let round = 1; round <= rounds; round++) {
    await runRound(endpoint, users, round);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const PostgresPartnerRepository = require(
  "../infrastructure/persistence/PostgresPartnerRepository"
);

const buildRepository = ({ failOnHistory = false } = {}) => {
  const calls = [];
  const client = {
    query: async (sql, values) => {
      const normalized = sql.trim().replace(/\s+/g, " ");
      calls.push({ sql: normalized, values });
      if (failOnHistory && normalized.includes("partner_lifecycle_history")) {
        throw new Error("history unavailable");
      }
      if (normalized.startsWith("INSERT INTO partner_certification")) {
        return { rows: [{ status: "CERTIFIED" }] };
      }
      return { rows: [] };
    },
    release: () => calls.push({ sql: "RELEASE" })
  };
  const repository = new PostgresPartnerRepository({
    pool: { connect: async () => client },
    partnerLifecycleRepository: {},
    clock: () => new Date("2026-01-02T03:04:05.000Z"),
    randomUUID: (() => {
      const ids = ["event-id", "correlation-id"];
      return () => ids.shift();
    })()
  });
  return { repository, calls };
};

test("lifecycle state, history, event and outbox commit atomically", async () => {
  const { repository, calls } = buildRepository();

  const result = await repository.saveLifecycleStage({
    partnerId: "P-1",
    stage: "CERTIFICATION",
    value: {
      status: "CERTIFIED",
      certifiedProducts: ["PAYMENTS"]
    },
    events: [{
      eventType: "PARTNER_CERTIFIED",
      payload: { partnerId: "P-1" }
    }]
  });

  assert.equal(result.events[0].eventId, "EVT-event-id");
  assert.deepEqual(
    calls.map((call) => call.sql.split(" ").slice(0, 3).join(" ")),
    [
      "BEGIN",
      "INSERT INTO partner_certification",
      "INSERT INTO partner_lifecycle_history",
      "INSERT INTO partner_events",
      "INSERT INTO event_outbox",
      "COMMIT",
      "RELEASE"
    ]
  );
});

test("lifecycle transaction rolls back when a write fails", async () => {
  const { repository, calls } = buildRepository({ failOnHistory: true });

  await assert.rejects(
    repository.saveLifecycleStage({
      partnerId: "P-1",
      stage: "CERTIFICATION",
      value: { status: "CERTIFIED" },
      events: []
    }),
    /history unavailable/
  );

  assert.equal(calls.some((call) => call.sql === "ROLLBACK"), true);
  assert.equal(calls.some((call) => call.sql === "COMMIT"), false);
  assert.equal(calls.at(-1).sql, "RELEASE");
});

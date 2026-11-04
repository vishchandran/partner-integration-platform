const test = require("node:test");
const assert = require("node:assert/strict");
const PartnerApplicationService = require("../application/partner/PartnerApplicationService");

const buildService = ({ partner, savedCertification } = {}) => {
  const published = [];
  const audits = [];
  const persistedEvent = {
    eventId: "EVT-1",
    eventType: "PARTNER_CERTIFIED",
    payload: { partnerId: "P-1" }
  };
  const service = new PartnerApplicationService({
    partnerRepository: {
      findById: async () => partner,
      getLifecycle: async () => ({ testing_status: "PASSED" }),
      saveLifecycleStage: async ({ events }) => ({
        state: savedCertification,
        events: events.length > 0 ? [persistedEvent] : []
      })
    },
    auditRepository: {
      append: (...args) => audits.push(args)
    },
    eventDispatcher: {
      dispatch: async (...args) => published.push(args)
    }
  });

  return { service, published, audits };
};

test("application service does not publish certification event for in-review update", async () => {
  const { service, published, audits } = buildService({
    partner: { partner_id: "P-1" },
    savedCertification: { status: "IN_REVIEW" }
  });

  await service.updateCertificationStatus("P-1", { status: "IN_REVIEW" });

  assert.deepEqual(published, []);
  assert.equal(audits.length, 1);
});

test("application dispatches a certified event after repository persistence", async () => {
  const order = [];
  const service = new PartnerApplicationService({
    partnerRepository: {
      findById: async () => ({ partner_id: "P-1" }),
      getLifecycle: async () => ({ testing_status: "PASSED" }),
      saveLifecycleStage: async () => {
        order.push("committed");
        return {
          state: { status: "CERTIFIED" },
          events: [{ eventId: "EVT-1" }]
        };
      }
    },
    auditRepository: { append: () => order.push("audited") },
    eventDispatcher: { dispatch: async () => order.push("dispatched") }
  });

  await service.updateCertificationStatus("P-1", {
    status: "CERTIFIED",
    approver: "Reviewer",
    certifiedProducts: ["PAYMENTS"]
  });

  assert.deepEqual(order, ["committed", "audited", "dispatched"]);
});

test("application service returns null for an unknown partner", async () => {
  const { service, published, audits } = buildService();

  const result = await service.updateCertificationStatus(
    "missing",
    { status: "CERTIFIED" }
  );

  assert.equal(result, null);
  assert.deepEqual(published, []);
  assert.deepEqual(audits, []);
});

test("application rejects an unmet prerequisite before persistence", async () => {
  let persisted = false;
  const service = new PartnerApplicationService({
    partnerRepository: {
      findById: async () => ({ partner_id: "P-1" }),
      getLifecycle: async () => ({ connectivity_status: "PENDING" }),
      saveLifecycleStage: async () => {
        persisted = true;
      }
    },
    auditRepository: { append: () => {} },
    eventDispatcher: { dispatch: async () => {} }
  });

  await assert.rejects(
    service.updateTestingStatus("P-1", {
      status: "IN_PROGRESS"
    }),
    /Connectivity must be completed before testing/
  );
  assert.equal(persisted, false);
});

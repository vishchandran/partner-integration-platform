const test = require("node:test");
const assert = require("node:assert/strict");
const lifecycle = require("../domain/partner/partnerLifecycle");

test("new partners start in requested status", () => {
  assert.deepEqual(
    lifecycle.createPartner({
      partnerId: "P-1",
      partnerName: "Partner One",
      requestedProducts: ["PAYMENTS"]
    }),
    {
      partnerId: "P-1",
      partnerName: "Partner One",
      status: "REQUESTED",
      requestedProducts: ["PAYMENTS"]
    }
  );
});

test("certification event is raised only for certified status", () => {
  assert.equal(
    lifecycle.recordCertification("P-1", { status: "IN_REVIEW" }).events.length,
    0
  );

  assert.deepEqual(
    lifecycle.recordCertification("P-1", {
      status: "CERTIFIED",
      certifiedProducts: ["PAYMENTS"]
    }).events,
    [{
      eventType: "PARTNER_CERTIFIED",
      payload: {
        partnerId: "P-1",
        certifiedProducts: ["PAYMENTS"]
      }
    }]
  );
});

test("go-live event is raised only for ready status", () => {
  assert.equal(
    lifecycle.recordGoLive("P-1", { status: "PENDING" }).events.length,
    0
  );
  assert.equal(
    lifecycle.recordGoLive("P-1", { status: "READY" }).events.length,
    1
  );
});

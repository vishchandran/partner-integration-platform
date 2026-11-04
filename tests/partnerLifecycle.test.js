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
    lifecycle.recordCertification("P-1", { status: "IN_REVIEW" }, {}).events.length,
    0
  );

  assert.deepEqual(
    lifecycle.recordCertification("P-1", {
      status: "CERTIFIED",
      certifiedProducts: ["PAYMENTS"],
      approver: "Reviewer"
    }, { testing_status: "PASSED" }).events,
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
    lifecycle.recordGoLive("P-1", { status: "PENDING" }, {}).events.length,
    0
  );
  assert.equal(
    lifecycle.recordGoLive("P-1", {
      status: "READY",
      businessApproval: true,
      technologyApproval: true,
      operationsApproval: true,
      rollbackPlanReady: true
    }, { certification_status: "CERTIFIED" }).events.length,
    1
  );
});

test("testing requires completed connectivity", () => {
  assert.throws(
    () => lifecycle.recordTesting(
      { status: "IN_PROGRESS" },
      { connectivity_status: "PENDING" }
    ),
    /Connectivity must be completed before testing/
  );
});

test("passed testing requires consistent successful metrics", () => {
  assert.throws(
    () => lifecycle.recordTesting({
      status: "PASSED",
      totalTestCases: 10,
      passed: 9,
      failed: 1,
      blocked: 0
    }, { connectivity_status: "COMPLETED" }),
    /no failed or blocked cases/
  );
});

test("certification requires passed testing, an approver, and products", () => {
  assert.throws(
    () => lifecycle.recordCertification("P-1", {
      status: "CERTIFIED",
      certifiedProducts: ["PAYMENTS"],
      approver: "Reviewer"
    }, { testing_status: "FAILED" }),
    /Testing must pass before certification/
  );
  assert.throws(
    () => lifecycle.recordCertification("P-1", {
      status: "CERTIFIED",
      certifiedProducts: []
    }, { testing_status: "PASSED" }),
    /approver is required/
  );
});

test("go-live readiness requires certification, approvals, and rollback plan", () => {
  const ready = {
    status: "READY",
    businessApproval: true,
    technologyApproval: true,
    operationsApproval: true,
    rollbackPlanReady: true
  };
  assert.throws(
    () => lifecycle.recordGoLive(
      "P-1",
      ready,
      { certification_status: "IN_REVIEW" }
    ),
    /Certification must be completed/
  );
  assert.throws(
    () => lifecycle.recordGoLive(
      "P-1",
      { ...ready, rollbackPlanReady: false },
      { certification_status: "CERTIFIED" }
    ),
    /requires all approvals/
  );
});

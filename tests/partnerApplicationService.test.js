const test = require("node:test");
const assert = require("node:assert/strict");
const PartnerApplicationService = require("../application/partner/PartnerApplicationService");

const buildService = ({ partner, savedCertification } = {}) => {
  const published = [];
  const audits = [];
  const service = new PartnerApplicationService({
    partnerRepository: {
      findById: async () => partner,
      saveCertification: async () => savedCertification
    },
    auditRepository: {
      append: (...args) => audits.push(args)
    },
    eventPublisher: {
      publish: async (...args) => published.push(args)
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

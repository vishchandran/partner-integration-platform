const PartnerApplicationService = require("../application/partner/PartnerApplicationService");
const PostgresPartnerRepository = require("../infrastructure/persistence/PostgresPartnerRepository");
const InMemoryAuditRepository = require("../infrastructure/audit/InMemoryAuditRepository");
const OutboxEventDispatcherAdapter = require("../infrastructure/messaging/OutboxEventDispatcherAdapter");
const pool = require("../db/db");
const auditHistory = require("../store/auditStore");
const eventPublisher = require("../events/eventPublisher");

const partnerRepository = new PostgresPartnerRepository({
  pool,
  partnerLifecycleRepository: require("../repositories/partnerLifecycleRepository")
});

module.exports = new PartnerApplicationService({
  partnerRepository,
  auditRepository: new InMemoryAuditRepository(auditHistory),
  eventDispatcher: new OutboxEventDispatcherAdapter(eventPublisher)
});

const PartnerApplicationService = require("../application/partner/PartnerApplicationService");
const PostgresPartnerRepository = require("../infrastructure/persistence/PostgresPartnerRepository");
const InMemoryAuditRepository = require("../infrastructure/audit/InMemoryAuditRepository");
const OutboxEventPublisherAdapter = require("../infrastructure/messaging/OutboxEventPublisherAdapter");
const pool = require("../db/db");
const auditHistory = require("../store/auditStore");
const eventPublisher = require("../events/eventPublisher");

const partnerRepository = new PostgresPartnerRepository({
  pool,
  connectivityRepository: require("../repositories/connectivityRepository"),
  testingRepository: require("../repositories/testingRepository"),
  certificationRepository: require("../repositories/certificationRepository"),
  goLiveRepository: require("../repositories/goLiveRepository"),
  partnerLifecycleRepository: require("../repositories/partnerLifecycleRepository")
});

module.exports = new PartnerApplicationService({
  partnerRepository,
  auditRepository: new InMemoryAuditRepository(auditHistory),
  eventPublisher: new OutboxEventPublisherAdapter(eventPublisher)
});

class InMemoryAuditRepository {
  constructor(records, clock = () => new Date()) {
    this.records = records;
    this.clock = clock;
  }

  append(partnerId, action, details) {
    this.records.push({
      partnerId,
      action,
      details,
      timestamp: this.clock().toISOString()
    });
  }

  findByPartnerId(partnerId) {
    return this.records.filter((record) => record.partnerId === partnerId);
  }
}

module.exports = InMemoryAuditRepository;

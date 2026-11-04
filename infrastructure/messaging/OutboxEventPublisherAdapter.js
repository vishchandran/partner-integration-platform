class OutboxEventPublisherAdapter {
  constructor(eventPublisher) {
    this.eventPublisher = eventPublisher;
  }

  publish(eventType, payload) {
    return this.eventPublisher.publishEvent(eventType, payload);
  }
}

module.exports = OutboxEventPublisherAdapter;

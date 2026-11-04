/**
 * Application-owned contract for durable domain-event handoff.
 * Implementations provide publish(eventType, payload).
 */
module.exports = Object.freeze({
  name: "DomainEventPublisher"
});

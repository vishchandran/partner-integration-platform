/**
 * Application-owned contract for dispatching already-persisted domain events.
 * Implementations provide dispatch(event). Event persistence belongs to the
 * same transaction as the aggregate update.
 */
module.exports = Object.freeze({
  name: "DomainEventDispatcher"
});

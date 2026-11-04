class OutboxEventDispatcherAdapter {
  constructor(eventPublisher) {
    this.eventPublisher = eventPublisher;
  }

  dispatch(event) {
    return this.eventPublisher.dispatchPersistedEvent(event);
  }
}

module.exports = OutboxEventDispatcherAdapter;

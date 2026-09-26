export class ConnectorReturnAddressRejectedError extends Error {
  constructor(message = 'connector return address rejected') {
    super(message)
    this.name = 'ConnectorReturnAddressRejectedError'
  }
}

export class ConnectorAuthorizationRequestExpiredError extends Error {
  constructor(message = 'connector authorization request expired', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ConnectorAuthorizationRequestExpiredError'
  }
}

import { ConnectorReturnAddressRejectedError } from '~/domain/errors/connector-return-address-rejected-error'

const LOOPBACK_PROTOCOL = 'http:'

const LOOPBACK_HOSTNAMES: readonly string[] = ['localhost', '127.0.0.1', '[::1]']

// Must stay in step with the back end's CONNECTOR_TRUSTED_REDIRECT_URIS default.
const TRUSTED_HOSTED_RETURN_ADDRESSES: readonly string[] = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
]

export class ConnectorReturnAddressVo {
  readonly address: string

  // A local connector listens on this machine and a hosted one only at its exact callback, so anything else is a redirect we must not follow.
  constructor(candidateAddress: string | undefined) {
    if (candidateAddress === undefined || !URL.canParse(candidateAddress)) {
      throw new ConnectorReturnAddressRejectedError()
    }

    const parsedAddress = new URL(candidateAddress)
    const loopback = parsedAddress.protocol === LOOPBACK_PROTOCOL
      && LOOPBACK_HOSTNAMES.includes(parsedAddress.hostname)
    const trustedHosted = parsedAddress.username === ''
      && parsedAddress.password === ''
      && parsedAddress.hash === ''
      && TRUSTED_HOSTED_RETURN_ADDRESSES.includes(parsedAddress.origin + parsedAddress.pathname)
    if (!loopback && !trustedHosted) {
      throw new ConnectorReturnAddressRejectedError()
    }

    this.address = parsedAddress.href
  }
}

import { ConnectorReturnAddressRejectedError } from '~/domain/errors/connector-return-address-rejected-error'

const LOOPBACK_PROTOCOL = 'http:'

const LOOPBACK_HOSTNAMES: readonly string[] = ['localhost', '127.0.0.1', '[::1]']

export class ConnectorReturnAddressVo {
  readonly address: string

  // A connector only ever listens on this machine, so anything else is a redirect we must not follow.
  constructor(candidateAddress: string | undefined) {
    if (candidateAddress === undefined || !URL.canParse(candidateAddress)) {
      throw new ConnectorReturnAddressRejectedError()
    }

    const parsedAddress = new URL(candidateAddress)
    if (parsedAddress.protocol !== LOOPBACK_PROTOCOL
      || !LOOPBACK_HOSTNAMES.includes(parsedAddress.hostname)) {
      throw new ConnectorReturnAddressRejectedError()
    }

    this.address = parsedAddress.href
  }
}

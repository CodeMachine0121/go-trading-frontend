import type { IExternalNavigationProxy } from '~/domain/interface/i-external-navigation-proxy'
import type { ConnectorReturnAddressVo } from '~/domain/models/vo/connector-return-address-vo'

export class ExternalNavigationProxy implements IExternalNavigationProxy {
  leaveFor(returnAddress: ConnectorReturnAddressVo): void {
    window.location.assign(returnAddress.address)
  }
}

import type { ConnectorReturnAddressVo } from '~/domain/models/vo/connector-return-address-vo'

export interface IExternalNavigationProxy {
  leaveFor(returnAddress: ConnectorReturnAddressVo): void
}

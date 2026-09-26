import type { IExternalNavigationProxy } from '~/domain/interface/i-external-navigation-proxy'

export class ExternalNavigationProxy implements IExternalNavigationProxy {
  leaveFor(address: string): void {
    window.location.assign(address)
  }
}

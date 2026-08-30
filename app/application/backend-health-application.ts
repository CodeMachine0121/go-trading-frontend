import type { BackendHealthService } from '~/domain/service/backend-health-service'
import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'

/**
 * Application：編排用例，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive、不 import 任何 .vue。
 */
export class BackendHealthApplication {
  constructor(private readonly backendHealthService: BackendHealthService) {}

  async checkBackendHealth(): Promise<BackendHealthDto> {
    return this.backendHealthService.checkBackendHealth()
  }
}

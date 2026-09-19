import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'
import { LayoutDensityDomain } from '~/domain/models/domains/layout-density-domain'

/**
 * Application：給我一個寬度，回我這個寬度代表什麼。
 *
 * **這裡沒有 domain service**，而那是刻意的：只有一個 model、沒有任何對外資料存取，
 * service 會是一個把參數原封轉手的殼——公開介面比實作還大。
 * `Service` 後綴在這個專案裡只用於跨 model 的編排，而這裡沒有可編排的第二個對象。
 *
 * 真的出現第二個對象時（例如把使用者手動挑的疏密偏好也納入），
 * 補上 service 的位置是現成的：下面那一行改成呼叫它。
 */
export class LayoutDensityApplication {
  resolveLayoutDensity(viewportWidthInPixels: number): LayoutDensityDto {
    return new LayoutDensityDomain(viewportWidthInPixels).toDto()
  }
}

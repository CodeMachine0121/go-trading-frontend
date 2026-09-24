import { vi } from 'vitest'
import { LiveKCandleApplication } from '~/application/live-k-candle-application'
import { LiveKCandleContractApplication } from '~/application/live-k-candle-contract-application'
import { LiveKCandleService } from '~/domain/service/live-k-candle-service'
import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'

/**
 * 只 mock 那條持續連著的通道；application、domain service 與合併的算法都是真的。
 *
 * 預設什麼都不送，也就是一條接上了但市場毫無動靜的通道——
 * 既有的測試因此不會因為多了跟盤而改變行為。
 */
export function buildLiveKCandleApplication(
  liveKCandleProxy: Partial<ILiveKCandleProxy> = {},
): LiveKCandleApplication {
  return new LiveKCandleApplication(new LiveKCandleService({
    followKCandles: vi.fn().mockReturnValue(() => {}),
    ...liveKCandleProxy,
  }))
}

/**
 * 合約圖表那一條：同樣只 mock 通道，其餘都是真的。預設同樣什麼都不送。
 */
export function buildLiveKCandleContractApplication(
  liveKCandleProxy: Partial<ILiveKCandleProxy> = {},
): LiveKCandleContractApplication {
  return new LiveKCandleContractApplication(new LiveKCandleService({
    followKCandles: vi.fn().mockReturnValue(() => {}),
    ...liveKCandleProxy,
  }))
}

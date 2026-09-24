import type { IMarketSidePreferenceProxy } from '~/domain/interface/i-market-side-preference-proxy'

const MARKET_SIDE_STORAGE_KEY = 'go-trading:market-side'

export class MarketSidePreferenceProxy implements IMarketSidePreferenceProxy {
  readMarketSide(): string | null {
    try {
      return localStorage.getItem(MARKET_SIDE_STORAGE_KEY)
    }
    catch {
      // 私密視窗或封鎖了網站資料：當作從沒切過，從現貨那一邊開始。
      return null
    }
  }

  writeMarketSide(side: string): void {
    try {
      localStorage.setItem(MARKET_SIDE_STORAGE_KEY, side)
    }
    catch {
      // 記不住就算了：這一次在各畫面之間照樣帶著走，只是重新整理後回到現貨。
    }
  }
}

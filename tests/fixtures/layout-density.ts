import { LayoutDensityApplication } from '~/application/layout-density-application'
import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'

const layoutDensityApplication = new LayoutDensityApplication()

/**
 * 一台坐著用的機器上，這個寬度代表什麼。多數測試不在意寬度，帶的就是這一個。
 *
 * 走的是真的那條路（從一個寬度算出來），不是手捏一份答案——手捏的那一份
 * 會在分界改變的那一天繼續說著舊的話，而測試不會紅。
 */
export function onADesktop(): LayoutDensityDto {
  return layoutDensityApplication.resolveLayoutDensity(1280)
}

/** 一隻手拿著的螢幕：手機直立，也是這個操作台支援的最窄寬度。 */
export function onAPhone(): LayoutDensityDto {
  return layoutDensityApplication.resolveLayoutDensity(390)
}

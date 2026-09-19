import { describe, expect, it } from 'vitest'
import { LayoutDensityApplication } from '~/application/layout-density-application'

const layoutDensityApplication = new LayoutDensityApplication()

describe('LayoutDensityApplication', () => {
  it('手機直立的寬度回的是窄螢幕那一組答案', () => {
    expect(layoutDensityApplication.resolveLayoutDensity(390)).toEqual({
      density: 'roomy',
      usesNavigationDrawer: true,
      allowsBlockEditing: false,
      startsChartControlsCollapsed: true,
      assistantCoversScreen: true,
    })
  })

  it('桌機的寬度回的是寬螢幕那一組答案', () => {
    expect(layoutDensityApplication.resolveLayoutDensity(1024)).toEqual({
      density: 'compact',
      usesNavigationDrawer: false,
      allowsBlockEditing: true,
      startsChartControlsCollapsed: false,
      assistantCoversScreen: false,
    })
  })
})

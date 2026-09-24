/**
 * 外觀的三種選擇。順序就是畫面上排的順序：淺色、跟隨系統、深色——
 * 跟隨系統夾在中間，因為它是兩者之間的「不選」。
 */
export const APPEARANCE_CHOICES = ['light', 'system', 'dark'] as const

export type AppearanceChoiceVo = typeof APPEARANCE_CHOICES[number]

/** 實際套在畫面上的那一種。跟隨系統不是第三種主題，它最後一定落在其中一種。 */
export type ResolvedThemeVo = 'light' | 'dark'

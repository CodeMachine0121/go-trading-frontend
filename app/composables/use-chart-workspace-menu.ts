/**
 * 看盤工作區的主選單開著沒有。
 *
 * 按鈕在工作區上方細邊（面板裡），抽屜在版型裡——兩邊不同層，所以共用一份 `useState`，
 * 比照助手抽屜的做法。換頁時收起來：選了一個去處，那個去處就不該被一張還開著的選單蓋住。
 */
export function useChartWorkspaceMenu() {
  const menuOpen = useState('chart-workspace-menu-open', () => false)

  return {
    menuOpen,
    openMenu: () => {
      menuOpen.value = true
    },
    closeMenu: () => {
      menuOpen.value = false
    },
  }
}

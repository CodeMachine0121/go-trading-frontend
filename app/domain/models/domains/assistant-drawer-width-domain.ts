/**
 * 抽屜最窄能到多少。
 *
 * 再窄下去它就不能用了：帶小標與條列的回答會變成一行一兩個字，
 * 輸入框與那顆送出鍵也擠成一團。使用者當然可以把它拖窄，但不能拖到失能。
 */
const MINIMUM_WIDTH_PIXELS = 320

/**
 * 抽屜最寬能到多少。
 *
 * 它是**疊在畫面上暫時叫出來的東西**，不是第二個頁面。寬到蓋掉大半個視窗時，
 * 使用者就看不到自己正在問的那張圖了——而「看著圖順手問一句」是它存在的理由。
 */
const MAXIMUM_WIDTH_PIXELS = 720

/** 最寬的時候也要在視窗邊緣留一點，讓人看得出底下還有東西。 */
const VIEWPORT_MARGIN_PIXELS = 48

/**
 * Domain Model：助手抽屜的寬度，以及關於它的那一條規則。
 *
 * **永遠夾回一個還能用的寬度。** 太窄它失能、太寬它蓋掉使用者正在看的東西；
 * 而且上次在寬螢幕拖到 700 的人，這次開一個窄視窗時不該看到一塊比視窗還寬的面板。
 * 這條規則因此不只在拖曳時套用，讀回記住的寬度與視窗大小改變時也要套。
 */
export class AssistantDrawerWidthDomain {
  constructor(private readonly width: number) {}

  /**
   * 夾回這個視窗放得下、而且還能用的寬度。
   *
   * 視窗本身就比最小寬度還窄時（極窄的瀏覽器），一律回最小寬度——
   * 那時候抽屜會與視窗一樣寬，而那是樣式那一層早就備好的退路。
   */
  clampedInto(viewportWidth: number): number {
    const widest = Math.max(
      MINIMUM_WIDTH_PIXELS,
      Math.min(MAXIMUM_WIDTH_PIXELS, viewportWidth - VIEWPORT_MARGIN_PIXELS),
    )

    return Math.min(Math.max(this.width, MINIMUM_WIDTH_PIXELS), widest)
  }
}

/**
 * VO：從一整段算式取回的內容，以及外框認不認得出來。不可變、無行為。
 *
 * 兩件事必須一起交出去。只回內容的話，「這是拆出來的內容」與「這是一整段認不出外框的算式」
 * 長得一模一樣，而畫面對這兩者該說的話完全不同——後者要告訴使用者這一支不是在這裡寫出來的。
 */
export class IndicatorScriptBodyVo {
  constructor(
    public readonly body: string,
    public readonly frameRecognised: boolean,
  ) {}
}

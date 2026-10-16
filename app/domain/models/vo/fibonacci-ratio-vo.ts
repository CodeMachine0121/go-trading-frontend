/** 斐波那契回撤的一條比例與它的顏色。 */
export class FibonacciRatioVo {
  constructor(
    public readonly ratio: number,
    public readonly colorToken: string,
  ) {}
}

/** 七條比例，照 TradingView 的預設配色。 */
export const FIBONACCI_RATIOS: readonly FibonacciRatioVo[] = [
  new FibonacciRatioVo(0, '--color-drawing-gray'),
  new FibonacciRatioVo(0.236, '--color-drawing-red'),
  new FibonacciRatioVo(0.382, '--color-drawing-orange'),
  new FibonacciRatioVo(0.5, '--color-drawing-green'),
  new FibonacciRatioVo(0.618, '--color-drawing-teal'),
  new FibonacciRatioVo(0.786, '--color-drawing-cyan'),
  new FibonacciRatioVo(1, '--color-drawing-gray'),
]

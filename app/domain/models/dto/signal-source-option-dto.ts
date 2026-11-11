/** DTO：訊號來源選單上的一支策略腳本，連同它開得出來的參數名。 */
export class SignalSourceOptionDto {
  constructor(
    public readonly value: number,
    public readonly label: string,
    public readonly parameterNames: readonly string[],
  ) {}
}

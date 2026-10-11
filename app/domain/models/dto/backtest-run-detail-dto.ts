import type { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'
import type { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'

/** DTO：點開一筆輪次看到的——輪次本身，以及完成時的成績單（與當場回測回來的同一個形狀）。 */
export class BacktestRunDetailDto {
  constructor(
    public readonly run: BacktestRunDto,
    public readonly result: BacktestResultDto | null,
  ) {}
}

import type { SignalSourceOptionDto } from '~/domain/models/dto/signal-source-option-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { SignalSourceShortageVo } from '~/domain/models/vo/signal-source-shortage-vo'

/** DTO：一種行情的策略腳本裡，當得了訊號來源的、當不了的（連同原因），以及一支都挑不到時是哪一種。 */
export class SignalSourceChoicesDto {
  constructor(
    public readonly options: readonly SignalSourceOptionDto[],
    /** 存在、但當不了訊號來源的那幾支，以及原因。一個已經指著它們的來源要說得出自己指著誰。 */
    public readonly unusable: Readonly<Record<number, LocalizedTextVo>>,
    /** 挑得到是 `null`。 */
    public readonly shortage: SignalSourceShortageVo | null,
  ) {}
}

export type TradingKeyVerificationFailureVo
  = | 'keyRejected'
    | 'noTradingPermission'
    | 'unreachable'
    | 'timedOut'

export const TRADING_KEY_VERIFICATION_FAILURES: readonly TradingKeyVerificationFailureVo[] = [
  'keyRejected',
  'noTradingPermission',
  'unreachable',
  'timedOut',
]

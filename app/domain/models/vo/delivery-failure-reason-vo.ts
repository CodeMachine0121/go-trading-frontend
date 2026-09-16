/**
 * 一則訊息送不出去的四種原因，與後端回應帶的那個值一字不差。
 *
 * 有限的字面量聯合，是規範允許使用 `type` 的唯一情形：它描述一組固定取值，
 * 不是一份資料的形狀。**該說哪一句話（行為）住在 DeliveryFailureDomain。**
 *
 * 畫面靠這個值分辨，不讀訊息文字——比照這個專案對「三種算不出來」已經定下的做法：
 * 文字是寫給人看的，改一次措辭就會把四種悄悄變成一種。
 */
export type DeliveryFailureReasonVo
  = | 'credentialRejected'
    | 'destinationNotFound'
    | 'unreachable'
    | 'timedOut'

/** 判斷後端回報的字串認不認得時比對用。 */
export const DELIVERY_FAILURE_REASONS: readonly DeliveryFailureReasonVo[] = [
  'credentialRejected',
  'destinationNotFound',
  'unreachable',
  'timedOut',
]

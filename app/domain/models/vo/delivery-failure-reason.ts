/**
 * VO：一則訊息送不出去的四種原因，與後端回應帶的那個值一字不差。
 *
 * **靠這個值分辨，不讀訊息文字。** 比照這個專案對「三種算不出來」已經定下的做法：
 * 文字是寫給人看的，改一次措辭就會把四種悄悄變成一種。
 */
export type DeliveryFailureReason
  = | 'credentialRejected'
    | 'destinationNotFound'
    | 'unreachable'
    | 'timedOut'

/**
 * 四種原因各自那一句話。
 *
 * 四句話**必須不同**，因為四件事要使用者做的完全不同：重填金鑰、重填代號、
 * 稍後再試、稍後再試。合成一句，一個只是打錯聊天室代號的人會去重新產生一支
 * 從來沒錯的機器人金鑰。
 *
 * 認不得的值一律當成「連不上」——後端哪天多一種，畫面該說的是「稍後再試」，
 * 不是一片空白，也不是叫人去改一格其實沒錯的東西。
 */
export function deliveryFailureSentence(reason: string): string {
  switch (reason) {
    case 'credentialRejected':
      return 'Telegram 不接受這組機器人金鑰，請重新填一次整串金鑰。'
    case 'destinationNotFound':
      return 'Telegram 找不到這個聊天室，請確認聊天室代號。'
    case 'timedOut':
      return 'Telegram 太久沒有回答，這一則當作沒送成，請稍後再試。'
    default:
      return '連不上 Telegram，請稍後再試。'
  }
}

import type { DeliveryFailureReasonVo } from '~/domain/models/vo/delivery-failure-reason-vo'
import { DELIVERY_FAILURE_REASONS } from '~/domain/models/vo/delivery-failure-reason-vo'

/**
 * 四種原因各自那一句話。
 *
 * 四句話**必須不同**，因為四件事要使用者做的完全不同：重填金鑰、重填代號、
 * 稍後再試、稍後再試。合成一句，一個只是打錯聊天室代號的人會去重新產生一支
 * 從來沒錯的機器人金鑰。
 */
//
// 「送不到這個聊天室」把兩件事講在一起，因為後端回的是同一個取值，而使用者要做的
// 檢查也是同一組：代號對不對、有沒有先對 bot 按過 Start。第一次設定最常卡的正是
// 後者——bot 不能主動私訊沒找過它的人，而那件事光看代號是看不出來的。
const DELIVERY_FAILURE_SENTENCES: Readonly<Record<DeliveryFailureReasonVo, string>> = {
  credentialRejected: 'Telegram 不接受這組機器人金鑰，請重新填一次整串金鑰。',
  destinationNotFound: 'Telegram 送不到這個聊天室。確認聊天室代號，並確認你已經在 Telegram 對這個 bot 按過 Start——它不能主動私訊沒找過它的人。',
  unreachable: '連不上 Telegram，請稍後再試。',
  timedOut: 'Telegram 太久沒有回答，這一則當作沒送成，請稍後再試。',
}

/**
 * 後端哪天多一種原因時的歸屬。
 *
 * 當成「連不上」而不是丟錯或原樣顯示一個英文代號：畫面該說的是「稍後再試」，
 * 那句話對任何一種沒見過的失敗都成立，而且**不會叫人去改一格其實沒錯的東西**。
 * 與信號、指標值種類的寬容解讀一致。
 */
const DEFAULT_DELIVERY_FAILURE: DeliveryFailureReasonVo = 'unreachable'

/**
 * Domain Model：一則訊息沒送出去這件事。
 *
 * 把後端回報的那個取值讀成畫面要說的那一句話。翻譯住在這裡而不是散在元件裡，
 * 因為那四句話是規則的一部分——寫成四個 `v-if`，遲早有一種被漏掉、變成一句
 * 籠統的「送出失敗」，而那顆鍵的全部價值就在於它會說出是哪一格填錯。
 */
export class DeliveryFailureDomain {
  private readonly reason: DeliveryFailureReasonVo

  constructor(declared: string) {
    const normalized = declared.trim()
    const recognized = DELIVERY_FAILURE_REASONS.find(candidate => candidate === normalized)

    this.reason = recognized ?? DEFAULT_DELIVERY_FAILURE
  }

  /** 給使用者看的那一句：說出是哪一件事出了問題，以及他該做什麼。 */
  sentence(): string {
    return DELIVERY_FAILURE_SENTENCES[this.reason]
  }
}

/** 一筆待確認修改走到哪裡，沿用後端三種；`unknown` 是認不出來的那一種。 */
export type AssistantPendingRevisionStatus = 'pending' | 'confirmed' | 'rejected' | 'unknown'

/** 認不出來的狀態不當成等你確認，免得給一筆不確定的東西一顆確認鍵。 */
export function assistantPendingRevisionStatusOf(status: string): AssistantPendingRevisionStatus {
  if (status === 'pending' || status === 'confirmed' || status === 'rejected') {
    return status
  }

  return 'unknown'
}

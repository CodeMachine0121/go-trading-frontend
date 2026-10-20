/**
 * 站內助手到目前為止答完了幾則。一則回答由「在寫」變成「寫完」時加一。
 *
 * 行情圖表拿它當重讀繪圖的時機：助手可能剛在圖上畫了線。
 */
export function useAssistantAnswerCompletions() {
  const completedAnswerCount = useState('assistant-completed-answer-count', () => 0)

  function recordAnswerCompleted(): void {
    completedAnswerCount.value += 1
  }

  return { completedAnswerCount, recordAnswerCompleted }
}

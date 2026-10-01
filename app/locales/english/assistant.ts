import type { assistantTraditionalChineseMessages } from '~/locales/traditional-chinese/assistant'

export const assistantEnglishMessages: typeof assistantTraditionalChineseMessages = {
  common: {
    collapseHistory: 'Hide conversation history',
    startNewConversation: 'Start a new conversation',
  },
  pages: {
    chat: {
      title: 'AI-Assistant',
      subtitle: 'Ask about the market in plain words. The assistant looks up trading symbols, K-lines, indicators and strategy scripts on its own.',
    },
  },
  message: {
    copyAnswer: 'Copy this answer',
  },
  answerBlocks: {
    copyCode: 'Copy this code',
  },
  pendingRevisionCard: {
    contentSummary: 'Proposed content',
    confirm: 'Confirm',
    reject: 'Reject',
  },
  pendingNotice: {
    searching: 'The assistant is looking it up…',
    patience: 'This one is taking a while; it can take up to two minutes.',
  },
  rejectionNotice: {
    retry: 'Try again',
  },
  composer: {
    placeholder: 'Ask about the market, e.g. How has BTCUSDT moved hour by hour over the last day?',
    inputLabel: 'Ask the assistant',
    keyboardHint: 'Enter to send · Shift+Enter for a new line',
    send: 'Send',
    disclaimer: 'The assistant can make mistakes. Double-check any numbers behind an order decision.',
  },
  suggestedPrompts: {
    title: 'Try asking',
  },
  conversationThread: {
    emptyLead: 'Just ask about the market the way you would say it. The assistant looks up trading symbols, K-lines, indicators and strategy scripts on its own, then answers in a few sentences.',
  },
  console: {
    historyWithCount: 'Conversation history ({count})',
  },
  drawer: {
    resizeWidth: 'Resize the assistant',
    history: 'Conversation history',
    expandToFullPage: 'Expand to full page',
    close: 'Close the assistant',
  },
  conversationList: {
    title: 'Conversations',
    startNew: 'New',
    reload: 'Reload',
    empty: 'No conversations yet. Ask something on the right to start one.',
  },
}

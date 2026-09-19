import { LOGIN_PATH, HOME_PATH, PENDING_APPROVAL_PATH } from '~/composables/use-user-session'

/**
 * 把關：沒登入就只看得到登入畫面，還沒被放行就只看得到等待開通那一頁。
 *
 * 它是全域中介層而不是每一頁自己判斷，因為一頁忘了寫就是一個洞，而洞不會有人發現。
 * 第二道規則（開通）也長在這裡而不是另開一道門，理由相同再加一個：兩道門會各自
 * 認定一次「該不該放行」，而不一致的那一天，沒有人看得出是哪一道放的行。
 *
 * **只在瀏覽器端跑。** 伺服器算頁面時碰不到瀏覽器的儲存，在那裡判斷必然得到
 * 「一律沒登入」，於是每一次載入都會先閃一下登入畫面再跳回來。代價是伺服器算出來的
 * 頁面不受這道門保護——這台操作台在本機跑、沒有對外的 SSR 需求，接受。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const { currentUser, awaitingActivation, ensureSessionRestored, rememberRedirectTo }
    = useUserSession()

  await ensureSessionRestored()

  const signedIn = currentUser.value !== null

  // 比對的是**這條路由是哪一條**，不是使用者打進網址列的那串字。
  // 路由器認得 `/Login` 與 `/login/` 都是登入那一頁，卻把原本的拼法原樣留在 path 上——
  // 拿字串直接比，就會出現「登入成功之後又被送回登入畫面」這種讀起來像失敗的結果。
  const goingToLogin = to.matched.some(route => route.path === LOGIN_PATH)
  const goingToPendingApproval = to.matched.some(route => route.path === PENDING_APPROVAL_PATH)

  if (!signedIn) {
    if (goingToLogin) {
      return
    }

    // 等待開通那一頁是給**登入了的人**看的：它說的是「你是誰、你在等什麼」，
    // 而這兩件事對一個沒登入的人都答不出來。所以它跟其他每一頁一樣要先登入，
    // 不必為它寫一條例外。
    //
    // 記下他本來要去哪，好在登入成功後把他放回那裡，而不是一律丟到首頁。
    rememberRedirectTo(to.fullPath)

    return navigateTo(LOGIN_PATH)
  }

  // 還沒被放行的人**只看得到那一頁**，包含登入頁在內——所以這一條要排在
  // 「已經進門的人不必再看一次門」之前。倒過來的話，他打開登入頁會先被送到首頁，
  // 再被首頁送回這裡：多繞一趟，還在網址列閃一下。
  if (awaitingActivation.value) {
    if (goingToPendingApproval) {
      return
    }

    return navigateTo(PENDING_APPROVAL_PATH)
  }

  // 被放行的人不必再看那一頁，道理與下面那一條一模一樣：那是一件他已經做完的事。
  if (goingToPendingApproval) {
    return navigateTo(HOME_PATH)
  }

  // 已經進門的人不必再看一次門。
  if (goingToLogin) {
    return navigateTo(HOME_PATH)
  }
})

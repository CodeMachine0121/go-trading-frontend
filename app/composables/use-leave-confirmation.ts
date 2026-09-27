export function useLeaveConfirmation(dirty: () => boolean, navigate: (path: string) => unknown = navigateTo) {
  const confirmationOpen = ref(false)
  const pendingPath = ref<string | null>(null)
  let leaveAllowed = false

  function shouldLeave(destinationPath: string): boolean {
    if (leaveAllowed || !dirty()) {
      return true
    }

    pendingPath.value = destinationPath
    confirmationOpen.value = true

    return false
  }

  function stay(): void {
    confirmationOpen.value = false
    pendingPath.value = null
  }

  function leave(): void {
    const destinationPath = pendingPath.value
    confirmationOpen.value = false
    pendingPath.value = null
    if (destinationPath !== null) {
      leaveAllowed = true
      void navigate(destinationPath)
    }
  }

  function allowLeaving(): void {
    leaveAllowed = true
  }

  return { confirmationOpen, shouldLeave, stay, leave, allowLeaving }
}

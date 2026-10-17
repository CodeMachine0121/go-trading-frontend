/**
 * 同一個要求還在路上時，後到的人等同一份回來，不再送第二次。
 *
 * 只記在路上的：回來（成功或失敗）就忘記，所以不是快取，失敗也不會被記住。
 */
export class InFlightRequestSharing<TResult> {
  private readonly requestsInFlight = new Map<string, Promise<TResult>>()

  share(requestKey: string, request: () => Promise<TResult>): Promise<TResult> {
    const requestInFlight = this.requestsInFlight.get(requestKey)
    if (requestInFlight !== undefined) {
      return requestInFlight
    }

    const sharedRequest = request().finally(() => this.requestsInFlight.delete(requestKey))
    this.requestsInFlight.set(requestKey, sharedRequest)

    return sharedRequest
  }
}

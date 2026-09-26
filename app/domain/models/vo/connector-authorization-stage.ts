export type ConnectorAuthorizationStage
  = | 'loading'
    | 'awaitingDecision'
    | 'handedBack'
    | 'expired'
    | 'loadFailed'

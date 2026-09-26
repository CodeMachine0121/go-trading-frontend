export type ConnectorAuthorizationStageVo
  = | 'loading'
    | 'awaitingDecision'
    | 'handedBack'
    | 'expired'
    | 'loadFailed'
    | 'returnAddressRejected'

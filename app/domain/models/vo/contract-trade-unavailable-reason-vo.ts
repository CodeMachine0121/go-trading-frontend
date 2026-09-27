export type ContractTradeUnavailableReason
  = | 'noStopLoss'
    | 'noFundingSettlements'
    | 'noMarketData'
    | 'noLatestPrice'
    | 'noTradingSpecification'
    | 'notApplicable'
    | 'temporarilyUnavailable'

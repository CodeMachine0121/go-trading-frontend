export type TradeUnavailableReason
  = | 'noStopLoss'
    | 'noFundingSettlements'
    | 'noMarketData'
    | 'noLatestPrice'
    | 'noTradingSpecification'
    | 'notApplicable'
    | 'temporarilyUnavailable'

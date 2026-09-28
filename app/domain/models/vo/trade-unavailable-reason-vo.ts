export type TradeUnavailableReason
  = | 'noStopLoss'
    | 'noFundingSettlements'
    | 'noMarketData'
    | 'noLatestPrice'
    | 'noTradingSpecification'
    | 'notApplicable'
    | 'notClosed'
    | 'temporarilyUnavailable'

import { log, Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { ZERO_BI, ONE_BI, TZ_OFFSET, updatePosDayData, updateClosePosProfitHourData,
         updateTotalTradeData, updateFeeIntRwdDayData,
         updateAccUsdtDftReward, updateAccRewardDayData, updateCurrentHolderInfo, updateHolderInfoDayData,
         updateTraderInfo,updateTraderInfoDayData, updateAccReward,savelpstake, updateLast24HourPosition,
         saveDepositWithdrawRecords, updateTotalFeeIntFomo, saveAllPosition, getPlatformData, updateHourPosition,
         getHolderPosData, updatePartnerCollectDayData,updateRecentPos, updateTraderRecordsCnt  } from './utils'
import { OpenPosRecord, OpenPosApprovedUsdtRecord, ClosePosRecord, SubTieredPositionRecord, ForceClosePosRecord, AccUsdtDftReward, HourPosition,
         FeeIntFomoRwdRecord, LpFee, DepositWithDraw, HolderInterest, allPosition, DepositRecord,
         WithdrawRecord, CouponUsedRecord } from '../types/schema'
import { OpenPosition, OpenPositionApprovedUsdt, ClosePosition, SubTieredPosition, ForceClosePosition, ForceClosePosition1, FeeInterestRewards,
         SettleHolderInterest, DepositToPool, WithdrawFromPool,
         DistributeLpFees, Deposit, Withdraw } from '../types/dFutureCore/FuturePerpetual'

class negPos {
  trxhash: Bytes;
  currentAccFee: BigInt;
  constructor(){}
}
var gnegpos=new negPos()

export function handleOpenPosition(event: OpenPosition): void {
  // use account + timestamp as id
  let dayID = (event.block.timestamp.toI32() + TZ_OFFSET)/86400
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let position = new OpenPosRecord(id)

  let couponUsedRec = CouponUsedRecord.load(id)
  if (couponUsedRec != null) {
      position.tokenId = couponUsedRec.tokenId
      position.nftAmount = couponUsedRec.amount
  } else {
      position.tokenId = ZERO_BI
      position.nftAmount = ZERO_BI
  }

  position.who = event.params.who
  position.symbol = event.params.symbol.toString()
  position.amount = event.params.amount
  position.direction = BigInt.fromI32(event.params.direction)
  position.price = event.params.price
  position.fee = event.params.fee
  position.timestamp = event.params.timestamp
  position.blknum = event.block.number
  position.date = dayID
  position.save()

  let usdtApproveRec = OpenPosApprovedUsdtRecord.load(id)
  let cash = ZERO_BI
  if(usdtApproveRec != null) {
    if(position.fee.gt(ZERO_BI)) {
      cash = usdtApproveRec.amount.minus(position.fee)
    } else {
      cash = usdtApproveRec.amount;
    }
  }

  saveAllPosition(event.transaction.hash, position.blknum, position.who, position.symbol, position.amount,
    position.price, position.direction, ZERO_BI, cash, position.timestamp, position.fee, 1)
  updateRecentPos(position.symbol,position.amount,position.price,position.direction,position.timestamp,1)

  let openamount= position.amount.times(position.price)
  
  let posDayData = updatePosDayData(position.symbol, event)
  posDayData.openAmount = posDayData.openAmount.plus(position.amount)
  posDayData.openAsset = posDayData.openAsset.plus(openamount)
  posDayData.save()
//24hour
  let currenthour=(event.block.timestamp.toI32() % 86400)/3600 + 1
  let currenthourposition = updateHourPosition(0,position.symbol)
  if(currenthourposition.hour == 0){
    currenthourposition.hour = currenthour
  }
  if(currenthour == currenthourposition.hour){
    currenthourposition.openAmount = currenthourposition.openAmount.plus(position.amount)
    currenthourposition.openAsset = currenthourposition.openAsset.plus(openamount)
  }else{//1小时结束，currenthourposition写入环中，并清空当前记录
    updateLast24HourPosition(currenthourposition,currenthour)
    currenthourposition.hour = currenthour
    currenthourposition.openAmount = position.amount
    currenthourposition.openAsset = openamount
    currenthourposition.closeAmount = ZERO_BI
    currenthourposition.closeAsset = ZERO_BI
  }
  currenthourposition.save()

  let totalData = updateTotalTradeData(position.symbol)
  totalData.totalOpenAmount = totalData.totalOpenAmount.plus(position.amount)
  totalData.save()

  let currentTradeInfo = updateCurrentHolderInfo(event.params.who, position.symbol)
  let TradeInfoDaydata = updateHolderInfoDayData(event.params.who, position.symbol,event)
  currentTradeInfo.currentAccFee = currentTradeInfo.currentAccFee.plus(position.fee)
  if (position.fee.lt(ZERO_BI)) {
    currentTradeInfo.totalAccFee = currentTradeInfo.totalAccFee.plus(position.fee)
    TradeInfoDaydata.totalAccFee = TradeInfoDaydata.totalAccFee.plus(position.fee)
  }
  TradeInfoDaydata.save()
  currentTradeInfo.save()

  gnegpos.trxhash = event.transaction.hash
  gnegpos.currentAccFee = currentTradeInfo.currentAccFee

  let traderProfit = updateAccUsdtDftReward(event.params.who)
  let traderProfitDaydate = updateAccRewardDayData(event.params.who,event)
  if (position.fee.lt(ZERO_BI)) {
    traderProfit.posFee = traderProfit.posFee.plus(position.fee)
    traderProfitDaydate.posFee = traderProfitDaydate.posFee.plus(position.fee)
  }
  traderProfitDaydate.save()
  traderProfit.save()

  let recordsCnt = updateTraderRecordsCnt(event.params.who)
  recordsCnt.openPosCnt = recordsCnt.openPosCnt.plus(ONE_BI)
  recordsCnt.allPosCnt = recordsCnt.allPosCnt.plus(ONE_BI)
  recordsCnt.save()

  log.info('Position to be saved: {}, {}, {}', [
    position.who.toHexString(),
    position.direction.toString(),
    position.amount.toString(),
  ])
}

export function handleOpenPositionApprovedUsdt(event: OpenPositionApprovedUsdt): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let data = new OpenPosApprovedUsdtRecord(id)

  data.who = event.params.who
  data.amount = event.params.usdtApproved
  data.blknum = event.block.number
  data.save()
}

export function handleClosePosition(event: ClosePosition): void {
  let dayID = (event.block.timestamp.toI32() + TZ_OFFSET)/86400
  // use account + timestamp as id
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let position = new ClosePosRecord(id)

  let couponUsedRec = CouponUsedRecord.load(id)
  if (couponUsedRec != null) {
      position.tokenId = couponUsedRec.tokenId
      position.nftAmount = couponUsedRec.amount
  } else {
    position.tokenId = ZERO_BI
    position.nftAmount = ZERO_BI
  }

  position.who = event.params.who
  position.symbol = event.params.symbol.toString()
  position.amount = event.params.amount
  position.direction = BigInt.fromI32(event.params.direction)
  position.price = event.params.price
  position.profit = event.params.profit
  position.fee = event.params.fee
  position.timestamp = event.params.timestamp
  position.isClear = event.params.isClear
  position.blknum = event.block.number
  position.date = dayID
  position.isSubTiered = false
  position.save()

  saveAllPosition(event.transaction.hash, position.blknum, position.who, position.symbol, position.amount,
    position.price, position.direction, position.profit, ZERO_BI, position.timestamp, position.fee,2)
  updateRecentPos(position.symbol,position.amount,position.price,position.direction,position.timestamp,2)

  let closeamount= position.amount.times(position.price)
  // update daily open close amount
  let posDayData = updatePosDayData(position.symbol, event)
  posDayData.closeAmount = posDayData.closeAmount.plus(position.amount)
  posDayData.closeAsset = posDayData.closeAsset.plus(position.amount.times(position.price))
  posDayData.save()
//24hour
  let currenthour=(event.block.timestamp.toI32() % 86400)/3600 + 1
  let currenthourposition = updateHourPosition(0,position.symbol)
  if(currenthourposition.hour == 0){
    currenthourposition.hour = currenthour
  }
  if(currenthour == currenthourposition.hour){//1小时没结束,注意拷贝时 open close
    currenthourposition.closeAmount = currenthourposition.closeAmount.plus(position.amount)
    currenthourposition.closeAsset = currenthourposition.closeAsset.plus(closeamount)
  }else{//1小时结束，currenthourposition写入环中，并清空当前记录
    updateLast24HourPosition(currenthourposition,currenthour)
    currenthourposition.hour = currenthour
    currenthourposition.openAmount = ZERO_BI
    currenthourposition.openAsset = ZERO_BI
    currenthourposition.closeAmount = position.amount
    currenthourposition.closeAsset = closeamount
  }
  currenthourposition.save()

  // update hourly profit data 
  // NOTE foce close date not included
  let profitData = updateClosePosProfitHourData(event)
  profitData.hourAccProfit = profitData.hourAccProfit.plus(position.profit)
  profitData.save()

  // update total trade data
  let totalData = updateTotalTradeData(position.symbol)
  totalData.totalAccProfit = totalData.totalAccProfit.plus(position.profit)
  totalData.totalCloseAmount = totalData.totalCloseAmount.plus(position.amount)
  totalData.save()

  // to display for current hold info
  let currentTradeInfo = updateCurrentHolderInfo(event.params.who, position.symbol)
  let TradeInfoDaydata = updateHolderInfoDayData(event.params.who, position.symbol,event)
  currentTradeInfo.currentAccFee = currentTradeInfo.currentAccFee.plus(position.fee)
  if (position.fee.lt(ZERO_BI)) {
    currentTradeInfo.totalAccFee = currentTradeInfo.totalAccFee.plus(position.fee)
    TradeInfoDaydata.totalAccFee = TradeInfoDaydata.totalAccFee.plus(position.fee)
  }
  currentTradeInfo.totalAccProfit = currentTradeInfo.totalAccProfit.plus(position.profit)
  TradeInfoDaydata.totalAccProfit = TradeInfoDaydata.totalAccProfit.plus(position.profit)
  if (position.isClear) {
    if(gnegpos.trxhash == event.transaction.hash){
      currentTradeInfo.currentAccFee = gnegpos.currentAccFee
    }else{
      currentTradeInfo.currentAccFee = ZERO_BI
    }
    // should we record the total fee to another entity
    currentTradeInfo.currentAccInt = ZERO_BI
  }
  TradeInfoDaydata.save()
  currentTradeInfo.save()

  // this is for trader info for all token symbols
  let traderProfit = updateAccUsdtDftReward(event.params.who)
  let traderProfitDaydate = updateAccRewardDayData(event.params.who,event)
  if (position.fee.lt(ZERO_BI)) {
    traderProfit.posFee = traderProfit.posFee.plus(position.fee)
    traderProfitDaydate.posFee = traderProfitDaydate.posFee.plus(position.fee)
  }
  traderProfit.totalProfit = traderProfit.totalProfit.plus(position.profit)
  traderProfitDaydate.Profit = traderProfitDaydate.Profit.plus(position.profit)
  traderProfitDaydate.save()
  traderProfit.save()

  let recordsCnt = updateTraderRecordsCnt(event.params.who)
  recordsCnt.closePosCnt = recordsCnt.closePosCnt.plus(ONE_BI)
  recordsCnt.allPosCnt = recordsCnt.allPosCnt.plus(ONE_BI)
  recordsCnt.save()

  log.info('ClosePositionRecord: {}, {}, {}, {}', [
    position.who.toHexString(),
    position.direction.toString(),
    position.amount.toString(),
    event.params.symbol.toString()
  ])
}

export function handleSubTieredPosition(event: SubTieredPosition): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let position = new SubTieredPositionRecord(id)
  position.who = event.params.who
  position.symbol = event.params.symbol.toString()
  position.beforeCloseAmount = event.params.beforeCloseAmount
  position.closeAmount = event.params.closeAmount
  position.timestamp = event.params.timestamp
  position.blknum = event.block.number
  position.save()

  let recordsCnt = updateTraderRecordsCnt(event.params.who)
  recordsCnt.posReduceCnt = recordsCnt.posReduceCnt.plus(ONE_BI)
  recordsCnt.save()

  let closePosRecords = ClosePosRecord.load(id)
  if(closePosRecords != null) {
    closePosRecords.isSubTiered = true
    closePosRecords.save()
  }

  let allPosRecords = allPosition.load(id)
  if(allPosRecords != null) {
    allPosRecords.isSubTiered = true
    allPosRecords.save()
  }
}

export function handleForceClosePositionNew(event: ForceClosePosition1): void {
  handleForceClosePosition(event as ForceClosePosition)
}

export function handleForceClosePosition(event: ForceClosePosition): void {
  let dayID = (event.block.timestamp.toI32() + TZ_OFFSET)/86400
  // use account + timestamp as id
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let position = new ForceClosePosRecord(id)

  position.holder = event.params.who
  position.symbol = event.params.symbol.toString()
  position.closedAmount = event.params.amount
  position.openPrice = event.params.openPrice
  position.closePrice = event.params.closePrice
  position.direction = event.params.direction
  position.ratio = event.params.marginRatio
  position.triggerGot = event.params.triggerGot
  position.poolGot = event.params.poolGot
  position.liquidator = event.params.triggeredBy
  position.timestamp = event.params.timestamp
  position.blknum = event.block.number
  position.date = dayID
  position.save()

  let profit = position.poolGot.plus(position.triggerGot)
  saveAllPosition(event.transaction.hash, position.blknum, position.holder, position.symbol, position.closedAmount,
    position.closePrice, BigInt.fromI32(position.direction), profit, ZERO_BI, position.timestamp, ZERO_BI, 3)
  updateRecentPos(position.symbol,position.closedAmount,position.closePrice,BigInt.fromI32(position.direction),position.timestamp,3)

  let forcecloseamount= position.closedAmount.times(position.closePrice)
  // update daily open close amount
  let posDayData = updatePosDayData(position.symbol, event)
  posDayData.closeAmount = posDayData.closeAmount.plus(position.closedAmount)
  posDayData.closeAsset = posDayData.closeAsset.plus(position.closedAmount.times(position.closePrice))
  posDayData.save()

//24hour
  let currenthour=(event.block.timestamp.toI32() % 86400)/3600 + 1
  let currenthourposition = updateHourPosition(0,position.symbol)
  if(currenthourposition.hour == 0){
    currenthourposition.hour = currenthour
  }
  if(currenthour == currenthourposition.hour){//1小时没结束,注意拷贝时 open close
    currenthourposition.closeAmount = currenthourposition.closeAmount.plus(position.closedAmount)
    currenthourposition.closeAsset = currenthourposition.closeAsset.plus(forcecloseamount)
  }else{//1小时结束，currenthourposition写入环中，并清空当前记录
    updateLast24HourPosition(currenthourposition,currenthour)
    currenthourposition.hour = currenthour
    currenthourposition.openAmount = ZERO_BI
    currenthourposition.openAsset = ZERO_BI
    currenthourposition.closeAmount = position.closedAmount
    currenthourposition.closeAsset = forcecloseamount
  }
  currenthourposition.save()

  // update total trade data
  let totalData = updateTotalTradeData(position.symbol)
  totalData.totalCloseAmount = totalData.totalCloseAmount.plus(position.closedAmount)
  totalData.save()

  // to display for current hold info
  let currentTradeInfo = updateCurrentHolderInfo(event.params.who, position.symbol)
  currentTradeInfo.totalAccProfit =currentTradeInfo.totalAccProfit.minus(position.triggerGot).minus(position.poolGot)
  currentTradeInfo.currentAccFee = ZERO_BI
  currentTradeInfo.currentAccInt = ZERO_BI
  currentTradeInfo.save()

  let TradeInfoDaydata = updateHolderInfoDayData(event.params.who, position.symbol,event)
  TradeInfoDaydata.totalAccProfit = TradeInfoDaydata.totalAccProfit.minus(position.triggerGot).minus(position.poolGot)
  TradeInfoDaydata.save()

  // this is for trader info for all token symbols
  let traderProfit = updateAccUsdtDftReward(event.params.who)
  traderProfit.totalProfit = traderProfit.totalProfit.minus(position.triggerGot).minus(position.poolGot)
  traderProfit.save()

  let traderProfitDaydate = updateAccRewardDayData(event.params.who,event)
  traderProfitDaydate.Profit = traderProfitDaydate.Profit.minus(position.triggerGot).minus(position.poolGot)
  traderProfitDaydate.save()

  let recordsCnt = updateTraderRecordsCnt(event.params.who)
  recordsCnt.forceCloseCnt = recordsCnt.forceCloseCnt.plus(ONE_BI)
  recordsCnt.allPosCnt = recordsCnt.allPosCnt.plus(ONE_BI)
  recordsCnt.save()

}

export function handleFeeInterestRewards(event: FeeInterestRewards): void {
  let id = event.params.winner.toHex() + '-' + event.transaction.hash.toHex()
  let reward = new FeeIntFomoRwdRecord(id)
  reward.who = event.params.winner
  reward.amount = event.params.rewards
  reward.blknum = event.block.number
  reward.save()

  let tmpReward = event.params.rewards
  
  //let tmpFomoUsdt = tmpReward[0]
  let tmpFee = tmpReward[0]
  let tmpInt = tmpReward[1]

//TODO:remove TotalFeeIntFomo 
  // record accumulated total USDT reward value in TotalFeeIntFomo
//  let totalReward = updateTotalFeeIntFomo()
//  totalReward.totalFomoUsdt = totalReward.totalFomoUsdt.plus(tmpFomoUsdt)
//  totalReward.save()

//TODO:remove AccUsdtDftReward.fomoUsdt
  // record usdt / dft reward accumulated value by person
  let accReward = updateAccUsdtDftReward(event.params.winner)
//  accReward.fomoUsdt = accReward.fomoUsdt.plus(tmpFomoUsdt)
  accReward.usdtAmount = accReward.usdtAmount.plus(tmpFee).plus(tmpInt)
  accReward.save()
}

export function handleSettleHolderInterest(event: SettleHolderInterest): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let HI = new HolderInterest(id)
  HI.who = event.params.who
  HI.symbol = event.params.symbol.toString()
  HI.startIndex = event.params.startIndex
  HI.endIndex = event.params.endIndex
  HI.interest = event.params.interest
  HI.blknum = event.block.number
  HI.timestamp = event.block.timestamp
  HI.save()
  
  let currentTradeInfo = updateCurrentHolderInfo(event.params.who, event.params.symbol.toString())
  currentTradeInfo.currentAccInt = currentTradeInfo.currentAccInt.plus(event.params.interest)
  currentTradeInfo.totalAccInt = currentTradeInfo.totalAccInt.plus(event.params.interest)
  currentTradeInfo.save()

  let TradeInfoDaydata = updateHolderInfoDayData(event.params.who, event.params.symbol.toString(),event)
  TradeInfoDaydata.totalAccInt = TradeInfoDaydata.totalAccInt.plus(event.params.interest)
  TradeInfoDaydata.save()

  let traderProfit = updateAccUsdtDftReward(event.params.who)
  traderProfit.interest = traderProfit.interest.plus(event.params.interest)
  traderProfit.save()

  let traderProfitDaydate = updateAccRewardDayData(event.params.who,event)
  traderProfitDaydate.interest = traderProfitDaydate.interest.plus(event.params.interest)
  traderProfitDaydate.save()
}

export function handleDepositToPool(event: DepositToPool): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let deposit = new DepositWithDraw(id)
  deposit.who = event.params.who
  deposit.usdtAmount = event.params.usdtAmount
  deposit.lptRatio = event.params.lptRatio
  deposit.blknum = event.block.number
  deposit.lptAmount = ZERO_BI
  deposit.save()

  savelpstake(id,event.params.who,event.params.usdtAmount,event.block.number,event.block.timestamp,1)

  let traderInfo = updateTraderInfo(event.params.who)
  traderInfo.accDepoitToPool = traderInfo.accDepoitToPool.plus(event.params.usdtAmount)
  traderInfo.acclptRatio = traderInfo.acclptRatio.plus(event.params.lptRatio)
  //traderInfo.currentPoolAmount = fetchTraderPoolAmount(event.params.who)
  traderInfo.save()

  let LPInfoDaydata = updateTraderInfoDayData(event.params.who,event)
  LPInfoDaydata.DepoitToPool = LPInfoDaydata.DepoitToPool.plus(event.params.usdtAmount)
  LPInfoDaydata.lptRatio = LPInfoDaydata.lptRatio.plus(event.params.lptRatio)
  LPInfoDaydata.save()
}

export function handleWithdrawFromPool(event: WithdrawFromPool): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let withdraw = new DepositWithDraw(id)
  withdraw.who = event.params.who
  withdraw.usdtAmount = event.params.usdtAmount
  withdraw.lptAmount = event.params.lptAmount
  withdraw.blknum = event.block.number
  withdraw.lptRatio = ZERO_BI
  withdraw.save()

  savelpstake(id,event.params.who,event.params.usdtAmount,event.block.number,event.block.timestamp,2)

  let traderInfo = updateTraderInfo(event.params.who)
  traderInfo.accWithdrawFromPool = traderInfo.accWithdrawFromPool.plus(event.params.usdtAmount)
  //traderInfo.currentPoolAmount = fetchTraderPoolAmount(event.params.who)
  traderInfo.acclptAmount = traderInfo.acclptAmount.plus(event.params.lptAmount)
  traderInfo.save()

  let LPInfoDaydata = updateTraderInfoDayData(event.params.who,event)
  LPInfoDaydata.WithdrawFromPool = LPInfoDaydata.WithdrawFromPool.plus(event.params.usdtAmount)
  LPInfoDaydata.lptAmount = LPInfoDaydata.lptAmount.plus(event.params.lptAmount)
  LPInfoDaydata.save()
}

// move totalFee totalInt calculation from FeeInterestRewards to DistributeLpFees
export function handleDistributeLpFees(event: DistributeLpFees): void {
  let id = event.transaction.hash.toHex() + '-' + event.transaction.hash.toHex()
  let Lp= new LpFee(id)
  Lp.shareFee = event.params.shareFee
  Lp.shareInterest = event.params.shareInterest
  Lp.blknum = event.block.number
  Lp.timestamp = event.block.timestamp
  Lp.save()

  let totalReward = updateTotalFeeIntFomo()
  totalReward.totalFee = totalReward.totalFee.plus(event.params.shareFee)
  totalReward.totalInt = totalReward.totalInt.plus(event.params.shareInterest)
  totalReward.save()

  // record the fee interest part as hour data
  let dayFeeIntData = updateFeeIntRwdDayData(event)
  dayFeeIntData.dayAccFee = dayFeeIntData.dayAccFee.plus(event.params.shareFee)
  dayFeeIntData.dayAccInt = dayFeeIntData.dayAccInt.plus(event.params.shareInterest)
  dayFeeIntData.tillYesterdayAccFee = totalReward.totalFee.minus(dayFeeIntData.dayAccFee)
  dayFeeIntData.tillYesterdayAccInt = totalReward.totalInt.minus(dayFeeIntData.dayAccInt)
  dayFeeIntData.save()

  let totalaccReward = updateAccReward()
  totalaccReward.dftStakeUsdt = totalaccReward.dftStakeUsdt.plus(event.params.shareFee.plus(event.params.shareInterest).div(BigInt.fromI32(2)))
  totalaccReward.save()
  
  log.info('SaveDistributeLpFees: {}, {}', [
    totalReward.totalFee.toString(),
    totalReward.totalInt.toString()
  ])

}

export function handleDeposit(event: Deposit): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let record = new DepositRecord(id)
  record.who = event.params.who
  record.symbol = event.params.symbol.toString()
  record.amount = event.params.amount
  record.blknum = event.block.number
  record.save()

  saveDepositWithdrawRecords(event.transaction.hash, record.who, record.symbol, 
                             record.amount, record.blknum, event.block.timestamp, 1)

  let recordsCnt = updateTraderRecordsCnt(event.params.who)
  recordsCnt.depositRecCnt = recordsCnt.depositRecCnt.plus(ONE_BI)
  recordsCnt.depositWithdrawRecCnt = recordsCnt.depositWithdrawRecCnt.plus(ONE_BI)
  recordsCnt.save()
}

export function handleWithdraw(event: Withdraw): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  let record = new WithdrawRecord(id)
  record.who = event.params.who
  record.symbol = event.params.symbol.toString()
  record.amount = event.params.amount
  record.blknum = event.block.number
  record.save()

  saveDepositWithdrawRecords(event.transaction.hash, record.who, record.symbol, 
                             record.amount, record.blknum, event.block.timestamp, 2)

  let recordsCnt = updateTraderRecordsCnt(event.params.who)
  recordsCnt.withdrawRecCnt = recordsCnt.withdrawRecCnt.plus(ONE_BI)
  recordsCnt.depositWithdrawRecCnt = recordsCnt.depositWithdrawRecCnt.plus(ONE_BI)
  recordsCnt.save()
}


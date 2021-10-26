import { PositionDayData, ClosePosProfitHourData, TotalTradeData, HolderPosData,
         FeeIntRwdDayData, CurrentHolderInfo, HolderInfoDayData, allPosition, Uni, HourPosition, Last24HourPosition,
         AccUsdtDftReward, AccRewardDayData, AccReward, TraderInfo,LpStake, DftStake, StakeHolder, HolderUniReward,
         TraderInfoDayData, TotalFeeIntFomo, DepositWithdrawRecord,PlatformData, TradingMintAmount, AccUni,
         PartnerCollectDayData, FomoDayData, GlobalParam, RecentPosRecord, TraderRecordsCnt,
         CouponUsedRecord, NftUserRec, CouponCount, VoteCastData } from '../types/schema'
import { log, BigInt, BigDecimal, ethereum, Address, Bytes } from '@graphprotocol/graph-ts'

import { LpTokenWrapper } from '../types/dFutureCore/LpTokenWrapper'
import { FuturePerpetual } from '../types/dFutureCore/FuturePerpetual'
import { Pool } from '../types/dFutureCore/Pool'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let TZ_OFFSET = 28800 // offset 8 hours due to timezone
export let FOMO_POOL_INDEX = BigInt.fromI32(2)

export enum PoolIndex {
  LpTokenPoolIndex = 0,// lpPoolDft
  TraderPoolIndex = 1,
  PartnerPoolIndex = 2,
  FomoPoolIndex = 3,// fomoDft
  DynamicPoolIndex = 4,
  AirdropPoolIndex = 5,
  communityPoolIndex = 6,
  LpTokenUSDTPoolIndex = 7,// totalPoolFeeInt
  DTokenUSDTPoolIndex = 8,// dftStakeUsdt
  UniXPoolIndex = 9,
  UniPoolIndex = 10,
  UniXUSDTPoolIndex = 11,
  UniUSDTPoolIndex = 12
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
   let bd = BigDecimal.fromString('1')
   for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
     bd = bd.times(BigDecimal.fromString('10'))
   }
   return bd
 }

export function updatePosDayData(symbol: String, event: ethereum.Event): PositionDayData {
   let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
   let dayID = timestamp / 86400
   let dayStartTimestamp = dayID * 86400

   let posDayData = PositionDayData.load(dayID.toString() + '-' + symbol)
   if (posDayData === null) {
     posDayData = new PositionDayData(dayID.toString() + '-' + symbol)
     posDayData.date = dayStartTimestamp
     posDayData.symbol = symbol
     posDayData.openAmount = ZERO_BI
     posDayData.openAsset = ZERO_BI
     posDayData.closeAmount = ZERO_BI
     posDayData.closeAsset = ZERO_BI
   }
   posDayData.save()
   return posDayData as PositionDayData
 }

 export function updateClosePosProfitHourData(event: ethereum.Event): ClosePosProfitHourData {
   let timestamp = event.block.timestamp.toI32()
   let hourIndex = timestamp / 3600 // get unique hour within unix history
   let hourStartUnix = hourIndex * 3600 // want the rounded effect

   let profitHourData = ClosePosProfitHourData.load(hourIndex.toString())
   if (profitHourData === null) {
     profitHourData = new ClosePosProfitHourData(hourIndex.toString())
     profitHourData.hourStartUnix = hourStartUnix
     profitHourData.hourAccProfit = ZERO_BI
   }
   profitHourData.save()
   return profitHourData as ClosePosProfitHourData
 }

 export function updateTotalTradeData(symbol: String): TotalTradeData {
   let totalData = TotalTradeData.load(symbol)
   if (totalData === null) {
      totalData = new TotalTradeData(symbol)
      totalData.symbol = symbol
      totalData.totalAccProfit = ZERO_BI
      totalData.totalOpenAmount = ZERO_BI
      totalData.totalCloseAmount = ZERO_BI
   }
   totalData.save()
   return totalData as TotalTradeData
}

export function updateCurrentHolderInfo(who: Address, symbol: String): CurrentHolderInfo {
   let currentTradeInfo = CurrentHolderInfo.load(who.toHexString() + '-' + symbol)
   if (currentTradeInfo === null) {
      currentTradeInfo = new CurrentHolderInfo(who.toHexString() + '-' + symbol)
      currentTradeInfo.who = who
      currentTradeInfo.symbol = symbol
      currentTradeInfo.currentAccFee = ZERO_BI
      currentTradeInfo.currentAccInt = ZERO_BI
      currentTradeInfo.totalAccFee = ZERO_BI
      currentTradeInfo.totalAccInt = ZERO_BI
      currentTradeInfo.totalAccProfit = ZERO_BI
   }
   currentTradeInfo.save()
   return currentTradeInfo as CurrentHolderInfo
}

export function updateHolderInfoDayData(who: Address, symbol: String,event: ethereum.Event): HolderInfoDayData {
   let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
   let dayID = timestamp / 86400

   let TradeInfoDayData = HolderInfoDayData.load(who.toHexString() + '-' + symbol + '-' + dayID.toString())
   if (TradeInfoDayData === null) {
      TradeInfoDayData = new HolderInfoDayData(who.toHexString() + '-' + symbol + '-' + dayID.toString())
      TradeInfoDayData.who = who
      TradeInfoDayData.symbol = symbol
      TradeInfoDayData.date = dayID
      TradeInfoDayData.totalAccFee = ZERO_BI
      TradeInfoDayData.totalAccInt = ZERO_BI
      TradeInfoDayData.totalAccProfit = ZERO_BI
   }
   TradeInfoDayData.save()
   return TradeInfoDayData as HolderInfoDayData
}

export function updateAccUsdtDftReward(who: Address): AccUsdtDftReward {
   let accReward = AccUsdtDftReward.load(who.toHexString())
   if (accReward === null) {
      accReward = new AccUsdtDftReward(who.toHexString())
      accReward.who = who
      accReward.totalPoolFeeInt = ZERO_BI
      accReward.usdtAmount = ZERO_BI
      accReward.dftAmount = ZERO_BI
      accReward.fomoDft = ZERO_BI
      accReward.fomoUsdt = ZERO_BI
      accReward.totalProfit = ZERO_BI
      accReward.posFee = ZERO_BI
      accReward.interest = ZERO_BI
      accReward.lpPoolDft = ZERO_BI
      accReward.uni = ZERO_BI
      accReward.dftStakeUsdt = ZERO_BI
   }
   accReward.save()
   return accReward as AccUsdtDftReward
}
export function updateAccRewardDayData(who: Address,event: ethereum.Event): AccRewardDayData {
   let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
   let dayID = timestamp / 86400

   let accReward = AccRewardDayData.load(who.toHexString() + '-' + dayID.toString())
   if (accReward === null) {
      accReward = new AccRewardDayData(who.toHexString() + '-' + dayID.toString())
      accReward.date = dayID
      accReward.who = who
      accReward.Profit = ZERO_BI
      accReward.posFee = ZERO_BI
      accReward.interest = ZERO_BI
      accReward.lpPoolDft = ZERO_BI
      accReward.dftStakeUsdt = ZERO_BI
      accReward.totalPoolFeeInt = ZERO_BI
   }
   accReward.save()
   return accReward as AccRewardDayData
}

export function updateAccReward(): AccReward {
   let totalAccReward = AccReward.load('1')
   if(totalAccReward === null){
      totalAccReward = new AccReward('1')
      totalAccReward.dftStakeUsdt = ZERO_BI
   }
   totalAccReward.save()
   return totalAccReward as AccReward
}

export function updateFeeIntRwdDayData(event: ethereum.Event): FeeIntRwdDayData {
   let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
   let dayID = timestamp / 86400
   let dayStartTimestamp = dayID * 86400

   let dayData = FeeIntRwdDayData.load(dayID.toString())
   if (dayData === null) {
      dayData = new FeeIntRwdDayData(dayID.toString())
      dayData.date = dayStartTimestamp
      dayData.dayAccFee = ZERO_BI
      dayData.dayAccInt = ZERO_BI
      dayData.tillYesterdayAccFee = ZERO_BI
      dayData.tillYesterdayAccInt = ZERO_BI
   }
   dayData.save()
   return dayData as FeeIntRwdDayData
}

export function updateTraderInfo(who: Address): TraderInfo {
   let info = TraderInfo.load(who.toHexString())
   if (info === null) {
      info = new TraderInfo(who.toHexString())
      info.who = who
      info.accDepoitToPool = ZERO_BI
      info.acclptRatio = ZERO_BI
      info.accWithdrawFromPool = ZERO_BI
      info.acclptAmount = ZERO_BI
      info.currentPoolAmount = ZERO_BD
   }
   info.save()
   return info as TraderInfo
}

export function updateTraderRecordsCnt(who: Address): TraderRecordsCnt {
  let info = TraderRecordsCnt.load(who.toHexString())
  if (info === null) {
     info = new TraderRecordsCnt(who.toHexString())
     info.who = who
     info.allPosCnt = ZERO_BI
     info.closePosCnt = ZERO_BI
     info.openPosCnt = ZERO_BI
     info.forceCloseCnt = ZERO_BI
     info.depositRecCnt = ZERO_BI
     info.withdrawRecCnt = ZERO_BI
     info.depositWithdrawRecCnt = ZERO_BI
     info.posReduceCnt = ZERO_BI
     info.couponBatchMintCnt = ZERO_BI
     info.couponTransferCnt = ZERO_BI
     info.couponUsedCnt = ZERO_BI
     info.luckyBoxOpenCnt = ZERO_BI
     info.luckyBoxRecvCnt = ZERO_BI
     info.luckyBoxSendCnt = ZERO_BI
  }
  info.save()
  return info as TraderRecordsCnt
}

export function updateTraderInfoDayData(who: Address,event: ethereum.Event): TraderInfoDayData {
   let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
   let dayID = timestamp / 86400

   let info = TraderInfoDayData.load(who.toHexString() + '-' + dayID.toString())
   if (info === null) {
      info = new TraderInfoDayData(who.toHexString() + '-' + dayID.toString())
      info.who = who
      info.date = dayID
      info.DepoitToPool = ZERO_BI
      info.lptRatio = ZERO_BI
      info.WithdrawFromPool = ZERO_BI
      info.lptAmount = ZERO_BI
      info.currentPoolAmount = ZERO_BD
   }
   info.save()
   return info as TraderInfoDayData
}

export function updateTotalFeeIntFomo(): TotalFeeIntFomo {
  // total reward for all users
  let totalReward = TotalFeeIntFomo.load('1')
  if (totalReward === null) {
    totalReward = new TotalFeeIntFomo('1')
    totalReward.totalFee = ZERO_BI
    totalReward.totalInt = ZERO_BI
    totalReward.totalFomoUsdt = ZERO_BI
    totalReward.totalFomoDft = ZERO_BI
  }
  totalReward.save()
  return totalReward as TotalFeeIntFomo
}

export function getHolderPosData(who: Bytes):HolderPosData{
   let hoderpos = HolderPosData.load(who.toHexString())
   if (hoderpos === null){
      hoderpos = new HolderPosData(who.toHexString())
      hoderpos.who= who
      hoderpos.amount = ZERO_BI
      hoderpos.rebateamount = ZERO_BI
   }
   hoderpos.save()
   return hoderpos as HolderPosData
}
export function getPlatformData():PlatformData{
   let platform = PlatformData.load('1')
   if( platform === null ){
      platform = new PlatformData('1')
      platform.holderpos = ZERO_BI
      platform.TradingMintAmountRows = 0
   }
   platform.save()
   return platform as PlatformData
}

export function getVoteCastData(proposalId: BigInt): VoteCastData{
    let id = proposalId.toString()
    let data = VoteCastData.load(id)
    if( data === null ){
        data = new VoteCastData(id)
        data.proposalId = proposalId
        data.voteCastCnt = ZERO_BI
    }
    data.save()
    return data as VoteCastData
}

export function updatePartnerCollectDayData(dayID: i32):PartnerCollectDayData{
   let PartnerdayData = PartnerCollectDayData.load(dayID.toString())
   if( PartnerdayData === null ){
      PartnerdayData = new PartnerCollectDayData(dayID.toString())
      PartnerdayData.date = dayID
      PartnerdayData.relations = ZERO_BI
      PartnerdayData.openPos = ZERO_BI
      PartnerdayData.openPosAmount = ZERO_BI
      PartnerdayData.closePos = ZERO_BI
      PartnerdayData.closePosAmount = ZERO_BI
   }
   PartnerdayData.save()
   return PartnerdayData as PartnerCollectDayData
}

export function updateFomoDayData(who: Address,event: ethereum.Event):FomoDayData{
   let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
   let dayID = timestamp / 86400

   let dayData = FomoDayData.load(who.toHexString() + '-' + dayID.toString())
   if (dayData === null) {
      dayData = new FomoDayData(who.toHexString() + '-' + dayID.toString())
      dayData.who = who
      dayData.date = dayID
      dayData.amount = ZERO_BI
   }
   dayData.save()
   return dayData as FomoDayData
}
export function updateRecentPos(symbol: string,amount: BigInt,price: BigInt,direction:BigInt,timestamp:BigInt,postype:i32):void{
     let gp=GlobalParam.load(symbol+'0')
     if (gp === null){
        gp = new GlobalParam(symbol+'0')
        gp.recentposnext= 1
        gp.recentposmax = 100
     }
     let next=gp.recentposnext
     let record=RecentPosRecord.load(symbol+next.toString())
     if( record === null){
      record=new RecentPosRecord(symbol+next.toString())
     }
     record.symbol = symbol
     record.amount = amount
     record.price = price
     record.timestamp = timestamp
     record.direction = direction
     record.postype = postype
     record.save()

     gp.recentposnext= gp.recentposnext + 1
     if(gp.recentposnext > gp.recentposmax){
        gp.recentposnext=1
     }
     gp.save()
}

export function savelpstake(id:string,who: Bytes,amount: BigInt,blk: BigInt,timestamp:BigInt,Staketype:i32):void{
   let ls = new LpStake(id)
   ls.who = who
   ls.Amount = amount
   ls.blknum = blk
   ls.Staketype = Staketype
   ls.timestamp = timestamp
   ls.fee = ZERO_BI
   if(Staketype == 2){
      ls.fee = ls.Amount.times(BigInt.fromI32(5)).div(BigInt.fromI32(1000))//usdt赎回收取0.5%手续费
   }else if(Staketype == 4){
      ls.fee = ls.Amount.times(BigInt.fromI32(1)).div(BigInt.fromI32(100))//dft加速赎回收取1%手续费
   }
   ls.save()

   updateStakeHolder(who,2)
}

export function savedftstake(id:string,who: Bytes,amount: BigInt,blk: BigInt,timestamp:BigInt,Staketype:i32):void{
   let ls = new DftStake(id)
   ls.who = who
   ls.Amount = amount
   ls.blknum = blk
   ls.Staketype = Staketype
   ls.timestamp = timestamp
   ls.save()

   updateStakeHolder(who,1)
}

export function getAccUni(poolIndex: BigInt):AccUni{
   let totalUni = AccUni.load( poolIndex.toString() )
   if( totalUni === null ){
      totalUni = new AccUni( poolIndex.toString() )
      totalUni.amount = ZERO_BI
   }
   totalUni.save()
   return totalUni as AccUni
}

export function saveuni(id:string,who: Bytes,amount: BigInt,poolIndex: BigInt,blk: BigInt,timestamp:BigInt,Staketype:i32):void{
   let ls = new Uni(id)
   ls.who = who
   ls.Amount = amount
   ls.poolIndex = poolIndex
   ls.blknum = blk
   ls.Staketype = Staketype
   ls.timestamp = timestamp
   ls.save()

   if(poolIndex.equals(BigInt.fromI32(PoolIndex.UniPoolIndex))) {
      updateStakeHolder(who,3)
   }else{
      updateStakeHolder(who,4)
   }
}

function updateStakeHolder(who: Bytes,Staketype:i32):void{  //dft 1,lp 2
   let holder = StakeHolder.load(who.toHexString())
   if( holder === null ){
      holder = new StakeHolder(who.toHexString())
      holder.dftrows = 0
      holder.lprows = 0
      holder.unirows = 0
      holder.unixrows = 0
      holder.save()
   }
   if(1 == Staketype){
      holder.dftrows =  holder.dftrows + 1
   }else if(2 == Staketype){
      holder.lprows =  holder.lprows + 1
   }else if(3 == Staketype){
      holder.unirows =  holder.unirows + 1
   }else if(4 == Staketype){
      holder.unixrows =  holder.unixrows + 1
   }
   holder.save()
}

export function saveAllPosition(trxHash: Bytes, blk: BigInt,who: Bytes, symbol: string,amount: BigInt,
   price: BigInt,direction:BigInt,profit: BigInt,cash: BigInt,timestamp:BigInt,fee:BigInt,postype:i32):void{
   let id = who.toHex() + '-' + trxHash.toHex() + '-' + postype.toString()
   let ap = new allPosition(id)

   let cprId = who.toHex() + '-' + trxHash.toHex()

   let couponUsedRec = CouponUsedRecord.load(cprId)
   if (couponUsedRec != null) {
      ap.tokenId = couponUsedRec.tokenId
      ap.nftAmount = couponUsedRec.amount
   } else {
      ap.tokenId = ZERO_BI
      ap.nftAmount = ZERO_BI
   }

   ap.who = who
   ap.symbol = symbol
   ap.amount = amount
   ap.price = price
   ap.direction = direction
   ap.fee = fee
   ap.profit = profit
   ap.cash = cash
   ap.timestamp = timestamp
   ap.blknum = blk
   ap.postype = postype
   ap.isSubTiered = false
   ap.save()
}

export function saveDepositWithdrawRecords(trxHash: Bytes, who: Bytes, symbol: string,
                                  amount: BigInt, blknum: BigInt, timestamp:BigInt, recType: i32):void{
   let id = who.toHex() + '-' + trxHash.toHex()
   let dwRec = new DepositWithdrawRecord(id)
   dwRec.who = who
   dwRec.symbol = symbol
   dwRec.amount = amount
   dwRec.blknum = blknum
   dwRec.timestamp = timestamp
   dwRec.recordType = recType
   dwRec.save()
}

export function getTradingMint(who: Address):TradingMintAmount{
   let tradingmint = TradingMintAmount.load(who.toHexString())
   if (tradingmint === null){
      tradingmint = new TradingMintAmount(who.toHexString())
      tradingmint.total = ZERO_BI
      tradingmint.amount = ZERO_BI
      tradingmint.rebateamount = ZERO_BI
      tradingmint.accamount = ZERO_BI
      tradingmint.accrebateamount = ZERO_BI
   }
   tradingmint.save()
   return tradingmint as TradingMintAmount
}

export function updateHourPosition(hour: i32, symbol: String): HourPosition {
   let currenthourposition = HourPosition.load(hour.toString() + '-' + symbol)
   if(currenthourposition === null){
     currenthourposition = new HourPosition(hour.toString() + '-' + symbol)
     currenthourposition.symbol = symbol
     currenthourposition.hour = 0
     currenthourposition.openAmount = ZERO_BI
     currenthourposition.openAsset = ZERO_BI
     currenthourposition.closeAmount = ZERO_BI
     currenthourposition.closeAsset = ZERO_BI
   }
   currenthourposition.save()
   return currenthourposition as HourPosition
 }

export function updateLast24HourPosition(currentHourPosition: HourPosition, currenthour:i32):void{

   let LastestDay=Last24HourPosition.load('0' + '-' + currentHourPosition.symbol)
   if (LastestDay === null){
      LastestDay = new Last24HourPosition('0' + '-' + currentHourPosition.symbol)
      LastestDay.symbol = currentHourPosition.symbol
      LastestDay.starthour= 0//再想想
      LastestDay.HourPositionMax = 24
      LastestDay.openAmount = ZERO_BI
      LastestDay.openAsset = ZERO_BI
      LastestDay.closeAmount = ZERO_BI
      LastestDay.closeAsset = ZERO_BI
   }

   let currenth = currentHourPosition.hour
   let lastSameHourPosition = HourPosition.load(currenth.toString() + '-' + currentHourPosition.symbol)
   if(lastSameHourPosition === null){
      lastSameHourPosition = new HourPosition(currenth.toString() + '-' + currentHourPosition.symbol)
      lastSameHourPosition.symbol = currentHourPosition.symbol
      lastSameHourPosition.hour = currentHourPosition.hour
      lastSameHourPosition.openAmount = ZERO_BI
      lastSameHourPosition.openAsset = ZERO_BI
      lastSameHourPosition.closeAmount = ZERO_BI
      lastSameHourPosition.closeAsset = ZERO_BI
   }
   lastSameHourPosition.save()

    LastestDay.openAmount=LastestDay.openAmount.minus(lastSameHourPosition.openAmount)
    LastestDay.openAsset=LastestDay.openAsset.minus(lastSameHourPosition.openAsset)
    LastestDay.closeAmount=LastestDay.closeAmount.minus(lastSameHourPosition.closeAmount)
    LastestDay.closeAsset=LastestDay.closeAsset.minus(lastSameHourPosition.closeAsset)

    lastSameHourPosition.openAmount = currentHourPosition.openAmount
    lastSameHourPosition.openAsset = currentHourPosition.openAsset
    lastSameHourPosition.closeAmount = currentHourPosition.closeAmount
    lastSameHourPosition.closeAsset = currentHourPosition.closeAsset
    lastSameHourPosition.save()

    LastestDay.openAmount=LastestDay.openAmount.plus(currentHourPosition.openAmount)
    LastestDay.openAsset=LastestDay.openAsset.plus(currentHourPosition.openAsset)
    LastestDay.closeAmount=LastestDay.closeAmount.plus(currentHourPosition.closeAmount)
    LastestDay.closeAsset=LastestDay.closeAsset.plus(currentHourPosition.closeAsset)
    LastestDay.save()
  }

export function getHolderUniReward(who: Address, poolIndex: BigInt):HolderUniReward{
   if (poolIndex.equals(BigInt.fromI32(PoolIndex.UniUSDTPoolIndex))) {
      poolIndex = BigInt.fromI32(PoolIndex.UniPoolIndex)
   } else if (poolIndex.equals(BigInt.fromI32(PoolIndex.UniXUSDTPoolIndex))) {
      poolIndex = BigInt.fromI32(PoolIndex.UniXPoolIndex)
   }

   let hoder = HolderUniReward.load(who.toHexString() + '-' + poolIndex.toString())
   if (hoder === null){
      hoder = new HolderUniReward(who.toHexString() + '-' + poolIndex.toString())
      hoder.who  = who
      hoder.pool = poolIndex
      hoder.dft  = ZERO_BI
      hoder.usdt = ZERO_BI
   }
   hoder.save()
   return hoder as HolderUniReward
}

export function createNftUser(address: Address): void {
  let dataRec = NftUserRec.load(address.toHexString())
  if (dataRec === null) {
     dataRec = new NftUserRec(address.toHexString())
     dataRec.who = address
     dataRec.save()
  }
}

export function createCouponCount(who: Address, tokenId: BigInt, amount: BigInt, addFlag: boolean): void {
  let id = who.toHex() + '-' + tokenId.toString()
  let dataRec = CouponCount.load(id)
  if(dataRec === null) {
     dataRec = new CouponCount(id)
     dataRec.who = who.toHex()
     dataRec.tokenId = tokenId
     if(addFlag) {
        dataRec.couponHoldCnt = amount
     } else {
        dataRec.couponHoldCnt = ZERO_BI.minus(amount)
     }    
  } else {
     if(addFlag) {
        dataRec.couponHoldCnt = dataRec.couponHoldCnt.plus(amount)
     } else {
        dataRec.couponHoldCnt = dataRec.couponHoldCnt.minus(amount)
     }
  }
  dataRec.save()
}
import { log, Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { ZERO_BI, ONE_BI, TZ_OFFSET, updateAccUsdtDftReward, savelpstake,
         savedftstake, saveuni, getHolderPosData,getPlatformData, getTradingMint, getHolderUniReward, getAccUni,
         updateAccRewardDayData, updateTotalFeeIntFomo, updatePartnerCollectDayData, updateFomoDayData, PoolIndex } from './utils'
import { AccUsdtDftReward, PoolUsdtDftRwdRecord, RelationRecord, SetRelation, TotalFeeIntFomo, TradingMintRecord} from '../types/schema'
import { RewardNotify, Relation, RelationArray, TradingMint, StakeUni, UnstakeUni,
         AddAccelerate, RemoveAccelerate, StakeDToken, UnstakeDToken} from '../types/dFutureLptw/LpTokenWrapper'

enum TokenType {
  TokenUsdt = 0,
  TokenDft = 1
}

let emptyaddress = Address.fromI32(0)
export function handleRewardNotify(event: RewardNotify): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex() + '-' + event.params.poolIndex.toString()
  let reward = new PoolUsdtDftRwdRecord(id)
  reward.who = event.params.who
  reward.amount = event.params.amount
  reward.poolIndex = event.params.poolIndex
  reward.blknum = event.block.number
  reward.type = event.params.tokenType
  reward.timestamp = event.block.timestamp
  reward.save()
  
  let accReward = updateAccUsdtDftReward(event.params.who)
  let accRewardDaydata = updateAccRewardDayData(event.params.who,event)
  let UniReward = getHolderUniReward(event.params.who, event.params.poolIndex)
  if (event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.LpTokenPoolIndex))) {
    accReward.lpPoolDft = accReward.lpPoolDft.plus(event.params.amount)
    accRewardDaydata.lpPoolDft = accRewardDaydata.lpPoolDft.plus(event.params.amount)
  } else if (event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.UniPoolIndex))
          || event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.UniXPoolIndex))) {
    UniReward.dft  = UniReward.dft.plus(event.params.amount)
  } else if (event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.UniUSDTPoolIndex))
          || event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.UniXUSDTPoolIndex))) {
    UniReward.usdt = UniReward.usdt.plus(event.params.amount)
  } else if (event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.FomoPoolIndex))) {
    // total reward for all users
    let totalReward = updateTotalFeeIntFomo()
    totalReward.totalFomoDft = totalReward.totalFomoDft.plus(reward.amount)
    totalReward.save()
    accReward.fomoDft = accReward.fomoDft.plus(reward.amount)
    let dayFomo = updateFomoDayData(event.params.who,event)
    dayFomo.amount = dayFomo.amount.plus(reward.amount)
    dayFomo.save()
  }else if (event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.LpTokenUSDTPoolIndex))) {
    accReward.totalPoolFeeInt = accReward.totalPoolFeeInt.plus(event.params.amount)
    accRewardDaydata.totalPoolFeeInt = accRewardDaydata.totalPoolFeeInt.plus(event.params.amount)
  } else if (event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.DTokenUSDTPoolIndex))) {
    accReward.dftStakeUsdt = accReward.dftStakeUsdt.plus(event.params.amount)
    accRewardDaydata.dftStakeUsdt = accRewardDaydata.dftStakeUsdt.plus(event.params.amount)
  } else if (event.params.poolIndex.equals(BigInt.fromI32(PoolIndex.TraderPoolIndex))) {
 //   let Holder = getHolderPosData(event.params.who)
    let platform = getPlatformData()
    let Holder = getTradingMint(event.params.who)
 
    if(Holder.total.gt(ZERO_BI)) {
      let rebateamount = reward.amount.times(Holder.rebateamount).div(Holder.total)

      Holder.accrebateamount = Holder.accrebateamount.plus(rebateamount)
      Holder.accamount = Holder.accamount.plus(reward.amount.minus(rebateamount))
      platform.holderpos = platform.holderpos.minus(Holder.total)
      platform.TradingMintAmountRows = platform.TradingMintAmountRows - 1
      platform.save()

      Holder.amount = ZERO_BI
      Holder.rebateamount = ZERO_BI
      Holder.total = ZERO_BI
      Holder.save()
    }
  }

  if (event.params.tokenType.equals( BigInt.fromI32(TokenType.TokenUsdt)) ) {
    accReward.usdtAmount = accReward.usdtAmount.plus(reward.amount)
  } else {
    accReward.dftAmount = accReward.dftAmount.plus(reward.amount)
  }
  UniReward.save()
  accReward.save()
  accRewardDaydata.save()
}

function setRelation(child: Address,parent: Address,timestamp: BigInt,dayID:i32,blk:BigInt): void {
  let id = child.toHexString()

  let relation= new RelationRecord(id)
  relation.child=child
  relation.parent=parent
  relation.date=dayID
  relation.blknum=blk
  relation.timestamp=timestamp
  relation.save()

  let PartnerDaydata= updatePartnerCollectDayData(dayID)
  PartnerDaydata.relations = PartnerDaydata.relations.plus(ONE_BI)
  PartnerDaydata.save()
}

export function handleRelation(event: Relation): void {
  let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
  let dayID = timestamp / 86400
  let blk = event.block.number

  let id = event.transaction.hash.toHex()
  let relation = new SetRelation(id)
  relation.date = dayID
  relation.blknum = blk
  relation.timestamp = event.block.timestamp
  relation.date = dayID
  relation.child = [event.params.child]
  relation.parent = [event.params.parent]
  relation.save()

  setRelation(event.params.child,event.params.parent,event.block.timestamp,dayID,blk)
}
export function handleRelationArray(event: RelationArray):void {
  let timestamp = event.block.timestamp.toI32() + TZ_OFFSET
  let dayID = timestamp / 86400
  let blk = event.block.number

  let id = event.transaction.hash.toHex()
  let relation = new SetRelation(id)
  relation.date = dayID
  relation.blknum = blk
  relation.timestamp = event.block.timestamp
  relation.date = dayID
  relation.child = event.params.children as Array<Bytes>
  relation.parent = event.params.parents as Array<Bytes>
  relation.save()

  let child = event.params.children
  let parent = event.params.parents

  for(var i=0;i<child.length;++i){
    setRelation(child[i],parent[i],event.block.timestamp,dayID,blk)
  }
}

export function handleAddAccelerate(event: AddAccelerate): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  savelpstake(id,event.params.who,event.params.dTokenAmount,event.block.number,event.block.timestamp,3)
}

export function handleRemoveAccelerate(event: RemoveAccelerate): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  savelpstake(id,event.params.who,event.params.dTokenAmount,event.block.number,event.block.timestamp,4)
}

export function handleStakeDToken(event: StakeDToken): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  savedftstake(id,event.params.who,event.params.amount,event.block.number,event.block.timestamp,1)
}

export function handleUnstakeDToken(event: UnstakeDToken): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  savedftstake(id,event.params.who,event.params.amount,event.block.number,event.block.timestamp,2)
}

export function handleStakeUni(event: StakeUni): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  saveuni(id,event.params.who,event.params.amount,event.params.poolIndex,event.block.number,event.block.timestamp,1)

  let AccUni= getAccUni(event.params.poolIndex)
  AccUni.amount = AccUni.amount.plus(event.params.amount)
  AccUni.save()
}

export function handleUnstakeUni(event: UnstakeUni): void {
  let id = event.params.who.toHex() + '-' + event.transaction.hash.toHex()
  saveuni(id,event.params.who,event.params.amount,event.params.poolIndex,event.block.number,event.block.timestamp,2)

  let AccUni= getAccUni(event.params.poolIndex)
  AccUni.amount = AccUni.amount.minus(event.params.amount)
  AccUni.save()
}

export function handleTradingMint(event: TradingMint): void {
  let who = event.params.who
  let amount = event.params.amount
  let id = event.transaction.hash.toHex()
  let tmr= new TradingMintRecord(id)
  tmr.who = who as Array<Bytes>
  tmr.amount = amount as Array<BigInt>
  tmr.timestamp = event.block.timestamp
  tmr.blknum = event.block.number
  tmr.save()
  let platform = getPlatformData()

  //self
  let self = getTradingMint(who[0])
  if(self.total.equals(ZERO_BI) && amount[0].notEqual(ZERO_BI)) {
     platform.TradingMintAmountRows = platform.TradingMintAmountRows + 1
  }
  self.amount = self.amount.plus(amount[0])
  self.total = self.total.plus(amount[0])
  self.save()
  platform.holderpos = platform.holderpos.plus(amount[0])

  //parent
 if (who[1].equals(emptyaddress) ){
   return
 }
  let parent = getTradingMint(who[1])
  if(parent.total.equals(ZERO_BI) && amount[1].notEqual(ZERO_BI)) {
    platform.TradingMintAmountRows = platform.TradingMintAmountRows + 1
  }
  parent.rebateamount = parent.rebateamount.plus(amount[1])
  parent.total = parent.total.plus(amount[1])
  parent.save()
  platform.holderpos = platform.holderpos.plus(amount[1])

  //grandpa
  if (who[2].equals(emptyaddress) ){
    return
  }
  let grandpa = getTradingMint(who[2])
  if(grandpa.total.equals(ZERO_BI) && amount[2].notEqual(ZERO_BI)) {
    platform.TradingMintAmountRows = platform.TradingMintAmountRows + 1
  }
  grandpa.rebateamount = grandpa.rebateamount.plus(amount[2])
  grandpa.total = grandpa.total.plus(amount[2])
  grandpa.save()
  platform.holderpos = platform.holderpos.plus(amount[2])
  platform.save()
}

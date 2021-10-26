# dFuture-subgraph

The subgraph for [dFuture] (https://dfuture.com/)

This subgraph records the important data from main events of dFuture. It also contains derived data for information displaying on front page like daily trading volum.

- data for position opened and closed,
- data for distributed rewards,
- data for liquidity providers
- data for NFT related events
- historical data aggregated by hour or day

## Example Queries

This query fetches position open records.

```graphql
{  
  openPosRecords(first: 2, orderBy: blknum, orderDirection: desc){
    who
    price
    amount
    symbol
    blknum
  }  
}
```

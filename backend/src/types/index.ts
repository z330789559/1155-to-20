import { BigNumberish } from 'ethers';

export type DexType = 'uniswapv2' | 'uniswapv3' | 'sushi' | 'pancake' | 'raydium';

export interface PoolEdge {
  dex: DexType;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  liquidity: bigint;
  router: string;
}

export interface QuoteRequest {
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: BigNumberish;
  slippageBps: number;
}

export interface RouteQuote {
  path: string[];
  amountOut: bigint;
  dexes: DexType[];
}

export interface QuoteResponse {
  bestRoute: RouteQuote;
  candidateRoutes: RouteQuote[];
}

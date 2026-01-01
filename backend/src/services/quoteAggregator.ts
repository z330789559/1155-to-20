import { ethers } from 'ethers';
import { LiquidityGraph } from '../graph/routing.js';
import { QuoteRequest, QuoteResponse, PoolEdge } from '../types/index.js';
import { evmNetworks } from '../config/networks.js';

export class QuoteAggregatorService {
  async quote(request: QuoteRequest): Promise<QuoteResponse> {
    const provider = this.buildProvider(request.chain);
    const pools = await this.loadPools(provider, request);
    const graph = new LiquidityGraph(pools);
    const bestRoute = graph.bestPath(request.tokenIn, request.tokenOut, BigInt(request.amountIn.toString()), request.slippageBps);
    return { bestRoute, candidateRoutes: [bestRoute] };
  }

  private buildProvider(chain: string) {
    const net = evmNetworks.find((n) => n.name === chain.toLowerCase());
    if (!net) throw new Error(`Unsupported chain ${chain}`);
    return new ethers.JsonRpcProvider(net.rpcUrl, net.chainId);
  }

  private async loadPools(provider: ethers.JsonRpcProvider, request: QuoteRequest): Promise<PoolEdge[]> {
    // In production this should pull on-chain pools via multicall or TheGraph; here we keep it minimal.
    const syntheticLiquidity = 1_000_000n * 10n ** 18n;
    return [
      {
        dex: 'uniswapv3',
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        fee: 30,
        liquidity: syntheticLiquidity,
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      },
      {
        dex: 'sushi',
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        fee: 25,
        liquidity: syntheticLiquidity / 2n,
        router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      },
    ];
  }
}

import { PoolEdge, RouteQuote } from '../types/index.js';
import { applySlippage } from '../utils/slippage.js';

export class LiquidityGraph {
  constructor(private edges: PoolEdge[]) {}

  addEdge(edge: PoolEdge) {
    this.edges.push(edge);
  }

  bestPath(tokenIn: string, tokenOut: string, amountIn: bigint, slippageBps: number): RouteQuote {
    const adjacency = this._buildAdjacency();
    const visited = new Set<string>();
    const amounts: Record<string, bigint> = { [tokenIn]: amountIn } as Record<string, bigint>;
    const prev: Record<string, { token: string; edge: PoolEdge } | undefined> = {};

    const queue = [tokenIn];
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const edge of adjacency[current] || []) {
        const nextAmount = this._simulate(edge, amounts[current]);
        if (nextAmount === 0n) continue;
        if (!amounts[edge.tokenOut] || nextAmount > amounts[edge.tokenOut]) {
          amounts[edge.tokenOut] = nextAmount;
          prev[edge.tokenOut] = { token: current, edge };
          queue.push(edge.tokenOut);
        }
      }
    }

    const pathTokens: string[] = [];
    const dexes: string[] = [];
    let cursor = tokenOut;
    if (!prev[cursor]) {
      return { path: [], amountOut: 0n, dexes: [] };
    }

    while (cursor !== tokenIn) {
      const state = prev[cursor];
      if (!state) break;
      pathTokens.unshift(cursor);
      dexes.unshift(state.edge.dex);
      cursor = state.token;
    }
    pathTokens.unshift(tokenIn);

    const amountOut = applySlippage(amounts[tokenOut] ?? 0n, slippageBps);
    return { path: pathTokens, amountOut, dexes } as RouteQuote;
  }

  _buildAdjacency(): Record<string, PoolEdge[]> {
    return this.edges.reduce((acc, edge) => {
      acc[edge.tokenIn] = acc[edge.tokenIn] || [];
      acc[edge.tokenIn].push(edge);
      return acc;
    }, {} as Record<string, PoolEdge[]>);
  }

  _simulate(edge: PoolEdge, amountIn: bigint | undefined): bigint {
    if (!amountIn || amountIn === 0n || edge.liquidity == 0n) return 0n;
    // x*y = k constant product approximation; no fee comp for brevity
    const feeBps = BigInt(edge.fee);
    const amountAfterFee = amountIn * (BigInt(10_000) - feeBps) / BigInt(10_000);
    return amountAfterFee > edge.liquidity ? edge.liquidity : amountAfterFee;
  }
}

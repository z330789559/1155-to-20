export function applySlippage(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10_000 - slippageBps)) / BigInt(10_000);
}

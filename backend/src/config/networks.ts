export type NetworkConfig = {
  name: string;
  rpcUrl: string;
  chainId: number;
};

export const evmNetworks: NetworkConfig[] = [
  { name: 'ethereum', rpcUrl: process.env.ETH_RPC || 'https://mainnet.infura.io/v3/YOUR_KEY', chainId: 1 },
  { name: 'bsc', rpcUrl: process.env.BSC_RPC || 'https://bsc-dataseed.binance.org', chainId: 56 },
  { name: 'polygon', rpcUrl: process.env.POLYGON_RPC || 'https://polygon-rpc.com', chainId: 137 },
  { name: 'arbitrum', rpcUrl: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc', chainId: 42161 },
];

export const solanaNetwork = {
  name: 'solana',
  rpcUrl: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
};

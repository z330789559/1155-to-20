import { ethers } from 'ethers';
import AggregatorABI from '../abi/AggregatorRouter.json';

type RouteStep = {
  dexType: number;
  router: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
};

type SwapPath = {
  steps: RouteStep[];
  amountIn: string;
};

type PermitData = {
  token: string;
  value: string;
  deadline: string;
  v: number;
  r: string;
  s: string;
};

export async function executeSwap(
  provider: ethers.BrowserProvider,
  aggregatorAddress: string,
  paths: SwapPath[],
  minAmountOut: string,
  permits: PermitData[] = []
) {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(aggregatorAddress, AggregatorABI.abi, signer);
  const recipient = await signer.getAddress();

  const tx = await contract.swap(permits, paths, minAmountOut, recipient);
  return tx.wait();
}

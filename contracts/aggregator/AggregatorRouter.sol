// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";
import {IERC20Permit} from "./interfaces/IERC20Permit.sol";
import {IV2Router} from "./interfaces/IV2Router.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";
import {SafeTransfer} from "./libraries/SafeTransfer.sol";
import {ReentrancyGuard} from "./libraries/ReentrancyGuard.sol";

/// @title Production-grade multi-DEX aggregator router
/// @notice Executes split routes across V2-style and V3-style routers with EIP-2612 permit support
contract AggregatorRouter is ReentrancyGuard {
    using SafeTransfer for address;

    enum DexType {
        Unknown,
        V2,
        V3
    }

    struct PermitData {
        address token;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct RouteStep {
        DexType dexType; // 1 = V2, 2 = V3
        address router;
        address tokenIn;
        address tokenOut;
        uint24 fee; // V3 pools
    }

    struct SwapPath {
        RouteStep[] steps;
        uint256 amountIn;
    }

    error EmptyRoute();
    error InsufficientOutput(uint256 expected, uint256 actual);

    event SwapExecuted(address indexed sender, address indexed recipient, uint256 amountOut);

    /// @notice Executes one or many paths atomically. Useful for split routing scenarios.
    /// @param permits Optional permits to pull tokens without a prior approve call
    /// @param paths Sequence of steps for each independent route
    /// @param minAmountOut Aggregate minimum output required for the transaction to succeed
    /// @param recipient Where to send the resulting tokens
    function swap(
        PermitData[] calldata permits,
        SwapPath[] calldata paths,
        uint256 minAmountOut,
        address recipient
    ) external nonReentrant returns (uint256 finalAmountOut) {
        if (paths.length == 0) revert EmptyRoute();

        _applyPermits(permits);

        for (uint256 i = 0; i < paths.length; i++) {
            finalAmountOut += _executePath(paths[i]);
        }

        if (finalAmountOut < minAmountOut) revert InsufficientOutput(minAmountOut, finalAmountOut);

        address outputToken = paths[paths.length - 1].steps[paths[paths.length - 1].steps.length - 1].tokenOut;
        outputToken.safeTransfer(recipient, finalAmountOut);

        emit SwapExecuted(msg.sender, recipient, finalAmountOut);
    }

    function _executePath(SwapPath calldata path) private returns (uint256 amountOut) {
        if (path.steps.length == 0) revert EmptyRoute();

        RouteStep calldata first = path.steps[0];
        first.tokenIn.safeTransferFrom(msg.sender, address(this), path.amountIn);

        uint256 currentAmount = path.amountIn;
        for (uint256 j = 0; j < path.steps.length; j++) {
            RouteStep calldata step = path.steps[j];
            if (step.dexType == DexType.V2) {
                currentAmount = _swapV2(step, currentAmount);
            } else if (step.dexType == DexType.V3) {
                currentAmount = _swapV3(step, currentAmount);
            } else {
                revert("Unsupported dex type");
            }
        }
        amountOut = currentAmount;
    }

    function _swapV2(RouteStep calldata step, uint256 amountIn) private returns (uint256) {
        address(step.tokenIn).safeApprove(step.router, amountIn);
        address[] memory path = new address[](2);
        path[0] = step.tokenIn;
        path[1] = step.tokenOut;
        uint256[] memory amounts = IV2Router(step.router).swapExactTokensForTokens(
            amountIn,
            1,
            path,
            address(this),
            block.timestamp
        );
        return amounts[amounts.length - 1];
    }

    function _swapV3(RouteStep calldata step, uint256 amountIn) private returns (uint256) {
        address(step.tokenIn).safeApprove(step.router, amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: step.tokenIn,
            tokenOut: step.tokenOut,
            fee: step.fee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 1,
            sqrtPriceLimitX96: 0
        });
        return ISwapRouter(step.router).exactInputSingle(params);
    }

    function _applyPermits(PermitData[] calldata permits) private {
        for (uint256 i = 0; i < permits.length; i++) {
            PermitData calldata p = permits[i];
            IERC20Permit(p.token).permit(msg.sender, address(this), p.value, p.deadline, p.v, p.r, p.s);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  GroupTreasury
 * @notice Per-group ETH treasury.
 *         Members deposit their owed amounts; admin disperses to creditors.
 *         This is a lightweight alternative to direct P2P transfers.
 */
contract GroupTreasury {
    address public immutable admin;
    string  public groupId;

    event Deposited(address indexed from, uint256 amount);
    event Dispersed(address indexed to, uint256 amount);

    error NotAdmin();
    error LengthMismatch();
    error InsufficientBalance();
    error TransferFailed();
    error NoValue();

    constructor(address _admin, string memory _groupId) {
        admin   = _admin;
        groupId = _groupId;
    }

    // ─── Deposit ──────────────────────────────────────────────────────────────

    /// @notice Any member deposits ETH into the group treasury.
    function deposit() external payable {
        if (msg.value == 0) revert NoValue();
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Accept plain ETH transfers (e.g. from a wallet send).
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // ─── Disperse ─────────────────────────────────────────────────────────────

    /**
     * @notice Admin disperses ETH to multiple recipients at once.
     * @param recipients Array of creditor addresses.
     * @param amounts    ETH amounts in wei, parallel to `recipients`.
     */
    function disperse(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        if (msg.sender != admin)                   revert NotAdmin();
        if (recipients.length != amounts.length)   revert LengthMismatch();

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (address(this).balance < total) revert InsufficientBalance();

        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] == 0) continue;
            (bool ok, ) = recipients[i].call{value: amounts[i]}("");
            if (!ok) revert TransferFailed();
            emit Dispersed(recipients[i], amounts[i]);
        }
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

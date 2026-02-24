// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {GroupTreasury} from "./GroupTreasury.sol";

/**
 * @title  GroupTreasuryFactory
 * @notice Deploys one GroupTreasury per SplitBase group.
 *         The frontend calls `deployTreasury` once when the admin
 *         activates treasury mode for a group.
 */
contract GroupTreasuryFactory {
    event TreasuryDeployed(
        string  indexed groupId,
        address         treasury,
        address         admin
    );

    /// groupId (UUID string) → deployed treasury address
    mapping(string => address) public treasuries;

    /**
     * @notice Deploy a new GroupTreasury for `groupId`.
     *         Reverts if a treasury already exists for this group.
     * @param  _admin   The group admin — will be the only address allowed to disperse.
     * @param  _groupId UUID of the SplitBase group (as a string).
     * @return addr     Address of the newly deployed GroupTreasury.
     */
    function deployTreasury(
        address _admin,
        string calldata _groupId
    ) external returns (address addr) {
        require(treasuries[_groupId] == address(0), "Treasury already exists");
        GroupTreasury treasury = new GroupTreasury(_admin, _groupId);
        addr = address(treasury);
        treasuries[_groupId] = addr;
        emit TreasuryDeployed(_groupId, addr, _admin);
    }

    /**
     * @notice Look up the treasury address for a group (returns address(0) if none).
     */
    function getTreasury(string calldata _groupId) external view returns (address) {
        return treasuries[_groupId];
    }
}

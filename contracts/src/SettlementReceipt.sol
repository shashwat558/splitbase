// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  SettlementReceipt
 * @notice Soulbound ERC-721 — minted as proof-of-settlement for SplitBase groups.
 *         Tokens are permanently non-transferable (soul-bound to the recipient).
 *         Metadata is stored fully on-chain as a base64-encoded data URI passed
 *         at mint time — no IPFS, no external dependencies.
 */
contract SettlementReceipt {
    // ─── ERC-721 Storage ─────────────────────────────────────────────────────

    string public constant name   = "SplitBase Settlement Receipt";
    string public constant symbol = "SBSR";

    uint256 private _nextTokenId;

    mapping(uint256 => address)  private _owners;
    mapping(address => uint256)  private _balances;
    mapping(uint256 => string)   private _tokenURIs;

    // ─── Events ──────────────────────────────────────────────────────────────

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event ReceiptMinted(string indexed groupId, address[] recipients, uint256[] tokenIds);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error Soulbound();
    error TokenNotFound();
    error NoRecipients();

    // ─── Mint ─────────────────────────────────────────────────────────────────

    /**
     * @notice Mint a settlement receipt NFT to every member in `recipients`.
     * @param  recipients  Wallet addresses to receive the receipt.
     * @param  uri         Base64-encoded `data:application/json;base64,...` metadata URI.
     * @param  groupId     Off-chain group ID (emitted in event for indexing).
     * @return tokenIds    Array of minted token IDs (one per recipient).
     */
    function mintReceipt(
        address[]       calldata recipients,
        string  calldata uri,
        string  calldata groupId
    ) external returns (uint256[] memory tokenIds) {
        if (recipients.length == 0) revert NoRecipients();

        tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _owners[tokenId]    = recipients[i];
            _balances[recipients[i]]++;
            _tokenURIs[tokenId] = uri;
            tokenIds[i]         = tokenId;
            emit Transfer(address(0), recipients[i], tokenId);
        }

        emit ReceiptMinted(groupId, recipients, tokenIds);
    }

    // ─── ERC-721 Read ────────────────────────────────────────────────────────

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) revert TokenNotFound();
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert TokenNotFound();
        return _tokenURIs[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    // ─── Soulbound — all transfer paths revert ───────────────────────────────

    function transferFrom(address, address, uint256) external pure { revert Soulbound(); }

    function safeTransferFrom(address, address, uint256) external pure { revert Soulbound(); }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert Soulbound(); }

    function approve(address, uint256) external pure { revert Soulbound(); }

    function setApprovalForAll(address, bool) external pure { revert Soulbound(); }

    function getApproved(uint256) external pure returns (address) { return address(0); }

    function isApprovedForAll(address, address) external pure returns (bool) { return false; }

    // ─── ERC-165 ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f || // ERC-721Metadata
            interfaceId == 0x01ffc9a7;   // ERC-165
    }
}

"use client";

export const RECEIPT_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const RECEIPT_CONTRACT_DEPLOYED =
  RECEIPT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";


export const SETTLEMENT_RECEIPT_ABI = [
  {
    type: "function",
    name: "mintReceipt",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "uri",        type: "string"    },
      { name: "groupId",    type: "string"    },
    ],
    outputs: [{ name: "tokenIds", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs:  [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "",        type: "address" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ name: "",      type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs:  [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "",        type: "string"  }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "ReceiptMinted",
    inputs: [
      { name: "groupId",    type: "string",    indexed: true  },
      { name: "recipients", type: "address[]", indexed: false },
      { name: "tokenIds",   type: "uint256[]", indexed: false },
    ],
  },
] as const;

// ─── Metadata Generator ───────────────────────────────────────────────────────

interface ReceiptMetadata {
  groupId:   string;
  groupName: string;
  members:   string[];
  totalETH:  number;
  settledAt: string; // ISO date string
}

function escapeXML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Generate a fully on-chain data URI for the NFT metadata (no embedded image — keeps gas low) */
export function buildTokenURI(meta: ReceiptMetadata): string {
  // Tiny on-chain SVG — just a branded stamp, no embedded data
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#0a0a0a"/><rect x="0" y="0" width="200" height="3" fill="#fff"/><text x="16" y="30" fill="#fff" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="2">SPLITBASE</text><text x="16" y="46" fill="#555" font-family="monospace" font-size="7" letter-spacing="1">SETTLEMENT RECEIPT</text><line x1="16" y1="56" x2="184" y2="56" stroke="#222"/><text x="16" y="76" fill="#888" font-family="monospace" font-size="7">GROUP</text><text x="16" y="90" fill="#fff" font-family="monospace" font-size="11" font-weight="bold">${escapeXML(meta.groupName.toUpperCase().slice(0, 16))}</text><text x="16" y="112" fill="#888" font-family="monospace" font-size="7">AMOUNT</text><text x="16" y="126" fill="#fff" font-family="monospace" font-size="13" font-weight="bold">${meta.totalETH.toFixed(4)} ETH</text><text x="16" y="146" fill="#555" font-family="monospace" font-size="7">BASE SEPOLIA // ${meta.members.length} MEMBERS</text><line x1="16" y1="158" x2="184" y2="158" stroke="#222"/><text x="16" y="172" fill="#444" font-family="monospace" font-size="7">${meta.settledAt}</text><text x="16" y="185" fill="#333" font-family="monospace" font-size="6">SOULBOUND // NON-TRANSFERABLE</text><rect x="0" y="197" width="200" height="3" fill="#fff" opacity="0.15"/></svg>`;

  const svgBase64 = btoa(unescape(encodeURIComponent(svg)));
  const image = `data:image/svg+xml;base64,${svgBase64}`;

  const json = JSON.stringify({
    name:        `SplitBase Receipt: ${meta.groupName}`,
    description: `Soulbound proof of settlement for group "${meta.groupName}" on SplitBase.`,
    image,
    attributes: [
      { trait_type: "Group ID",     value: meta.groupId              },
      { trait_type: "Group Name",   value: meta.groupName            },
      { trait_type: "Total Amount", value: `${meta.totalETH.toFixed(4)} ETH` },
      { trait_type: "Members",      value: meta.members.length       },
      { trait_type: "Settled At",   value: meta.settledAt            },
      { trait_type: "Network",      value: "Base Sepolia"            },
      { trait_type: "Type",         value: "Soulbound"               },
    ],
  });

  const jsonBase64 = btoa(unescape(encodeURIComponent(json)));
  return `data:application/json;base64,${jsonBase64}`;
}

export type { ReceiptMetadata };

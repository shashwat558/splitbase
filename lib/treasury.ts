"use client";

export const TREASURY_FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS ?? "") as `0x${string}`;

export const TREASURY_FACTORY_ABI = [
  {
    name: "deployTreasury",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_admin",   type: "address" },
      { name: "_groupId", type: "string"  },
    ],
    outputs: [{ name: "addr", type: "address" }],
  },
  {
    name: "getTreasury",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_groupId", type: "string" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "TreasuryDeployed",
    type: "event",
    inputs: [
      { name: "groupId",  type: "string",  indexed: true  },
      { name: "treasury", type: "address", indexed: false },
      { name: "admin",    type: "address", indexed: false },
    ],
  },
] as const;


export const GROUP_TREASURY_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "disperse",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts",    type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    name: "getBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "admin",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "groupId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "Deposited",
    type: "event",
    inputs: [
      { name: "from",   type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Dispersed",
    type: "event",
    inputs: [
      { name: "to",     type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

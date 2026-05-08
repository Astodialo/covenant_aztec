import { createLogger } from "@aztec/aztec.js/log";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { type Wallet } from "@aztec/aztec.js/wallet";
import { Fr } from "@aztec/aztec.js/fields";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { registerInitialLocalNetworkAccountsInWallet } from "@aztec/wallets/testing";
import { EmbeddedWallet } from "@aztec/wallets/embedded";
import { PublicKeys } from "@aztec/stdlib/keys";
import { Contract, type DeployOptions } from "@aztec/aztec.js/contracts";

import {
  TreasuryContract,
  TreasuryContractArtifact,
} from "../artifacts/Treasury.js";
import {
  MembersContract,
  MembersContractArtifact,
} from "../artifacts/Members.js";
import {
  GovernanceContract,
  GovernanceContractArtifact,
} from "../artifacts/Governance.js";
import { expect } from "vitest";
import { TokenContract } from "@aztec/noir-contracts.js/Token";
import { NFTContract } from "@aztec/noir-contracts.js/NFT";

import { createStore, type AztecLMDBStoreV2 } from "@aztec/kv-store/lmdb-v2";
import { createPXE, getPXEConfig, type PXE } from "@aztec/pxe/server";
import { randomBytes } from "node:crypto";

export const logger = createLogger("aztec:aztec-standards");

export const LOCAL_NETWORK_DEFAULT_PORT = 8080;
export const DEFAULT_NODE_URL = `http://localhost:${LOCAL_NETWORK_DEFAULT_PORT}`;

const { NODE_URL = DEFAULT_NODE_URL } = process.env;
const { PXE_VERSION = "2" } = process.env;
const pxeVersion = parseInt(PXE_VERSION);

export function getNodeUrl(): string {
  return process.env.NODE_URL ?? DEFAULT_NODE_URL;
}

const node = createAztecNodeClient(NODE_URL);
const l1Contracts = await node.getL1ContractAddresses();
const config = getPXEConfig();
const fullConfig = { ...config, l1Contracts };
fullConfig.proverEnabled = false;

export const setupPXE = async (suffix?: string) => {
  const id = randomBytes(4).toString("hex");
  const storeDir = suffix ? `store-${suffix}-${id}` : `store-${id}`;
  const store: AztecLMDBStoreV2 = await createStore("pxe", pxeVersion, {
    dataDirectory: storeDir,
    dataStoreMapSizeKb: 1e6,
  });
  const pxeNode = createAztecNodeClient(NODE_URL);
  const pxe: PXE = await createPXE(pxeNode, fullConfig, { store });
  return { pxe, store };
};

export const setupTestSuite = async (suffix?: string) => {
  const { pxe, store } = await setupPXE(suffix);
  const aztecNode = createAztecNodeClient(NODE_URL);
  const wallet = await EmbeddedWallet.create(aztecNode, { ephemeral: true });
  const accounts: AztecAddress[] =
    await registerInitialLocalNetworkAccountsInWallet(wallet);
  return { pxe, store, wallet, accounts };
};

export async function deployTreasury(
  publicKeys: PublicKeys,
  wallet: Wallet,
  deployer: AztecAddress,
  salt: Fr = Fr.random(),
  args: unknown[] = [],
  constructor?: string,
  additionalScopes?: AztecAddress[],
): Promise<TreasuryContract> {
  const { contract } = await Contract.deployWithPublicKeys(
    publicKeys,
    wallet,
    TreasuryContractArtifact,
    args,
    constructor,
  ).send({ contractAddressSalt: salt, from: deployer, additionalScopes });
  return contract as TreasuryContract;
}

export async function deployMembers(
  publicKeys: PublicKeys,
  wallet: Wallet,
  deployer: AztecAddress,
  salt: Fr = Fr.random(),
  args: unknown[] = [],
  constructor?: string,
  additionalScopes?: AztecAddress[],
): Promise<MembersContract> {
  const { contract } = await Contract.deployWithPublicKeys(
    publicKeys,
    wallet,
    MembersContractArtifact,
    args,
    constructor,
  ).send({ contractAddressSalt: salt, from: deployer, additionalScopes });
  return contract as MembersContract;
}

export async function deployGovernance(
  publicKeys: PublicKeys,
  wallet: Wallet,
  deployer: AztecAddress,
  salt: Fr = Fr.random(),
  args: unknown[] = [],
  constructor?: string,
  additionalScopes?: AztecAddress[],
): Promise<GovernanceContract> {
  const { contract } = await Contract.deployWithPublicKeys(
    publicKeys,
    wallet,
    GovernanceContractArtifact,
    args,
    constructor,
  ).send({ contractAddressSalt: salt, from: deployer, additionalScopes });
  return contract as GovernanceContract;
}

// --- Token Utils ---
export const expectUintNote = (
  note: { items: Fr[] },
  amount: bigint,
  _owner: AztecAddress,
) => {
  expect(note.items[0]).toEqual(new Fr(amount));
};

// Maximum value for a u128 (2**128 - 1)
export const MAX_U128_VALUE = 340282366920938463463374607431768211455n;

export const expectTokenBalances = async (
  token: TokenContract,
  address: AztecAddress,
  publicBalance: bigint | number | Fr,
  privateBalance: bigint | number | Fr,
  caller?: AztecAddress,
) => {
  const aztecAddress = address instanceof AztecAddress ? address : address;
  logger.info('checking balances for', aztecAddress.toString());
  const from = caller ? caller : aztecAddress;

  const toBigInt = (val: bigint | number | Fr) => {
    if (typeof val === 'bigint') return val;
    if (typeof val === 'number') return BigInt(val);
    if (val instanceof Fr) return val.toBigInt();
    throw new Error('Unsupported type for balance');
  };

  const { result: publicBal } = await token.methods.balance_of_public(aztecAddress).simulate({ from });
  const { result: privateBal } = await token.methods.balance_of_private(aztecAddress).simulate({ from });
  expect(publicBal).toBe(toBigInt(publicBalance));
  expect(privateBal).toBe(toBigInt(privateBalance));
};

export const AMOUNT = 1000n;
export const wad = (n: number = 1) => AMOUNT * BigInt(n);

export async function deployTokenWithMinter(wallet: Wallet, deployer: AztecAddress, options?: DeployOptions) {
  const { contract } = await Contract.deploy(
    wallet,
    TokenContract.artifact,
    [deployer, 'PrivateToken', 'PT', 18],
    'constructor',
  ).send({ ...options, from: deployer });
  return contract as TokenContract;
}

export async function deployTokenWithInitialSupply(wallet: Wallet, deployer: AztecAddress, options?: DeployOptions) {
  const { contract } = await Contract.deploy(
    wallet,
    TokenContract.artifact,
    [deployer, 'PrivateToken', 'PT', 18],
    'constructor',
  ).send({ ...options, from: deployer });
  return contract as TokenContract;
}

// --- NFT Utils ---

export async function assertOwnsPublicNFT(
  nft: NFTContract,
  tokenId: bigint,
  expectedOwner: AztecAddress,
  expectToBeTrue: boolean,
  caller?: AztecAddress,
) {
  const from = caller ? caller : expectedOwner;
  const { result: owner } = await nft.methods.owner_of(tokenId).simulate({ from });
  expect(owner.equals(expectedOwner)).toBe(expectToBeTrue);
}

export async function assertOwnsPrivateNFT(
  nft: NFTContract,
  tokenId: bigint,
  owner: AztecAddress,
  expectToBeTrue: boolean,
  caller?: AztecAddress,
) {
  const from = caller ? caller : owner;
  const { result: [nfts, _] } = await nft.methods.get_private_nfts(owner, 0).simulate({ from });
  const hasNFT = nfts.some((id: bigint) => id === tokenId);
  expect(hasNFT).toBe(expectToBeTrue);
}

export async function deployNFTWithMinter(wallet: EmbeddedWallet, deployer: AztecAddress, options?: DeployOptions) {
  const { contract } = await Contract.deploy(
    wallet,
    NFTContract.artifact,
    [deployer, 'TestNFT', 'TNFT'],
    'constructor',
  ).send({ ...options, from: deployer });
  return contract as NFTContract;
}

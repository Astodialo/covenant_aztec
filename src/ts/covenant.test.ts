import { GovernanceContract, GovernanceContractArtifact } from "../artifacts/Governance.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EmbeddedWallet } from "@aztec/wallets/embedded";
import {
  assertOwnsPrivateNFT,
  deployGovernance,
  deployMembers,
  deployNFTWithMinter,
  deployTokenWithMinter,
  deployTreasury,
  expectTokenBalances,
  setupTestSuite,
} from "./utils.js";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import { Fr, GrumpkinScalar } from "@aztec/aztec.js/fields";
import { deriveKeys, PublicKeys } from "@aztec/stdlib/keys";
import { TokenContract } from "@aztec/noir-contracts.js/Token";
import { NFTContract } from "@aztec/noir-contracts.js/NFT";
import { TreasuryContract, TreasuryContractArtifact } from "../artifacts/Treasury.js";
import { MembersContract, MembersContractArtifact } from "../artifacts/Members.js";
import { getContractInstanceFromInstantiationParams } from "@aztec/stdlib/contract";
import { type AztecLMDBStoreV2 } from "@aztec/kv-store/lmdb-v2";
import { type PXE } from "@aztec/pxe/server";

describe("Gov Contract", () => {
  let pxe: PXE;
  let store: AztecLMDBStoreV2;

  let wallet: EmbeddedWallet;
  let accounts: AztecAddress[];

  let alice: AztecAddress;
  let bob: AztecAddress;
  let charlie: AztecAddress;
  let token: TokenContract;
  let nft: NFTContract;

  const AMOUNT = 1000n;
  const wad = (n: number = 1) => AMOUNT * BigInt(n);

  let treasury: TreasuryContract;
  let treasSk: Fr;
  let treasKeys: {
    masterNullifierHidingKey: GrumpkinScalar;
    masterIncomingViewingSecretKey: GrumpkinScalar;
    masterOutgoingViewingSecretKey: GrumpkinScalar;
    masterTaggingSecretKey: GrumpkinScalar;
    publicKeys: PublicKeys;
  };
  let treasSalt: Fr;

  let members: MembersContract;
  let memSk: Fr;
  let memKeys: {
    masterNullifierHidingKey: GrumpkinScalar;
    masterIncomingViewingSecretKey: GrumpkinScalar;
    masterOutgoingViewingSecretKey: GrumpkinScalar;
    masterTaggingSecretKey: GrumpkinScalar;
    publicKeys: PublicKeys;
  };
  let memSalt: Fr;

  let gov: GovernanceContract;
  let govSk: Fr;
  let govKeys: {
    masterNullifierHidingKey: GrumpkinScalar;
    masterIncomingViewingSecretKey: GrumpkinScalar;
    masterOutgoingViewingSecretKey: GrumpkinScalar;
    masterTaggingSecretKey: GrumpkinScalar;
    publicKeys: PublicKeys;
  };
  let govSalt: Fr;

  beforeEach(async () => {
    ({ pxe, store, wallet, accounts } = await setupTestSuite());

    [alice, bob, charlie] = accounts;

    treasSk = Fr.random();
    treasKeys = await deriveKeys(treasSk);
    treasSalt = Fr.random();

    govSk = Fr.random();
    govKeys = await deriveKeys(govSk);
    govSalt = Fr.random();

    memSk = Fr.random();
    memKeys = await deriveKeys(memSk);
    memSalt = Fr.random();

    // Pre-register governance so its keys are in PXE before the constructor runs.
    const govPreInstance = await getContractInstanceFromInstantiationParams(GovernanceContractArtifact, {
      constructorArgs: [],
      constructorArtifact: "constructor",
      salt: govSalt,
      publicKeys: govKeys.publicKeys,
      deployer: alice,
    });
    await wallet.registerContract(govPreInstance, GovernanceContractArtifact, govSk);

    gov = (await deployGovernance(
      govKeys.publicKeys,
      wallet,
      alice,
      govSalt,
      [],
      "constructor",
      [govPreInstance.address],
    )) as GovernanceContract;

    // Pre-register treasury.
    const treasPreInstance = await getContractInstanceFromInstantiationParams(TreasuryContractArtifact, {
      constructorArgs: [gov.address],
      constructorArtifact: "constructor",
      salt: treasSalt,
      publicKeys: treasKeys.publicKeys,
      deployer: alice,
    });
    await wallet.registerContract(treasPreInstance, TreasuryContractArtifact, treasSk);

    treasury = (await deployTreasury(
      treasKeys.publicKeys,
      wallet,
      alice,
      treasSalt,
      [gov.address],
      "constructor",
      [treasPreInstance.address],
    )) as TreasuryContract;

    // Pre-register members.
    const memPreInstance = await getContractInstanceFromInstantiationParams(MembersContractArtifact, {
      constructorArgs: [gov.address, alice, 2, 2, 2, alice, 2, 0n, alice],
      constructorArtifact: "constructor",
      salt: memSalt,
      publicKeys: memKeys.publicKeys,
      deployer: alice,
    });
    await wallet.registerContract(memPreInstance, MembersContractArtifact, memSk);

    members = (await deployMembers(
      memKeys.publicKeys,
      wallet,
      alice,
      memSalt,
      [gov.address, alice, 2, 2, 2, alice, 2, 0n, alice],
      "constructor",
      [memPreInstance.address],
    )) as MembersContract;

    await gov
      .withWallet(wallet)
      .methods.add_treasury(treasury.address)
      .send({ from: alice, additionalScopes: [gov.address] });

    await gov
      .withWallet(wallet)
      .methods.add_mem_contract(members.address)
      .send({ from: alice, additionalScopes: [gov.address] });

    token = (await deployTokenWithMinter(wallet, alice)) as TokenContract;

    await token
      .withWallet(wallet)
      .methods.mint_to_private(treasury.address, AMOUNT)
      .send({ from: alice, additionalScopes: [treasury.address] });
  });

  afterEach(async () => {
    await store.delete();
  });


  it("Deploys", async () => {
    const { result: current_id } = await gov.methods._view_current_id().simulate({
      from: alice,
      additionalScopes: [gov.address],
    });

    const { result: current_treasury } = await gov.methods._view_treasury().simulate({
      from: alice,
      additionalScopes: [gov.address],
    });

    const { result: current_mem_contract } = await gov.methods
      ._view_mem_contract()
      .simulate({
        from: alice,
        additionalScopes: [gov.address],
      });

    const { result: memmetis } = await members.methods._view_member(alice).simulate({
      from: alice,
      additionalScopes: [members.address],
    });

    console.log(memmetis.hatted);
    console.log(alice);

    // starting counter's value is 0
    expect(current_id).toStrictEqual(0n);

    expect(current_treasury).toStrictEqual(treasury.address);

    expect(current_mem_contract).toStrictEqual(members.address);

    expect(memmetis.hatted.toBigInt()).toStrictEqual(alice.toBigInt());
  });

  it("withdraw directly from treasury as bob, should fail", async () => {
    await expect(
      treasury
        .withWallet(wallet)
        .methods.withdraw(token.address, AMOUNT, bob)
        .send({ from: bob, additionalScopes: [treasury.address] }),
    ).rejects.toThrow(/Assertion failed: Not authorized/);
  });

  it("create token proposal from member, should succeed", async () => {
    console.log("start");
    await gov
      .withWallet(wallet)
      .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1n)
      .send({ from: alice, additionalScopes: [gov.address, members.address] });

    const { result: proposal } = await gov.methods._view_token_proposal(0n).simulate({
      from: alice,
      additionalScopes: [gov.address],
    });

    console.log("proposal:", proposal);

    expect(proposal.proposal_id).toStrictEqual(0n);
    expect(proposal.votes).toStrictEqual(0n);

    const { result: new_id } = await gov.methods._view_current_id().simulate({
      from: alice,
      additionalScopes: [gov.address],
    });
    //
    // After a new proposal has been created it should 1
    expect(new_id).toStrictEqual(1n);
  });

  it("create proposal from non member, should fail", async () => {
    await expect(
      gov
        .withWallet(wallet)
        .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
        .send({ from: bob, additionalScopes: [gov.address, members.address] }),
    ).rejects.toThrow(/Assertion failed: Not a member/);

    const { result: current_id } = await gov.methods._view_current_id().simulate({
      from: alice,
      additionalScopes: [gov.address],
    });
    //
    // After a new proposal has been created it should 1
    expect(current_id).toStrictEqual(0n);
  });

  describe("voting", async () => {
    beforeEach(async () => {
      await gov
        .withWallet(wallet)
        .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 2)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });
    });

    it("vote on token proposal from member, should succeed", async () => {
      await gov
        .withWallet(wallet)
        .methods.cast_vote(0n, 1)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      const { result: new_proposal } = await gov.methods
        ._view_token_proposal(0n)
        .simulate({ from: alice, additionalScopes: [gov.address] });

      expect(new_proposal.votes).toStrictEqual(1n);
      expect(new_proposal.final).toStrictEqual(false);
    });
    it("vote on token proposal from 2 members and finalize proposal, should succeed", async () => {
      await gov
        .withWallet(wallet)
        .methods.add_member(bob, 2, 2, 2, bob, 2, 1, bob)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await gov
        .withWallet(wallet)
        .methods.cast_vote(0n, 1)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      const { result: new_proposal } = await gov.methods
        ._view_token_proposal(0n)
        .simulate({ from: alice, additionalScopes: [gov.address] });

      expect(new_proposal.votes).toStrictEqual(1n);
      expect(new_proposal.final).toStrictEqual(false);

      await gov.withWallet(wallet).methods.cast_vote(0n, 1).send({ from: bob, additionalScopes: [gov.address, members.address] });

      const { result: nn_proposal } = await gov.methods
        ._view_token_proposal(0n)
        .simulate({ from: alice, additionalScopes: [gov.address] });

      expect(nn_proposal.final).toStrictEqual(true);
      expect(nn_proposal.votes).toStrictEqual(2n);
    });
    it("vote on proposal from member a second time, should fail", async () => {
      await gov
        .withWallet(wallet)
        .methods.cast_vote(0n, 1)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      const { result: new_proposal } = await gov.methods
        ._view_token_proposal(0n)
        .simulate({ from: alice, additionalScopes: [gov.address] });

      expect(new_proposal.votes).toStrictEqual(1n);
      await expect(
        gov.withWallet(wallet).methods.cast_vote(0n, 1).send({ from: alice, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow("Invalid tx: Existing nullifier");

      await expect(
        gov.withWallet(wallet).methods.cast_vote(0n, 0).send({ from: alice, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow("Invalid tx: Existing nullifier");
    });

    it("vote on proposal from non member, should fail", async () => {
      await expect(
        gov.withWallet(wallet).methods.cast_vote(0n, 1).send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);

      const { result: current_id } = await gov.methods._view_current_id().simulate({
        from: alice,
        additionalScopes: [gov.address],
      });

      // After a new proposal has been created it should be 1
      expect(current_id).toStrictEqual(1n);
    });
  });

  describe("members", async () => {
    beforeEach(async () => {
      await gov
        .withWallet(wallet)
        .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 2)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });
    });

    it("member adds a new member(bob), should succeed", async () => {
      await expect(
        gov
          .withWallet(wallet)
          .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);

      await gov
        .withWallet(wallet)
        .methods.add_member(bob, 2, 2, 2, bob, 2, 1, bob)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      const { result: bob_hat } = await members.methods._view_member(bob).simulate({
        from: alice,
        additionalScopes: [members.address],
      });

      expect(bob_hat.hatted.toBigInt()).toStrictEqual(bob.toBigInt());

      await gov
        .withWallet(wallet)
        .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
        .send({ from: bob, additionalScopes: [gov.address, members.address] });

      const { result: proposal_id } = await gov.methods
        ._view_current_id()
        .simulate({ from: alice, additionalScopes: [gov.address] });

      expect(proposal_id).toStrictEqual(2n);
    });

    it("not a member adds a new member(bob), should fail", async () => {
      await expect(
        gov
          .withWallet(wallet)
          .methods.add_member(bob, 2, 2, 2, bob, 2, 1, bob)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);

      await gov
        .withWallet(wallet)
        .methods.add_member(bob, 2, 2, 2, bob, 2, 1, bob)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await expect(
        gov
          .withWallet(wallet)
          .methods.add_member(charlie, 2, 2, 2, charlie, 2, 2, charlie)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not captain/);

      await expect(
        gov
          .withWallet(wallet)
          .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
          .send({ from: charlie, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);
    });

    it("captain removes a member, should succeed", async () => {
      await expect(
        gov
          .withWallet(wallet)
          .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);

      await gov
        .withWallet(wallet)
        .methods.add_member(bob, 2, 2, 2, bob, 2, 1, bob)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await gov
        .withWallet(wallet)
        .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
        .send({ from: bob, additionalScopes: [gov.address, members.address] });

      const { result: proposal_id } = await gov.methods
        ._view_current_id()
        .simulate({ from: alice, additionalScopes: [gov.address] });

      expect(proposal_id).toStrictEqual(2n);

      await gov
        .withWallet(wallet)
        .methods.remove_member(bob)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await expect(
        gov
          .withWallet(wallet)
          .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);
    });

    it("not captain removes a member, should fail", async () => {
      await expect(
        gov
          .withWallet(wallet)
          .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);

      await gov
        .withWallet(wallet)
        .methods.add_member(bob, 2, 2, 2, bob, 2, 1, bob)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await gov
        .withWallet(wallet)
        .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
        .send({ from: bob, additionalScopes: [gov.address, members.address] });

      const { result: proposal_id } = await gov.methods
        ._view_current_id()
        .simulate({ from: alice, additionalScopes: [gov.address] });

      expect(proposal_id).toStrictEqual(2n);

      await expect(
        gov.withWallet(wallet).methods.remove_member(bob)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not captain/);

      await gov
        .withWallet(wallet)
        .methods.remove_member(bob)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await expect(
        gov
          .withWallet(wallet)
          .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
          .send({ from: bob, additionalScopes: [gov.address, members.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      await gov
        .withWallet(wallet)
        .methods.create_token_proposal(token.address, AMOUNT, false, 0n, bob, 1)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });
    });

    it("proposal finalized, member should be able to withdraw", async () => {
      await expectTokenBalances(token, treasury.address, wad(0), AMOUNT, treasury.address);
      await expectTokenBalances(token, bob, wad(0), wad(0));

      await gov
        .withWallet(wallet)
        .methods.cast_vote(0n, 1)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await gov.withWallet(wallet).methods.withdraw(0n)
        .send({ from: alice, additionalScopes: [gov.address, members.address, treasury.address] });

      await expectTokenBalances(token, treasury.address, wad(0), wad(0), treasury.address);
      await expectTokenBalances(token, bob, wad(0), AMOUNT);
    });

    it("proposal NOT finalized, member should NOT be able to withdraw", async () => {
      await expectTokenBalances(token, treasury.address, wad(0), AMOUNT, treasury.address);
      await expectTokenBalances(token, bob, wad(0), wad(0));

      await expect(
        gov.withWallet(wallet).methods.withdraw(0n)
          .send({ from: alice, additionalScopes: [gov.address, members.address, treasury.address] }),
      ).rejects.toThrow(/Assertion failed: Proposal not finalized/);

      await expectTokenBalances(token, treasury.address, wad(0), AMOUNT, treasury.address);
      await expectTokenBalances(token, bob, wad(0), wad(0));
    });

    it("not a member should NOT be able to withdraw", async () => {
      await expectTokenBalances(token, treasury.address, wad(0), AMOUNT, treasury.address);
      await expectTokenBalances(token, bob, wad(0), wad(0));

      await expect(
        gov.withWallet(wallet).methods.withdraw(0n)
          .send({ from: bob, additionalScopes: [gov.address, members.address, treasury.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);

      await expectTokenBalances(token, treasury.address, wad(0), AMOUNT, treasury.address);
      await expectTokenBalances(token, bob, wad(0), wad(0));
    });
  });
  describe("withdraw NFT", () => {
    let tokenId: bigint;

    beforeEach(async () => {
      tokenId = 1n;
      nft = (await deployNFTWithMinter(wallet, alice)) as NFTContract;
      await nft
        .withWallet(wallet)
        .methods.mint(alice, tokenId)
        .send({ from: alice });
      await nft
        .withWallet(wallet)
        .methods.transfer_to_private(treasury.address, tokenId)
        .send({ from: alice, additionalScopes: [treasury.address] });

      await gov
        .withWallet(wallet)
        .methods.create_token_proposal(nft.address, AMOUNT, true, tokenId, bob, 1)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });
    });

    it("member should be able to withdraw NFT correctly", async () => {
      await assertOwnsPrivateNFT(nft, tokenId, treasury.address, true, treasury.address);
      await assertOwnsPrivateNFT(nft, tokenId, bob, false);

      await gov
        .withWallet(wallet)
        .methods.cast_vote(0n, 1)
        .send({ from: alice, additionalScopes: [gov.address, members.address] });

      await gov.withWallet(wallet).methods.withdraw(0n)
        .send({ from: alice, additionalScopes: [gov.address, members.address, treasury.address] });

      await assertOwnsPrivateNFT(nft, tokenId, treasury.address, false, treasury.address);
      await assertOwnsPrivateNFT(nft, tokenId, bob, true);
    });

    it("not a member should NOT be able to withdraw NFT", async () => {
      await assertOwnsPrivateNFT(nft, tokenId, treasury.address, true, treasury.address);
      await assertOwnsPrivateNFT(nft, tokenId, bob, false);

      await expect(
        gov.withWallet(wallet).methods.withdraw(0n)
          .send({ from: bob, additionalScopes: [gov.address, members.address, treasury.address] }),
      ).rejects.toThrow(/Assertion failed: Not a member/);

      await assertOwnsPrivateNFT(nft, tokenId, treasury.address, true, treasury.address);
      await assertOwnsPrivateNFT(nft, tokenId, bob, false);
    });
  });
});

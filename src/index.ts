import algosdk, { makeAssetTransferTxnWithSuggestedParamsFromObject, makePaymentTxnWithSuggestedParamsFromObject } from "algosdk";
import * as algokit from "@algorandfoundation/algokit-utils";
import { SMART_CONTRACT_ARC_32 } from "./client";
import{ MNEMONIC_KEY } from "./secret-key"
import { AppClient } from "@algorandfoundation/algokit-utils/types/app-client";

// The app ID to interact with.
const appId = 736014374;

async function loadClient() {
  const client = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: "https://testnet-api.algonode.cloud",
    },
    indexerConfig: {
      server: "https://testnet-idx.algonode.cloud",
    },
  });

  return client;
}

async function loadAccount() {
  const client = await loadClient();
  const account = client.account.fromMnemonic(MNEMONIC_KEY);

  return account;
}

async function claimAsset(appId: number) {
  const client = await loadClient();
  console.log('Loading account...');
  const account = await loadAccount();
  console.log('Account loaded', account.addr)

  const appClient = new AppClient({
      appId: BigInt(appId),
      appSpec: JSON.stringify(SMART_CONTRACT_ARC_32),
      algorand: client,
  });

  const suggestedParams = await client.client.algod.getTransactionParams().do();

  const atc = new algosdk.AtomicTransactionComposer();

  const globalState = await appClient.getGlobalState();
  const assetId = globalState.asset.value;
  console.log(assetId);

  /**
   * Opt into asset
   */
  const assetOptinTxn = makeAssetTransferTxnWithSuggestedParamsFromObject({
      amount: 0,
      from: account.addr,
      to: account.addr,
      suggestedParams,
      assetIndex: Number(assetId),
  });

  atc.addTransaction({
      txn: assetOptinTxn,
      signer: account.signer,
  });

  /**
   * Call asset claim
   */
  console.log('Claiming asset...')
  atc.addMethodCall({
      method: appClient.getABIMethod('claimAsset'),
      suggestedParams: {
          ...suggestedParams,
          fee: 3_000,
      },
      sender: account.addr,
      signer: account.signer,
      appID: appId,
      appForeignAssets: [Number(assetId)],
  });

  const response = await atc.execute(client.client.algod, 8);
  console.log(response);
  console.log('Asset claimed');

  const assetBalance = await client.client.algod.accountAssetInformation(account.addr, Number(assetId)).do();

  console.log('Asset balance', assetBalance);
}

async function main() {
  await claimAsset(Number(appId));
}

main();
// My Account Address: 3JW2EMYGSMDX5C3Y4OHRXULN2H6L5DJLJNMLPURTSLXZTOWKIICR3BMKNA
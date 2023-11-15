import { Contract } from '@algorandfoundation/tealscript';

type Token = {
  owner: Address;
  count: uint<64>;
  available: uint<64>;
  retired: uint<64>;
};

// eslint-disable-next-line no-unused-vars
class Main extends Contract {
  index = GlobalStateKey<uint64>();

  registeredAsaId = GlobalStateKey<Asset>();

  tokenBox = BoxMap<uint64, Token>();

  createPool(): Asset {
    verifyTxn(this.txn, { sender: this.app.creator });
    const registeredAsa = sendAssetCreation({
      configAssetName: 'Enermile Pool Token',
      configAssetUnitName: 'MILE',
      configAssetTotal: 1_000_000,
      configAssetManager: this.app.address,
    });
    this.registeredAsaId.value = registeredAsa;
    return registeredAsa;
  }

  private transferTo(to: Address, tokenId: uint<64>): void {
    this.tokenBox(tokenId).value.owner = to;
  }

  private addAttributes(tokenId: uint64, mwh: uint64, available: uint64, retired: uint64): void {
    this.tokenBox(tokenId).value.count = mwh;
    this.tokenBox(tokenId).value.available = available;
    this.tokenBox(tokenId).value.retired = retired;
  }

  mint(to: Address, mwh: uint64): void {
    const index = this.index.value;
    const token: Token = {
      owner: to,
      count: mwh,
      available: 0,
      retired: 0,
    };
    this.tokenBox(index).value = token;
    this.addAttributes(index, mwh, 0, 0);
    this.transferTo(to, index);
    this.index.value = index + 1;
  }

  retire(tokenId: uint64): void {
    assert(this.txn.sender === this.tokenBox(tokenId).value.owner);
    this.tokenBox(tokenId).value.retired = 1;
  }

  // eslint-disable-next-line no-unused-vars
  deposit(tokenId: uint64, registeredASA: Asset): void {
    assert(this.txn.sender === this.tokenBox(tokenId).value.owner);
    assert(this.tokenBox(tokenId).value.retired !== 1);
    assert(this.tokenBox(tokenId).value.available !== 1);
    this.tokenBox(tokenId).value.available = 1;
    sendAssetTransfer({
      xferAsset: this.registeredAsaId.value,
      assetReceiver: this.txn.sender,
      assetAmount: this.tokenBox(tokenId).value.count,
    });
  }

  // eslint-disable-next-line no-unused-vars
  withdraw(txn: AssetTransferTxn, tokenId: uint64, registeredASA: Asset): void {
    assert(this.tokenBox(tokenId).value.available === 1);
    const price = this.tokenBox(tokenId).value.count;

    verifyTxn(txn, {
      assetReceiver: this.app.address,
      xferAsset: this.registeredAsaId.value,
      assetAmount: price,
    });

    this.tokenBox(tokenId).value.available = 0;
    this.transferTo(this.txn.sender, tokenId);
  }
}

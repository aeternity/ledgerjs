/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/
//@flow

// FIXME drop:
import { splitPath, foreach } from "./utils";
import type Transport from "@ledgerhq/hw-transport";

const CLA = 0xe0;
const GET_ADDRESS = 0x02;
const SIGN_TRANSACTION = 0x04;
const GET_APP_CONFIGURATION = 0x06;
const SIGN_PERSONAL_MESSAGE = 0x08;

/**
 * aeternity API
 *
 * @example
 * import Ae from "@aeternity/ledger-app-api";
 * const ae = new Ae(transport)
 */
export default class Ae {
  transport: Transport<*>;

  constructor(transport: Transport<*>, scrambleKey: string = "w0w") {
    this.transport = transport;
    transport.decorateAppAPIMethods(
      this,
      [
        "getAddress",
        "signTransaction",
        "signPersonalMessage",
        "getAppConfiguration"
      ],
      scrambleKey
    );
  }

  /**
   * get aeternity address for a given account index.
   * @param accountIndex
   * @return address
   * @example
   * ae.getAddress(0).then(address => ...)
   */
  async getAddress(accountIndex: number): Promise<string> {
    const buffer = new Buffer(4);
    buffer.writeUInt32BE(accountIndex, 0);
    const response = await this.transport.send(
      CLA,
      GET_ADDRESS,
      0x00,
      0x00,
      buffer
    );
    const addressLength = response[0];
    return `ak_${response.slice(1, 1 + addressLength).toString("ascii")}`;
  }

  /**
   * You can sign a transaction and retrieve signature given the raw transaction and the index of the account to sign
   * @example
   ae.signTransaction(0, "e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080").then(signature => ...)
   */
  async signTransaction(
    accountIndex: number,
    rawTxHex: string
  ): Promise<string> {
    let offset = 0;
    const rawTx = new Buffer(rawTxHex, "hex");
    const toSend = [];
    while (offset !== rawTx.length) {
      const maxChunkSize = offset === 0 ? 150 - 4 : 150;
      const chunkSize =
        offset + maxChunkSize > rawTx.length
          ? rawTx.length - offset
          : maxChunkSize;
      const buffer = new Buffer(offset === 0 ? 4 + chunkSize : chunkSize);
      if (offset === 0) {
        buffer.writeUInt32BE(accountIndex, 0);
        rawTx.copy(buffer, 4, offset, offset + chunkSize);
      } else {
        rawTx.copy(buffer, 0, offset, offset + chunkSize);
      }
      toSend.push(buffer);
      offset += chunkSize;
    }
    const response = await toSend.reduce(
      (p, data, i) =>
        p.then(() =>
          this.transport.send(
            CLA,
            SIGN_TRANSACTION,
            i === 0 ? 0x00 : 0x80,
            0x00,
            data
          )
        ),
      Promise.resolve(new Buffer([]))
    );
    return response.slice(0, 64).toString("hex");
  }

  /**
   */
  getAppConfiguration(): Promise<{
    arbitraryDataEnabled: number,
    version: string
  }> {
    return this.transport
      .send(CLA, GET_APP_CONFIGURATION, 0x00, 0x00)
      .then(response => {
        let result = {};
        result.arbitraryDataEnabled = response[0] & 0x01;
        result.version =
          "" + response[1] + "." + response[2] + "." + response[3];
        return result;
      });
  }

  /**
  * You can sign a message according to eth_sign RPC call and retrieve v, r, s given the message and the BIP 32 path of the account to sign.
  * @example
ae.signPersonalMessage("44'/60'/0'/0/0", Buffer.from("test").toString("hex")).then(result => {
  var v = result['v'] - 27;
  v = v.toString(16);
  if (v.length < 2) {
    v = "0" + v;
  }
  console.log("Signature 0x" + result['r'] + result['s'] + v);
})
   */
  signPersonalMessage(
    path: string,
    messageHex: string
  ): Promise<{
    v: number,
    s: string,
    r: string
  }> {
    let paths = splitPath(path);
    let offset = 0;
    let message = new Buffer(messageHex, "hex");
    let toSend = [];
    let response;
    while (offset !== message.length) {
      let maxChunkSize = offset === 0 ? 150 - 1 - paths.length * 4 - 4 : 150;
      let chunkSize =
        offset + maxChunkSize > message.length
          ? message.length - offset
          : maxChunkSize;
      let buffer = new Buffer(
        offset === 0 ? 1 + paths.length * 4 + 4 + chunkSize : chunkSize
      );
      if (offset === 0) {
        buffer[0] = paths.length;
        paths.forEach((element, index) => {
          buffer.writeUInt32BE(element, 1 + 4 * index);
        });
        buffer.writeUInt32BE(message.length, 1 + 4 * paths.length);
        message.copy(
          buffer,
          1 + 4 * paths.length + 4,
          offset,
          offset + chunkSize
        );
      } else {
        message.copy(buffer, 0, offset, offset + chunkSize);
      }
      toSend.push(buffer);
      offset += chunkSize;
    }
    return foreach(toSend, (data, i) =>
      this.transport
        .send(CLA, SIGN_PERSONAL_MESSAGE, i === 0 ? 0x00 : 0x80, 0x00, data)
        .then(apduResponse => {
          response = apduResponse;
        })
    ).then(() => {
      const v = response[0];
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return { v, r, s };
    });
  }
}

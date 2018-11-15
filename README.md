# æternity ledger app api
[![Build Status](https://api.travis-ci.org/aeternity/ledger-app-api.svg?branch=master)](https://api.travis-ci.org/aeternity/ledger-app-api)
[![npm](https://img.shields.io/npm/v/@aeternity/ledger-app-api.svg)](https://www.npmjs.com/package/@aeternity/ledger-app-api)
[![npm](https://img.shields.io/npm/l/@aeternity/ledger-app-api.svg)](https://www.npmjs.com/package/@aeternity/ledger-app-api)

## Overview
This is the API to the [æternity ledger app](https://github.com/aeternity/ledger-app). With this API, you can communicate directly with the æternity ledger app and use embedded features such as requesting an address or signing transaction.

Each call to the API can trigger an UI response to the Ledger app, where the user will be able to validate the request.

## Installation & Usage
Install the æternity ledger app api via [npm](https://www.npmjs.com/)
```
npm install @aeternity/ledger-app-api
```
Import the æternity ledger app api and transport u2f
```js
import Ae from "@aeternity/ledger-app-api";
import TransportU2F from "@ledgerhq/hw-transport-u2f";
```
Here's an example of a api usage:
```js
const transport = await TransportU2F.create();
const ae = new Ae(transport);
let address = await ae.getAddress(0);
```

## Documentation
Full documentation can be found at [aeternity.github.io/ledger-app-api](https://aeternity.github.io/ledger-app-api/)

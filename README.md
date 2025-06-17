# statuslist-agent

The StatusList Agent serves status-lists according to the https://www.w3.org/TR/vc-bitstring-status-list W3C bitstring status list specification.

The agent connects to a PostGreSQL database to potentially store the revocation or suspension state of arbitrary credentials (not implemented yet).

## Installation

Install the agent using yarn:

```bash
yarn install
```

Then configure the tool using the supplied `.env.example`. The following options are supported:

- DB_HOST: database host
- DB_USER: database user
- DB_PASSWORD: database user password
- DB_NAME: database name
- DB_SCHEMA: schema name
- KEY_FILE: local file defining the status agent did:web key data
- PORT: port to listen to
- LISTEN_ADDRESS: interface to listen to
- BASEURL: base url for the agent

Please note that the StatusList agent does not use a database to store did identifiers or key material. The only key stored is the generic statuslist agent did:web key, which is hosted at the `/.well-known/did.json` endpoint. The key data, including the private key, is stored in a local file, which should be properly protected from prying eyes.

### Key Configuration

The local key file contains key material for the `did:web` implementation:

```json
{
    "name": "did:web:fullname",
    "privateKeyHex": "hex encoded private key material",
    "type": "key type, one of Secp256r1, Secp256k1, Ed25519"
}
```

Generate the appropiate private key hex material separately. You can use the included `generateKey` script for that:

```bash
npm run key Ed25519
```

which generates a Ed25519 private key in hex encoded format.

Please note that the `name` field in the key configuration specifies the `did:web` and as such contains a DNS name that must match the DNS name of the environment. If this does not match, add a reverse proxy configuration for the well-known path on the actual domain of the `did:web` to the statuslist agent well-known path.

### StatusList configuration

Statuslists are configured in the `conf/lists` directory using a separate configuration file for each list.

```json
{
    "name": "path name for this statuslist, excluding the initial slash",
    "token": "administrative bearer token for admin api",
    "size": <numeric value of the number of bits, in steps of 8, greater or equal to 131072>,
    "purpose": "list purpose, one of revocation, suspension"
}
```

## Endpoints

The statuslist agent the following endpoints:

- `GET /.well-known/did.json`: endpoint to serve the DIDDocument of the `did:web` key implementation (if a did:web is implemented)
- `GET /<statuslist-name>/<index>`: endpoint to retrieve the statuslist VC containing the statuslist encodedList data
- `POST /<statuslist-name>/api/index`: reserve a bit on this status list
- `POST /<statuslist-name>/api/revoke`: revoke or unrevoke a status of a status list element
- `POST /<statuslist-name>/api/status`: set the new status of a status list element
- `GET /<statuslist-name>/api/status/<list index>/<element index>`: get the status value of a status list element

### Reserving an element

`POST /<statuslist-name>/api/index`

Request object:

```json
{
    expirationDate: <string date/time representation YYYY-MM-DD HH:ii:ss>
}
```

Response object:

```json
{
    "index": <element index>,
    "purpose": <configured status list purpose>,
    "size": <total bit size>,
    "id": <unique URI for this bit>,
    "url": <status list JWT URL>
}
```

This call reserves a random element on the status list. If the status list is too full, a new list with a new index is automatically created. The default status of the new element is `0/false/unrevoked`. The total bit size is the number of elements multiplied by the status list bit size, which is `1` by default.

Example response: 

```json
{
    "index": 73124,
    "purpose": "revocation",
    "size": 262144,
    "id": "http://example.com/statlist/1#73124",
    "url": "http://example.com/statlist/1"
}
```

### Revoking an element

`POST /<statuslist-name>/api/revoke`

Request object:

```json
{
    list: <list URL>,
    index: <element index>,
    status: <string value: revoked or unrevoked>
}
```

Response object:

```json
{
    "status": <status change indication>
}
```

The `list` value must be the `url` value from the reservation step. This must match the `statuslist-name` as present in the API path.
The `status` field is a text field containing the actual text `revoked`, or anything else (for `unrevoked`).

This sets the value of the element to `1` (`revoked`) or to `0` (`unrevoked`).

The response indicates if the element value has changed. If it changed, the result value is returned as a string value (`REVOKED`, `UNREVOKED`). If it did not change, the `status` value is `UNCHANGED`.

Example Response:

```json
{
    "status": "REVOKED"
}
```

### Setting element values

`POST /<statuslist-name>/api/status`

Request object:

```json
{
    list: <list URL>,
    index: <element index>,
    status: <integer status value>,
    mask: <optional mask value>
}
```

Response object:

```json
{
    "status": <status change indication>
}
```

The `list` value must be the `url` value from the reservation step. This must match the `statuslist-name` as present in the API path.
The `status` field is an integer to which the new status of the list element must be set. An optional `mask` value can be passed to only set specific bits of the list element and keep other bits unchanged. By default the `mask` will cover all bits.

The response indicates if the element value has changed (`CHANGED`) or not (`UNCHANGED`).

Example Response:

```json
{
    "status": "CHANGED"
}
```

### Retrieving a single bit status

`GET /<statuslist-name>/api/status/<list index>/<element index>`

This is a convenience method to determine the state of a specific element index in the bitstring list. This value can also be determined by parsing the bitstring credential.

`<list index>` is the numeric index of the status list. This is the last path element of the `status list uri` as returned in the reservation interface above. The `<element index>` is of course the numeric index of the status list element.

Response object: 

```json
{
    "status": <numeric or textual status>
}
```

The response status is `REVOKED` or `UNREVOKED` for statuslists with a bit size of 1. `REVOKED` indicates a value of `1` and `UNREVOKED` a value of `0`.

For statuslists with a larger bit size, the `status` response field is an integer value representing the bit element status value.

### Statuslist Credentials

This agent implements several standards for statuslist tokens:

- IETF Token Status Lists: https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/11/
- W3C BitstringStatus: https://www.w3.org/TR/vc-bitstring-status-list/
- W3C StatusList: https://github.com/w3c/vc-bitstring-status-list

The credential request interface returns a JWT depending on the configured type of the statuslist.

`GET /<statuslist-name>/<index>`

Example:

```shell
curl http://example.com/statuslist/1
```

The IETF Token Status List returns a JWT with a `status_list` claim:

```json
{
    status_list: {
        bits: <bit size of this list>,
        lst: <encoded status>
    }
}
```

The `encoded status` is a base64url encoded, zlib compressed representation of the bit string content.

The W3C implementations return a Virtual Credential JWT with a `credentialSubject` claim:

```json
{
    type: ['VerifiableCredential', <status list credential type>],
    credentialSubject: {
        id: <list URI>,
        type: <relevant type string>,
        statusPurpose: <purpose description>,
        encodedList: <encoded status>
    }
}
```

The 'old' W3C StatusList implementation has credential type 'StatusListCredential'. The `credentialSubject` type can be anything from `StatusList2020`, `SuspensionList2020` to `RevocationList2021`, etc. The `encodedList` is a base64url encoded gzip compressed representation of the bit string content.

The W3C BitstringStatusList implementation has credential type 'BitstringStatusListCredential'. The `credentialSubject` type should be `BitstringStatusList`. The `encodedList` is a multibase base64url encoded gzip compressed representation of the bit string content. It is very similar to the W3C StatusList value, but preceded by the multibase `u` prefix to indicate the base64url encoding. The spec suggests a base58btc encoding can also be used, which would have a `z` prefix. This implementation only uses the base64url encoded version.


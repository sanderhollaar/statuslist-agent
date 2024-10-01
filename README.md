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

The statuslist agent currently has two endpoints:

- `/.well-known/did.json`: endpoint to serve the DIDDocument of the `did:web` key implementation
- `/<statuslist-name>/`: endpoint to retrieve the statuslist VC containing the statuslist encodedList data

At this time, the status list returns an empty (0-filled) encodedList and has no support for actual revocation or suspension.


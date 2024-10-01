import { ed25519 } from '@noble/curves/ed25519'
import { bytesToHex } from '@veramo/utils'
import { randomBytes } from 'ethers'

let pkey:Uint8Array;

if (process.argv[2].toLowerCase() == 'ed25519') {
    console.log('Generating Ed25519 private key');
    pkey = ed25519.utils.randomPrivateKey();
} else {
    console.log('Generating Secp256[rk]1 private key');
    pkey = randomBytes(32);
}
console.log(bytesToHex(pkey));

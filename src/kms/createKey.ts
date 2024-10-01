import { IKey, KEY_ALG_MAPPING, TKeyType } from '@veramo/core-types'
import { ed25519 } from '@noble/curves/ed25519'
import { p256 } from '@noble/curves/p256'
import { SigningKey } from 'ethers'
import { bytesToHex, hexToBytes } from '@veramo/utils'
  
export async function createKey(type: TKeyType, privateKeyHex:string): Promise<IKey> {
    let key: IKey;
    let privateKey = hexToBytes(privateKeyHex);
    switch (type) {
      case 'Ed25519': {
        const publicKeyHex = bytesToHex(ed25519.getPublicKey(privateKey))
        key = {
          kms: 'local',
          type,
          kid: publicKeyHex,
          publicKeyHex,
          privateKeyHex: bytesToHex(privateKey),
          meta: {
            algorithms: [...KEY_ALG_MAPPING[type], 'Ed25519'],
          },
        }
        break
      }
      case 'Secp256r1':
        const publicKeyHex = bytesToHex(p256.getPublicKey(privateKey, true))
        key = {
          kms: 'local',
          type,
          kid: publicKeyHex,
          publicKeyHex,
          privateKeyHex: bytesToHex(privateKey),
          meta: {
            algorithms: ['ES256'], // ECDH not supported yet by this KMS
          },
        }
        break;
      case 'Secp256k1': {
        const keyPair = new SigningKey(privateKey)
        const publicKeyHex = keyPair.publicKey.substring(2)
        key = {
          kms: 'local',
          type,
          kid: publicKeyHex,
          publicKeyHex,
          privateKeyHex: bytesToHex(privateKey),
          meta: {
            algorithms: [
              ...KEY_ALG_MAPPING[type]
            ],
          },
        }
        break
      }
      default:
        throw Error('not_supported: Key type not supported: ' + type)
    }

    return key
}
import fs from "fs";
import {
  IAgentPlugin,
  IKey,
  IKeyManager,
  IKeyManagerCreateArgs,
  IKeyManagerDecryptJWEArgs,
  IKeyManagerDeleteArgs,
  IKeyManagerEncryptJWEArgs,
  IKeyManagerGetArgs,
  IKeyManagerSharedSecretArgs,
  IKeyManagerSignArgs,
  IKeyManagerSignEthTXArgs,
  IKeyManagerSignJWTArgs,
  ManagedKeyInfo,
  MinimalImportableKey,
  TKeyType,
} from '@veramo/core-types'
import { schema } from '@veramo/core-types'
import * as u8a from 'uint8arrays'
import { hexToBytes } from '@veramo/utils'
import { EdDSASigner, ES256KSigner, ES256Signer } from 'did-jwt'
import { createKey } from "./kms/createKey.js";

interface KeyData {
    privateKeyHex: string;
    type: string;
    name: string;
}

/**
 * Agent plugin that implements {@link @veramo/core-types#IKeyManager} methods.
 *
 * This is a simple keymanager plugin to retrieve keys based on static local files.
 * It has no support for storing or creating keys and avoids database requirements
 */
export class KeyManager implements IAgentPlugin {
  /**
   * Plugin methods
   * @public
   */
  readonly methods: IKeyManager

  readonly schema = schema.IKeyManager
  private filePath:string;
  private key:IKey|null;

  constructor(filePath:string) {
    this.filePath = filePath;
    this.key = null;
    this.methods = {
      keyManagerGetKeyManagementSystems: this.keyManagerGetKeyManagementSystems.bind(this),
      keyManagerCreate: this.keyManagerCreate.bind(this),
      keyManagerGet: this.keyManagerGet.bind(this),
      keyManagerDelete: this.keyManagerDelete.bind(this),
      keyManagerImport: this.keyManagerImport.bind(this),
      keyManagerEncryptJWE: this.keyManagerEncryptJWE.bind(this),
      keyManagerDecryptJWE: this.keyManagerDecryptJWE.bind(this),
      keyManagerSignJWT: this.keyManagerSignJWT.bind(this),
      keyManagerSignEthTX: this.keyManagerSignEthTX.bind(this),
      keyManagerSign: this.keyManagerSign.bind(this),
      keyManagerSharedSecret: this.keyManagerSharedSecret.bind(this),
    }
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerGetKeyManagementSystems} */
  async keyManagerGetKeyManagementSystems(): Promise<Array<string>> {
    return [];
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerCreate} */
  async keyManagerCreate(args: IKeyManagerCreateArgs): Promise<ManagedKeyInfo> {
    return this.key!;
  }
  
  async initialise() {
    const object = JSON.parse(fs.readFileSync(this.filePath, 'utf8').toString()) as KeyData;
    this.key = await createKey(object.type as TKeyType, object.privateKeyHex);
    this.key.kid = object.name;
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerGet} */
  async keyManagerGet({ kid }: IKeyManagerGetArgs): Promise<IKey> {
    return this.key!;
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerDelete} */
  async keyManagerDelete({ kid }: IKeyManagerDeleteArgs): Promise<boolean> {
    return false;
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerImport} */
  async keyManagerImport(key: MinimalImportableKey): Promise<ManagedKeyInfo> {
    return this.key!;
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerEncryptJWE} */
  async keyManagerEncryptJWE({ kid, to, data }: IKeyManagerEncryptJWEArgs): Promise<string> {
    return '';
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerDecryptJWE} */
  async keyManagerDecryptJWE({ kid, data }: IKeyManagerDecryptJWEArgs): Promise<string> {
    return '';
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerSignJWT} */
  async keyManagerSignJWT({ kid, data }: IKeyManagerSignJWTArgs): Promise<string> {
    if (typeof data === 'string') {
      return this.keyManagerSign({ keyRef: kid, data, encoding: 'utf-8' })
    } else {
      const dataString = u8a.toString(data, 'base16')
      return this.keyManagerSign({ keyRef: kid, data: dataString, encoding: 'base16' })
    }
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerSign} */
  async keyManagerSign(args: IKeyManagerSignArgs): Promise<string> {
    const { data, algorithm, encoding } = { encoding: 'utf-8', ...args }
    let dataBytes
    if (typeof data === 'string') {
      if (encoding === 'base16' || encoding === 'hex') {
        const preData = data.startsWith('0x') ? data.substring(2) : data
        dataBytes = u8a.fromString(preData, 'base16')
      } else {
        dataBytes = u8a.fromString(data, <'utf-8'>encoding)
      }
    } else {
      dataBytes = data
    }
    return this.sign(algorithm, dataBytes);
  }

  async sign(algorithm:string|undefined, data: Uint8Array): Promise<string> {
    if (
      this.key!.type === 'Ed25519' &&
      (typeof algorithm === 'undefined' || ['Ed25519', 'EdDSA'].includes(algorithm))
    ) {
      return await this.signEdDSA(this.key!.privateKeyHex!, data)
    } else if (this.key!.type === 'Secp256k1') {
      if (typeof algorithm === 'undefined' || ['ES256K', 'ES256K-R'].includes(algorithm)) {
        return await this.signES256K(this.key!.privateKeyHex!, algorithm, data)
      }
    } else if (
      this.key!.type === 'Secp256r1' &&
      (typeof algorithm === 'undefined' || algorithm === 'ES256')
    ) {
      return await this.signES256(this.key!.privateKeyHex!, data)
    }

    throw Error(`not_supported: Cannot sign ${algorithm} using key of type ${this.key!.type}`)
  }

  /**
   * @returns a base64url encoded signature for the `EdDSA` alg
   */
  private async signEdDSA(key: string, data: Uint8Array): Promise<string> {
    const signer = EdDSASigner(hexToBytes(key))
    const signature = await signer(data)
    // base64url encoded string
    return signature as string
  }

  /**
   * @returns a base64url encoded signature for the `ES256K` or `ES256K-R` alg
   */
  private async signES256K(
    privateKeyHex: string,
    alg: string | undefined,
    data: Uint8Array,
  ): Promise<string> {
    const signer = ES256KSigner(hexToBytes(privateKeyHex), alg === 'ES256K-R')
    const signature = await signer(data)
    // base64url encoded string
    return signature as string
  }

  /**
   * @returns a base64url encoded signature for the `ES256` alg
   */
  private async signES256(privateKeyHex: string, data: Uint8Array): Promise<string> {
    const signer = ES256Signer(hexToBytes(privateKeyHex))
    const signature = await signer(data)
    // base64url encoded string
    return signature as string
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerSignEthTX} */
  async keyManagerSignEthTX({ kid, transaction }: IKeyManagerSignEthTXArgs): Promise<string> {
    return '';
  }

  /** {@inheritDoc @veramo/core-types#IKeyManager.keyManagerSharedSecret} */
  async keyManagerSharedSecret(args: IKeyManagerSharedSecretArgs): Promise<string> {
    return '';
  }
}

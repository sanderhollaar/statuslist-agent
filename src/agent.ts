// Core interfaces
import {
    createAgent,
    IDIDManager,
    IResolver,
    IDataStore,
    IDataStoreORM,
    IKeyManager,
    ICredentialPlugin,
} from '@veramo/core'
import { getEnv } from 'utils/getEnv';

// Core identity manager plugin
import { DIDManager } from '@veramo/did-manager'
  
import { WebDIDProvider } from "@veramo/did-provider-web";

// Core key manager plugin
import { KeyManager } from './keymanager';
  
// Custom key management system for RN
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'
  
// W3C Verifiable Credential plugin
import { CredentialPlugin } from '@veramo/credential-w3c'

// Custom resolvers
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { Resolver } from 'did-resolver'
import { getResolver as webDidResolver } from 'web-did-resolver'
  
// Storage plugin using TypeOrm
import { DIDStore } from './didstore';
 
const webprov = new WebDIDProvider({defaultKms: 'local' });
export const resolver = new Resolver({
  ...webDidResolver(),
});

const keyManager = new KeyManager(getEnv('KEY_FILE', 'local.key'));
await keyManager.initialise();

export const agent = createAgent<
IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialPlugin
>({
  plugins: [
    keyManager,
    new DIDManager({
      store: new DIDStore(),
      defaultProvider: 'did:web',
      providers: {
        'did:web': webprov
      }
    }),
    new DIDResolverPlugin({
      resolver: resolver,
    }),
    new CredentialPlugin(),
  ],
})

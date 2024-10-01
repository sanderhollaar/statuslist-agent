import { IIdentifier, IKey } from '@veramo/core-types'
import { AbstractDIDStore } from '@veramo/did-manager'
import { agent } from 'agent'

/**
 * An implementation of {@link @veramo/did-manager#AbstractDIDStore | AbstractDIDStore} that does not actually store anything
 *
 * @public
 */
export class DIDStore extends AbstractDIDStore {
  async getDID({
    did,
    alias,
    provider,
  }: {
    did: string
    alias: string
    provider: string
  }): Promise<IIdentifier> {
    const key = await agent.keyManagerGet({kid: "anything"}).catch(() => null);
    if (!key) {
      throw Error('Identifier not found');
    }
    return {
      did: key!.kid,
      provider: 'did:web',
      controllerKeyId: key!.kid + '#' + key!.publicKeyHex,
      keys: [key],
      services: []
    }   
  }

  async deleteDID({ did }: { did: string }) {
    return true;
  }

  async importDID(args: IIdentifier) {
    return true;
  }

  async listDIDs(args: { alias?: string; provider?: string }): Promise<IIdentifier[]> {
    return [];
  }
}

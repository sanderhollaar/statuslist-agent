import { Request, Router } from 'express'
import { agent } from 'agent';
import { DIDDocument, TKeyType } from '@veramo/core';
import { toJwk, JwkKeyUse } from '@sphereon/ssi-sdk-ext.key-utils';
import { VerificationMethod } from 'did-resolver';

// mapping key types to key output types in the DIDDocument
const keyMapping: Record<TKeyType, string> = {
    Secp256k1: 'EcdsaSecp256k1VerificationKey2019',
    Secp256r1: 'EcdsaSecp256r1VerificationKey2019',
    // we need JsonWebKey2020 output
    Ed25519: 'JsonWebKey2020', //'Ed25519VerificationKey2018', 
    X25519: 'X25519KeyAgreementKey2019',
    Bls12381G1: 'Bls12381G1Key2020',
    Bls12381G2: 'Bls12381G2Key2020'
}
  
const algMapping: Record<TKeyType, string> = {
    Ed25519: 'EdDSA',
    X25519: 'EdDSA',
    Secp256r1: 'ES256',
    Secp256k1: 'ES256K',
    Bls12381G1: 'ES256', // incorrect
    Bls12381G2: 'ES256' // incorrect
}

export function getDidSpec(router:Router) {
    var path = '/.well-known/did.json';
    router!.get(path, async (req: Request, res) => {
        const key = await agent.keyManagerGet({kid: "anything"}).catch(() => null);
        const keyData = [{
            id: key!.kid + '#' + key!.publicKeyHex,
            type: keyMapping[key!.type],
            controller: key!.kid,
            publicKeyJwk: toJwk(key!.publicKeyHex, key!.type, { use: JwkKeyUse.Signature, key: key!}) as JsonWebKey,
        }];
    
        // ed25519 keys can also be converted to x25519 for key agreement
        //const keyAgreementKeyIds = keyData.map((k) => k.id);
        const signingKeyIds = keyData.map((k) => k.id);
    
        const didDoc:DIDDocument = {
            '@context': 'https://w3id.org/did/v1',
            id: key!.kid,
            verificationMethod: keyData as VerificationMethod[],
            authentication: signingKeyIds,
            assertionMethod: signingKeyIds,
            //keyAgreement: keyAgreementKeyIds,
            service: [],
        }
    
        return res.json(didDoc);
    });
}

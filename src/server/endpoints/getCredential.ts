import { agent } from 'agent';
import { Router, Request, Response } from 'express';
import { StatusList } from 'statusLists/StatusList';
import moment from 'moment'
import { CredentialPayload, ProofFormat } from '@veramo/core';

export function getCredential(statusList:StatusList, router:Router) {
    router!.get('/',
        async (request: Request, response: Response<string>) => {
            const key = await agent.keyManagerGet({kid: "anything"}).catch(() => null);
            try {
                var statusListCredential = {
                    "@context": [
                        "https://www.w3.org/ns/credentials/v2",
                    ],
                    "id": statusList.id,
                    "type": ["VerifiableCredential", "BitstringStatusListCredential"],
                    "issuer": key!.kid,
                    "validFrom": moment().format(moment.defaultFormatUtc),
                    "credentialSubject": {
                        "id": statusList.id + "#list",
                        "type": "BitstringStatusList",
                        "statusPurpose": statusList.purpose,
                        "encodedList": await statusList.encode()
                    }
                }

                let proofFormat: ProofFormat = 'jwt';          
                const result = await agent.createVerifiableCredential({
                  credential: statusListCredential as CredentialPayload,
                  proofFormat,
                  removeOriginalFields: false,
                  fetchRemoteContexts: true,
                  domain: key!.kid,
                })
                response.send(result.proof.jwt);

            } catch (e) {
                return response.status(500).end('Internal server error');
            }
        });
}
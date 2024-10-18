import { agent } from 'agent';
import { Router, Request, Response } from 'express';
import { StatusListType } from 'statusLists/StatusListType';
import moment from 'moment'
import { CredentialPayload, ProofFormat } from '@veramo/core';

export function getCredential(statusList:StatusListType, router:Router) {
    router!.get('/:index',
        async (request: Request, response: Response<string>) => {
            const list = await statusList.get(parseInt(request.params.index));
            const key = await agent.keyManagerGet({kid: "anything"}).catch(() => null);
            try {
                var basepath = statusList.id + '/' + list.index;
                var statusListCredential = {
                    "@context": [
                        "https://www.w3.org/ns/credentials/v2",
                    ],
                    "id": basepath + '#list',
                    "type": ["VerifiableCredential", "StatusList2021Credential"], // should be BitstringStatusListCredential
                    "issuer": key!.kid,
                    "validFrom": moment().format(moment.defaultFormatUtc),
                    "credentialSubject": {
                        "id": basepath + "#list",
                        "type": "StatusList2021", // should be "BitstringStatusList",
                        "statusPurpose": statusList.purpose,
                        "encodedList": list.revoked
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
                response.status(404).end('List not found');
            }
        });
}
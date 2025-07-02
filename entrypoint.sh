#!/usr/bin/env -S bash -x

/usr/local/bin/npm run key ed25519

cat > local.key <<EOD
{
  "name": "did:web:statuslist.${BASE_DOMAIN}",
  "type": "ed25519",
  "privateKeyHex": "$(/usr/local/bin/npm run key ed25519 | grep -A1 'Generating .* private key' | tail -1)"
}
EOD

env
ls -l local.key
cat local.key

npm run dev

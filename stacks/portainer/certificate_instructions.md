# Portainer TLS — Glasswing

Portainer is reached at `https://<host-ip>:9443` with a certificate signed by the
Glasswing private CA. Nothing is issued by a public authority, because a public
CA will not sign a private IPv4 address.

All of this is automated. The manual OpenSSL recipe that used to live here is
kept only as background in [How it works](#how-it-works).

## Step 1 — Create the TLS material

Run on Pathfinder, from the repository root:

```bash
make certificates          # creates whatever is missing
make certificates-check    # covers the host IP, not expiring
```

`scripts/04-certificates.sh` writes three things:

| File | Issuer | Purpose |
| --- | --- | --- |
| `.local/ca/glasswing-ca.{crt,key}` | self | Glasswing private CA (10 years) |
| `stacks/portainer/certs/portainer.{crt,key}` | Glasswing CA | Portainer on `:9443` |
| `stacks/infisical/tls/{cert.pem,key.pem}` | self-signed | Infisical gateway on `:8095` |

The certificate SAN covers `IP:<GLASSWING_HOST_IP>` and `DNS:pathfinder`. The CA
private key stays on the host (mode `600`) and in your offline backup — never in
Git.

## Step 2 — Start or restart Portainer

`stacks/portainer/compose.yaml` already mounts `./certs` read-only and passes
`--sslcert` / `--sslkey`; a fresh clone needs no edits.

```bash
make up STACK=portainer
make ps STACK=portainer
```

The data volume `glasswing-portainer-data` is untouched, so the administrator
account and settings survive a certificate change.

## Step 3 — Verify

```bash
openssl x509 -in stacks/portainer/certs/portainer.crt \
  -noout -subject -issuer -dates
openssl x509 -in stacks/portainer/certs/portainer.crt \
  -noout -text | sed -n '/Subject Alternative Name/,+1p'

curl --fail --silent --show-error \
  --cacert .local/ca/glasswing-ca.crt \
  https://<host-ip>:9443/ -o /dev/null && echo "[PASS] Portainer trusted TLS"
```

`make certificates-check` performs the same checks (presence, SAN, 21-day
expiry warning) for the CA, Portainer and Infisical in one command.

## Step 4 — Trust the Glasswing CA on your workstation

Copy the **public** certificate only; the private key never leaves the host.

```bash
# on Pathfinder
scp .local/ca/glasswing-ca.crt you@workstation:~/Downloads/glasswing-ca.crt
```

Compare the fingerprint first, then install it:

```bash
# macOS
shasum -a 256 ~/Downloads/glasswing-ca.crt   # compare with: openssl x509 -in .local/ca/glasswing-ca.crt -noout -fingerprint -sha256
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ~/Downloads/glasswing-ca.crt
```

Ubuntu/Debian clients:

```bash
sudo cp glasswing-ca.crt /usr/local/share/ca-certificates/glasswing-ca.crt
sudo update-ca-certificates
```

Only install this CA on devices you control. Trusting it means any certificate it
signs is accepted by that device.

## Renewal and host-address changes

Certificates are valid for 825 days (CA: 10 years). `make certificates-check`
starts warning 21 days before expiry.

```bash
./scripts/04-certificates.sh --force   # reissue CA + leaves
make up STACK=infisical                # the gateway also mounts a certificate
make up STACK=portainer
make certificates-check
```

Changing `GLASSWING_HOST_IP` requires the same `--force` run, because the SAN is
baked into the leaf certificates. Clients must then trust the newly issued CA
again (or you can keep the old CA by restoring `.local/ca/` first, in which case
only the leaves need reissuing).

Do **not** sign the Infisical certificate with the Glasswing CA: the scripts and
every documented `curl` verify that endpoint with
`--cacert stacks/infisical/tls/cert.pem`, which only works while it is
self-signed.

## How it works

The generation script does what this recipe did by hand:

1. `openssl req -x509` creates the CA with `basicConstraints=critical,CA:TRUE`.
2. A leaf key + CSR is created with `CN=pathfinder`.
3. `openssl x509 -req` signs the CSR with the CA, applying
   `subjectAltName=IP:<host-ip>,DNS:pathfinder`,
   `basicConstraints=critical,CA:FALSE`, `keyUsage=critical,digitalSignature,keyEncipherment`
   and `extendedKeyUsage=serverAuth`.
4. Files are installed with mode `644` (certificates) and `600` (keys).

Portainer documents the `--sslcert` / `--sslkey` options at
<https://docs.portainer.io/advanced/ssl>.

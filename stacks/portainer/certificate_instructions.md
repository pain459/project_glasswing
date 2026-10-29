## Step 1 — Generate a local trusted certificate

Portainer is now reached through the Glasswing reverse proxy at
`https://portainer.glasswing.lan`. The certificate below is still used on
Portainer's internal `9443` listener; the proxy terminates client TLS with the
wildcard certificate from `stacks/proxy/certs/`. Both certificates are signed
by the same Glasswing CA, so clients only need to trust `.local/ca/glasswing-ca.crt`.

Portainer's internal listener still uses a private-IP certificate, and a public certificate authority generally won't issue a certificate for that address. We'll create a private CA and use it to sign Portainer's certificate.

Run these commands on Pathfinder:

```
cd ~/src_git/project_glasswing

mkdir -p .local/ca stacks/portainer/certs
chmod 700 .local/ca

# Create Glasswing's private CA (only once).
if [ ! -f .local/ca/glasswing-ca.key ]; then
  openssl req -x509 -newkey rsa:4096 -sha256 \
    -noenc -days 3650 \
    -keyout .local/ca/glasswing-ca.key \
    -out .local/ca/glasswing-ca.crt \
    -subj "/CN=Glasswing Home CA" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign"
fi

chmod 600 .local/ca/glasswing-ca.key

# Generate Portainer's private key and certificate request.
openssl req -new -newkey rsa:3072 -nodes \
  -keyout stacks/portainer/certs/portainer.key \
  -out /tmp/glasswing-portainer.csr \
  -subj "/CN=pathfinder"

# Specify the names/IP that the certificate should cover.
cat > /tmp/glasswing-portainer.ext <<'EOF'
subjectAltName=IP:192.168.68.62,DNS:pathfinder
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
EOF

# Sign the Portainer certificate using Glasswing's CA.
openssl x509 -req \
  -in /tmp/glasswing-portainer.csr \
  -CA .local/ca/glasswing-ca.crt \
  -CAkey .local/ca/glasswing-ca.key \
  -CAcreateserial \
  -out stacks/portainer/certs/portainer.crt \
  -days 365 -sha256 \
  -extfile /tmp/glasswing-portainer.ext

chmod 600 stacks/portainer/certs/portainer.key
rm -f /tmp/glasswing-portainer.csr /tmp/glasswing-portainer.ext
```

Make sure `.gitignore` contains:

```
.local/
stacks/portainer/certs/
```

The CA private key is highly sensitive. Keep it off Git, protect it with filesystem permissions, and maintain a separate secure backup.

## Step 2 — Update Portainer Compose

Replace `stacks/portainer/compose.yaml` with:

```

name: glasswing-portainer

services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: glasswing-portainer
    restart: unless-stopped

    command:
      - --sslcert
      - /certs/portainer.crt
      - --sslkey
      - /certs/portainer.key

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - ./certs:/certs:ro

    security_opt:
      - no-new-privileges:true

    networks:
      - proxy

volumes:
  portainer_data:
    name: glasswing-portainer-data

networks:
  proxy:
    name: glasswing-proxy
    external: true

```

Portainer officially supports the `--sslcert` and `--sslkey` options for custom PEM certificates.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.portainer.io\&sz=32)

Portainer Documentation



## Step 3 — Restart Portainer

```
make up STACK=portainer
make ps STACK=portainer
```

The existing Portainer data volume remains intact, so your administrator account and configuration should be preserved.

Verify the certificate:

```
openssl x509 \
  -in stacks/portainer/certs/portainer.crt \
  -noout -subject -dates -ext subjectAltName
```

Then verify HTTPS without `-k`:

```
curl --fail --silent --show-error \
  --cacert .local/ca/glasswing-ca.crt \
  https://portainer.glasswing.lan/ \
  -o /dev/null

echo "[PASS] Portainer trusted TLS"
```

This validates the proxy's wildcard certificate, which is signed by the same
Glasswing CA as Portainer's internal certificate.

## Step 4 — Trust Glasswing CA on your Mac

On Pathfinder, copy the public CA certificate only to an accessible location:

```
cp .local/ca/glasswing-ca.crt /tmp/glasswing-ca.crt
chmod 644 /tmp/glasswing-ca.crt
```

On your Mac:

```
scp ravik@192.168.68.62:/tmp/glasswing-ca.crt \
  ~/Downloads/glasswing-ca.crt
```

Verify the certificate fingerprint against Pathfinder before installing it. Then, on the Mac, run:

```
sudo security add-trusted-cert \
  -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/Downloads/glasswing-ca.crt
```

This grants the Glasswing CA trust on the Mac, including for any future certificates that CA signs. Only install this CA on devices you control and trust.

Now open:

[Portainer — Trusted HTTPS](https://portainer.glasswing.lan)

Safari should display the page without certificate warnings. Restart the browser if it continues using a previously cached TLS connection.

## Step 5 — Register the certificate in Infisical

In `glasswing-infrastructure` → `prod` → `/portainer`, add these records:

| Key                        | Purpose                      |
| -------------------------- | ---------------------------- |
| `PORTAINER_URL`            | `https://portainer.glasswing.lan` |
| `PORTAINER_TLS_EXPIRY`     | Certificate expiration date  |
| `PORTAINER_ADMIN_USERNAME` | Administrator username       |
| `PORTAINER_ADMIN_PASSWORD` | Administrator password       |

Keep the CA private key in protected offline backup storage; we don't need to give routine application deployments access to certificate-signing authority.

## Final verification

```
make ps STACK=portainer
make status
```

Portainer is complete when its existing administrator login works, Docker management is available, and HTTPS validates without certificate warnings or insecure TLS bypasses.

One additional benefit: We can reuse Glasswing's CA to issue trusted certificates for Infisical and any future LAN services, without creating a new certificate authority for every application.
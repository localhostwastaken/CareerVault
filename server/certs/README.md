# server/certs

Certificates the API needs at runtime. The Dockerfile copies this directory into the image as
`/app/server/certs`, so the container builds with only this README and `.gitkeep` present.

## Supabase CA (optional TLS to the database)

To make the API verify Supabase's certificate, not just encrypt the connection:

1. In the Supabase dashboard, open **Project Settings → Database → SSL Configuration** and click
   **Download certificate**.
2. Save it here as `supabase-ca.crt`. It is a public CA certificate, not a secret, so commit it:
   Render builds the image from the repository, and a certificate that isn't committed isn't
   in the image.
3. Follow the optional TLS step in [`documentation/Deploy_Runbook.md`](../../documentation/Deploy_Runbook.md).
   It covers the connection-string parameters for the runtime driver and for the Prisma CLI,
   and testing both from a laptop **before** turning on Supabase's "Enforce SSL".

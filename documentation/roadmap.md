# Roadmap and Planned Features

This document outlines the **PLANNED** and **DESIGNED** (but not yet implemented) features for CareerVault as of September 2026.

## 1. Key Management
- **AWS KMS / HashiCorp Vault:** Currently, organization keys are wrapped using application envelope encryption via `LocalKmsService`. Integrating a true external Hardware Security Module (HSM) or KMS provider like AWS KMS is **PLANNED**.

## 2. Payments and Billing
- **Stripe Metering:** The current `PaymentService` is a mock (`MockStripeService`). Real usage-based Stripe metering for the Bulk Verification API, as well as actual payment processing for premium subscriptions, is **DESIGNED** and **PLANNED**.

## 3. Blockchain & Decentralization
- **Mainnet Deployment:** The `AnchorRegistry` smart contract is currently deployed on the Polygon Amoy testnet. Deployment to Polygon PoS Mainnet is **PLANNED**.
- **IPFS and GitHub Merkle Mirrors:** Currently, the Merkle root is anchored solely to Polygon. The architectural design includes triple-redundancy by mirroring the daily Merkle proofs to IPFS and a public GitHub repository. This is **PLANNED**.

## 4. Analytics and Telemetry
- **Verifier Dashboard:** A comprehensive usage and analytics dashboard for enterprise verifiers to track API consumption and successful document checks is **PLANNED**.

## 5. Security & Access
- **Auditing Member Grants:** A database writer who maliciously grants themselves Manager and HR memberships can currently bypass separation of duties to issue valid documents (using the org's real key). Stricter cryptographic auditing of membership grants is **PLANNED**.
- **Per-Member Signing Keys:** Dual signatures currently use the organization's single custodial key, with separation of duties enforced at the application level. Moving to a per-member key architecture is **PLANNED**.
- **Strict TLS Pinning:** Pinning Supabase's CA (`sslmode=verify-full`) in production is **PLANNED**.

## 6. Miscellaneous
- **Blind Index for PII:** Emails and names are currently stored in plaintext to support login lookups. Implementing a blind index for searchable PII is **PLANNED**.
- **Cloud Object Storage:** Render's ephemeral disk wipes local PDFs on deploy. The `SupabaseStorageService` mock wrapper is used to persist files. True S3 integration is **PLANNED**.

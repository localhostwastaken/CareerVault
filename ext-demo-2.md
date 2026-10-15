1.⁠ ⁠Destroy the eLocker Argument (The Decentralization Defense)
Corporate eLocker systems are centralized silos. If the vendor's servers go down, verification halts. If the issuing company goes bankrupt and stops paying their subscription, the employee's records vanish.
The Pivot: CareerVault issues Self-Sovereign Identity credentials. The candidate physically holds the JSON-LD file. The verifier checks the mathematical proof directly against the public ledger. Even if the CareerVault PostgreSQL database is permanently destroyed, the credential remains 100% verifiable offline. eLocker requires trusting a central server; your system requires trusting math.

2.⁠ ⁠Implement Genuine Database Encryption (Stop the Hypocrisy)
You cannot sell zero-knowledge security while leaving your backend exposed.
Field-Level Encryption: Implement Prisma middleware for envelope encryption immediately. Encrypt the content_json and signature fields using a master key before they are written to the database.
Encryption at Rest: Configure your local or cloud PostgreSQL instance with AES-256 encryption at rest. When Sachin asks to see the database rows during the next evaluation, force him to look at raw ciphertext.

3.⁠ ⁠Deploy the Smart Contract (End the Simulation)
Simulations get passing grades; live networks get distinctions. Stop mocking the blockchain layer.
Polygon Amoy Deployment: Must write the AnchorRegistry.sol contract and deploy it to the Polygon Amoy testnet.
Live Integration: Wire the NestJS cron job using ethers.js to execute a real transaction to that contract address. In the September evaluation, open PolygonScan and make Sachin watch the live transaction hash of your Merkle Root confirm on-chain.

4.⁠ ⁠Master the Hashing Pipeline (The Viva Prep)
You must memorize the exact cryptographic flow and explain it without hesitating. If you stumble here, the entire premise collapses.
Step 1: Apply JCS Canonicalization (RFC 8785) to the JSON-LD payload to ensure deterministic formatting.
Step 2: Append a 32-byte cryptographically random salt (which also acts as your GDPR right-to-erasure mechanism).
Step 3: Compute the SHA-256 hash of the salted string.
Step 4: Pair the hashes to build the Merkle Tree and extract the single 32-byte root.
Step 5: Sign the leaf hash using RSA-2048 keys.
---------------------
In other Words 

Act as the Lead Cryptography and Systems Engineer for CareerVault. 

Our external evaluator recently tore apart our architecture. He flagged that our database is storing raw plaintext data, and our blockchain anchoring is entirely simulated. We must fix these fatal flaws immediately. 

Your objective is to replace our mocked backend with genuine cryptographic security and a live Polygon Amoy smart contract integration. 

### CRITICAL BOUNDARIES (DO NOT VIOLATE)
1.⁠ ⁠*No UI or Frontend Work:* Do not touch the React client. 
2.⁠ ⁠*No AI Work:* Do not touch the Groq API or skill extraction services. 
3.⁠ ⁠*Sequential Execution:* You will execute this in 4 distinct steps. You must complete Step 1, verify it works, and ask for my explicit approval before moving to Step 2. Do not write code for future steps prematurely.

### THE ENGINEERING SPRINT

*Step 1: Field-Level Database Encryption*
•⁠  ⁠Sachin called out our unencrypted PostgreSQL database. We need to implement encryption at rest for sensitive fields.
•⁠  ⁠Analyze our ⁠ schema.prisma ⁠. 
•⁠  ⁠Implement a Prisma extension or middleware to automatically encrypt and decrypt the ⁠ content_json ⁠, ⁠ manager_signature ⁠, and ⁠ hr_signature ⁠ fields in the ⁠ documents ⁠ table using AES-256-GCM. 
•⁠  ⁠Use a ⁠ MASTER_ENCRYPTION_KEY ⁠ from the ⁠ .env ⁠ file. Do not hardcode any keys.

*Step 2: Smart Contract Creation & Deployment*
•⁠  ⁠We are ending the blockchain simulation. 
•⁠  ⁠Set up a minimal Hardhat environment in a ⁠ contracts/ ⁠ directory if one does not exist.
•⁠  ⁠Write ⁠ AnchorRegistry.sol ⁠. It must include:
  - An ⁠ anchorRoot(bytes32 root, uint256 count) ⁠ function restricted to the contract owner.
  - A ⁠ revokeDocument(bytes32 contentHash) ⁠ function restricted to the contract owner.
  - A public view function ⁠ verifyRoot(bytes32 root) ⁠.
•⁠  ⁠Write the deployment script targeting the Polygon Amoy testnet. (I will provide the ⁠ PRIVATE_KEY ⁠ and ⁠ ALCHEMY_API_KEY ⁠ in the ⁠ .env ⁠ when you are ready to deploy).

*Step 3: The Cryptographic Hashing Pipeline*
•⁠  ⁠Refactor the document signing logic in our NestJS backend to follow exact cryptographic standards.
•⁠  ⁠Implement JSON Canonicalization Scheme (JCS - RFC 8785) for the ⁠ content_json ⁠ payload.
•⁠  ⁠Generate a 32-byte cryptographically secure random salt.
•⁠  ⁠Compute the ⁠ contentHash ⁠ as ⁠ SHA-256(salt + canonical_json) ⁠.
•⁠  ⁠Sign this exact hash using the organization's RSA-2048 private key.

*Step 4: Live Merkle Anchoring (NestJS Integration)*
•⁠  ⁠Refactor the midnight anchoring cron job.
•⁠  ⁠Use ⁠ merkletreejs ⁠ to build the tree from all ⁠ ISSUED ⁠ document hashes.
•⁠  ⁠Integrate ⁠ ethers.js ⁠ v6 to construct and send the ⁠ anchorRoot ⁠ transaction to our deployed ⁠ AnchorRegistry ⁠ contract on Polygon Amoy.
•⁠  ⁠Ensure the service waits for block confirmation and saves the actual ⁠ polygon_tx_hash ⁠ back to the database.

Confirm you understand the boundaries, the evaluator's context, and the sequential execution rule. Then, tell me exactly which files you need to read or modify to begin *Step 1: Field-Level Database Encryption*.
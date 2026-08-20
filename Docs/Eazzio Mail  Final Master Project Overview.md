# Eazzio Mail
## Task 1 — Final Master Project Overview

### Project Type

**Independent, standards-based, open-source-first, self-hostable, modular, secure, scalable email and communication platform**

---

# 1. Executive Project Definition

**Eazzio Mail** is an independent email ecosystem designed to combine the strongest useful concepts from **Gmail, Yahoo Mail, Microsoft Outlook/Exchange, Proton Mail, and Zoho Mail** into one unified architecture without copying any provider's proprietary implementation.

The supplied reference compares these platforms through their features, infrastructure, filtering, storage, synchronization, security, APIs, protocols, and mail-server configurations. Gmail is presented as an example of search, labels, filtering, indexing, distributed infrastructure and REST/API-driven access; Yahoo as an example of large-scale storage, specialized views and disposable addresses; Outlook as an enterprise and synchronization model; Proton Mail as a privacy and encryption model; and Zoho Mail as a business, administration and multi-tenant model.

The previously developed Eazzio overview establishes the same foundation: Eazzio is intended to be a complete mail ecosystem rather than only a frontend, with the full lifecycle from authentication and mailbox management through filtering, storage, indexing, search, notification and delivery.

The final objective is therefore:

> **Build one independent email platform that combines modern usability, enterprise capability, privacy, security, interoperability, automation, search, scalable infrastructure and extensibility while avoiding proprietary paid technology dependencies wherever a capable open-source or permanently free alternative exists.**

---

# 2. The Eazzio Mail Philosophy

Eazzio Mail is **not a Gmail clone**.

It is a deliberate architectural synthesis:

```text
Gmail
→ Search + Labels + Filtering + Categorization + Integration

Yahoo Mail
→ Mail Organization + Views + High-volume Mailbox Handling + Aliases

Outlook / Exchange
→ Enterprise Mail + Synchronization + Productivity + Administration

Proton Mail
→ Privacy + Encryption + Zero-access Concepts + Client-side Security

Zoho Mail
→ Business Hosting + Custom Domains + Multi-tenancy + Administration

                         ↓

                  EAZZIO MAIL
                         ↓

             Independent Architecture
```

This principle is already established in the project source material and is retained as a core design decision.

---

# 3. Open-Source-First and Free-Forever Technology Policy

## 3.1 Fundamental Rule

Eazzio Mail will use:

> **Open-source software, open standards, self-hostable components, and software that can be used without recurring license fees.**

The project should avoid making the core platform dependent on:

- proprietary SaaS APIs,
- paid-only libraries,
- closed-source infrastructure,
- mandatory commercial SDKs,
- vendor-locked databases,
- proprietary mail servers,
- paid search engines,
- paid authentication providers,
- paid observability systems,
- mandatory cloud-specific services.

The Open Source Initiative defines open source around freedoms including use, modification and redistribution under qualifying licenses, including commercial use.

---

## 3.2 Meaning of "Free Forever"

For Eazzio, **free forever** means:

- no mandatory recurring software license fee for the chosen core technology;
- the software can be self-hosted;
- source code or a qualifying open-source license is available;
- the project is not architecturally dependent on a proprietary SaaS plan;
- the system can continue operating independently of a vendor account;
- the architecture should have a migration path to another open-source implementation.

It does **not** mean that hosting itself can never cost money.

Infrastructure can still create costs for:

- electricity;
- servers;
- bandwidth;
- public IP addresses;
- domain registration;
- third-party hardware;
- optional commercial support.

Therefore:

> **Eazzio's software architecture will be free/open-source-first; infrastructure expenses are separate from software licensing.**

---

# 4. License Stability Policy

"Open source" alone is not sufficient.

Every major dependency must pass an **Eazzio License Gate**.

### Required checks

1. Is the current release actually open source under a recognized license?
2. Can Eazzio self-host it?
3. Can it be used commercially?
4. Does it require a recurring license fee?
5. Does its license create unacceptable obligations for Eazzio?
6. Can Eazzio continue using the selected version if the upstream license changes?
7. Is there an open-source replacement?
8. Can the component be replaced without redesigning the entire system?

Eazzio should prefer software with **permissive or clearly understood open-source licensing and strong community governance**.

This is particularly important because not every product marketed as "free" is actually open source. For example, Redis currently offers multiple licensing options, including AGPLv3 but also source-available licenses that are not OSI-approved. Therefore Eazzio should not automatically select a component merely because a free edition exists.

---

# 5. Technology Independence Principle

Eazzio should be able to operate without depending on:

```text
Google
Microsoft
Amazon
Cloudflare
Vercel
Netlify
OpenAI
Anthropic
Proprietary email SaaS
Proprietary database SaaS
Proprietary search SaaS
```

These services may be optionally integrated later, but **the core mail platform must not require them**.

For example:

```text
BAD CORE DESIGN

Eazzio
   ↓
Third-party SaaS API
   ↓
Mail functionality

GOOD CORE DESIGN

Eazzio
   ↓
Open-source internal service
   ↓
Independent infrastructure
```

---

# 6. Proposed Open-Source Technology Foundation

The exact final versions will be selected during the technology-selection task, but the architecture should strongly prefer components such as the following.

| Layer | Preferred Eazzio Direction |
|---|---|
| OS | Debian / Ubuntu Server |
| Web server / reverse proxy | Nginx |
| Mail Transfer Agent | Postfix |
| IMAP/POP3/LMTP | Dovecot Community Edition |
| Spam filtering | Rspamd |
| Antivirus | ClamAV |
| Database | PostgreSQL |
| Cache / fast key-value store | Valkey |
| Search | OpenSearch |
| Container engine | Podman |
| Backend services | Python / FastAPI or another open-source backend |
| Web frontend | React + Next.js or equivalent open-source stack |
| Realtime | WebSocket / self-hosted event infrastructure |
| Metrics | Prometheus |
| Visualization | Grafana OSS |
| Logging | Loki/OpenSearch-based stack where appropriate |
| Object storage | MinIO or another self-hostable open-source object store |
| Cryptography | Open standards + audited open-source cryptographic libraries |
| DNS | Self-managed authoritative DNS or open-source DNS infrastructure |
| Version control | Git |
| CI/CD | Self-hosted open-source CI where practical |
| Containers | OCI-compatible containers |
| Orchestration | Start simple; expand to open-source orchestration only when required |

Several of these choices have strong current open-source foundations. PostgreSQL is released under a liberal open-source license and its project explicitly states a commitment to remaining free and open source.

Valkey is particularly aligned with the Eazzio requirement because its project describes itself as open source under BSD and explicitly states an "open source, forever" commitment backed by the Linux Foundation.

OpenSearch is an open-source search and analytics platform under Apache 2.0 and supports search, observability, security analytics and extensibility.

Rspamd provides rule-based, statistical and custom-service spam analysis and assigns messages a spam score, making it highly relevant to the Eazzio filtering engine.

ClamAV is an open-source antivirus engine specifically suited to mail-gateway scanning and supports multiple mail, archive and document formats.

Dovecot Community Edition is an open-source Linux/UNIX mail server supporting IMAP, POP3, LMTP and ManageSieve.

Nginx is distributed under the 2-clause BSD license and provides HTTP, reverse-proxy, caching, load-balancing and mail-proxy functionality.

Podman is a daemonless, open-source, Linux-native container engine designed around OCI containers and is a suitable alternative to making Docker Desktop a mandatory dependency.

Python is distributed under the Python Software Foundation License and current Python releases are open source.

Next.js is an open-source framework and can be deployed as a normal Node.js server rather than requiring a specific hosting provider.

Grafana OSS is currently distributed under AGPLv3 and provides the open-source visualization and alerting edition.

---

# 7. Technology Selection Rule

The preferred technology will therefore be chosen according to this sequence:

```text
Open Standard
      ↓
Open Source
      ↓
Self-hostable
      ↓
No recurring license requirement
      ↓
Strong community
      ↓
Stable project governance
      ↓
Security maturity
      ↓
Performance
      ↓
Scalability
      ↓
Ease of replacement
```

Price will **not** be the only criterion.

A technically inferior project should not automatically be selected just because it is free.

The objective is:

> **Best capable open-source technology with sustainable licensing and no mandatory proprietary dependency.**

---

# 8. Complete Eazzio Mail Scope

Eazzio Mail is not limited to sending and reading messages.

It encompasses:

### User Layer

- Registration
- Authentication
- Password management
- Recovery
- MFA
- Sessions
- Devices
- Profiles
- Preferences

### Mailbox Layer

- Inbox
- Sent
- Drafts
- Spam
- Trash
- Archive
- Starred
- Important
- Folders
- Labels
- Threads
- Categories

### Mail Infrastructure

- SMTP
- IMAP
- LMTP where appropriate
- MIME
- Message parsing
- Mail routing
- Mail queues
- Retry processing
- Bounce processing
- Delivery tracking

### Security

- TLS
- SPF
- DKIM
- DMARC
- ARC
- MTA-STS
- TLS-RPT
- Optional DANE
- Authentication
- Authorization
- Encryption at rest
- Optional E2EE

### Intelligence

- Rule filtering
- Statistical analysis
- Bayesian classification
- Reputation analysis
- Spam scoring
- Phishing detection
- Malware detection
- Attachment risk analysis
- Machine learning
- AI assistance

### Data

- PostgreSQL
- Object storage
- Search index
- Cache
- Queues
- Audit data

### Platform

- REST API
- WebSocket/realtime
- Webhooks
- Notifications
- Admin
- Multi-tenancy
- Custom domains
- Aliases
- Disposable addresses
- Quotas

### Ecosystem

- Calendar
- Contacts
- Tasks
- Notes
- Storage
- Collaboration
- Automation
- Mobile apps
- Developer APIs

---

# 9. Standards-Based Email Foundation

Eazzio must be based on Internet email standards rather than inventing an incompatible mail protocol.

The original project source already establishes SMTP as the sending/transfer layer and IMAP as the mailbox access/synchronization layer.

The technical foundation should include:

- SMTP
- SMTP Submission
- IMAP
- MIME
- Internet Message Format
- DNS
- MX
- SPF
- DKIM
- DMARC
- ARC
- TLS
- STARTTLS
- MTA-STS
- TLS-RPT
- optional DANE
- relevant message headers and interoperability standards

---

# 10. SMTP Architecture

SMTP will be responsible for:

- inbound mail reception;
- outbound delivery;
- server-to-server transfer;
- relay;
- submission;
- queuing;
- retry;
- bounce handling.

Eazzio's architecture:

```text
External Mail Server
        │
        ▼
    DNS / MX
        │
        ▼
 Eazzio SMTP Receiver
        │
        ▼
 Validation
        │
        ▼
 Mail Security Pipeline
        │
        ▼
 Mail Storage
```

Outbound:

```text
User
 ↓
Eazzio API
 ↓
Message Validation
 ↓
MIME Construction
 ↓
DKIM Signing
 ↓
Outbound Policy
 ↓
Queue
 ↓
DNS MX Lookup
 ↓
TLS Policy
 ↓
SMTP Delivery
 ↓
Success / Retry / Bounce
```

---

# 11. IMAP Architecture

IMAP will be used for interoperability with third-party clients.

It will support:

- mailbox listing;
- message access;
- flags;
- read/unread state;
- folder synchronization;
- message movement;
- message deletion;
- client synchronization;
- third-party email applications.

The browser and native Eazzio clients should use the Eazzio API/realtime layer rather than unnecessarily using IMAP as their internal application protocol.

This preserves the API-first architecture established earlier in the project.

---

# 12. MIME and Message Structure

Eazzio must natively understand:

```text
Email
├── Headers
├── Plain Text
├── HTML
├── Multipart Sections
└── Attachments
```

The message engine must handle:

- encoding;
- character sets;
- multipart messages;
- HTML sanitization;
- inline images;
- attachments;
- content types;
- transfer encoding;
- header parsing.

---

# 13. DNS and Domain Architecture

Custom-domain support is a major Eazzio feature.

A domain onboarding flow:

```text
Domain Added
     ↓
DNS Verification
     ↓
MX
     ↓
SPF
     ↓
DKIM
     ↓
DMARC
     ↓
MTA-STS
     ↓
TLS-RPT
     ↓
Domain Activated
```

The earlier project source already identifies this flow for custom-domain onboarding.

---

# 14. SPF

SPF will authenticate the authorized SMTP sending infrastructure for a domain.

Eazzio should use SPF for:

- sender authorization;
- spoofing detection;
- domain policy;
- delivery reputation;
- authentication results.

---

# 15. DKIM

Eazzio will cryptographically sign outgoing messages.

```text
Message
 ↓
Canonicalization
 ↓
Hash
 ↓
Private-key Signature
 ↓
DKIM-Signature
 ↓
SMTP Delivery
```

Recipients can retrieve the public key through DNS and verify the signature.

---

# 16. DMARC

DMARC will combine authentication results with domain alignment and policy.

```text
SPF
 +
DKIM
 +
Alignment
 +
Domain Policy
 ↓
DMARC Decision
 ↓
Accept / Quarantine / Reject
```

Eazzio domain administrators should be able to configure and monitor DMARC policies and reports.

---

# 17. ARC, MTA-STS, TLS-RPT and DANE

Advanced mail interoperability will be supported through additional standards where beneficial.

### ARC

Useful for authentication continuity across forwarding and intermediaries.

### MTA-STS

Useful for publishing a policy requiring secure SMTP transport.

### TLS-RPT

Useful for discovering TLS delivery failures.

### DANE

Potential future mechanism for DNS-based certificate association and SMTP transport security.

These are **advanced interoperability/security components**, not replacements for SMTP, SPF, DKIM or DMARC.

---

# 18. Complete Incoming Mail Pipeline

```text
                      INTERNET
                          │
                          ▼
                     DNS / MX
                          │
                          ▼
                   SMTP Receiver
                          │
                          ▼
                    TLS Handling
                          │
                          ▼
                  Envelope Validation
                          │
                          ▼
                     SPF Check
                          │
                          ▼
                    DKIM Check
                          │
                          ▼
                  DMARC / ARC
                          │
                          ▼
                    MIME Parser
                          │
                          ▼
                 Header Extraction
                          │
                          ▼
                 Attachment Analysis
                          │
                          ▼
                  Antivirus Scan
                          │
                          ▼
                    Sandbox
                          │
                          ▼
                Reputation Analysis
                          │
                          ▼
                  Spam Classification
                          │
                          ▼
                 Phishing Detection
                          │
                          ▼
                   Rule Engine
                          │
                          ▼
                 Policy Decision
                          │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Reject     Quarantine   Accept
                                      │
                                      ▼
                                  Storage
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                      Database      Search       Object
                                   Index          Store
                         │            │            │
                         └────────────┼────────────┘
                                      ▼
                                  Notification
                                      │
                                      ▼
                                   Mailbox
```

The source project already establishes this general receive → authenticate → validate → scan → classify → store → index → notify model.

---

# 19. Complete Outgoing Mail Pipeline

```text
User
 ↓
Compose
 ↓
Eazzio API
 ↓
Authentication
 ↓
Authorization
 ↓
Message Validation
 ↓
HTML Sanitization
 ↓
MIME Construction
 ↓
DKIM Signing
 ↓
Outbound Policy
 ↓
Rate Limiting
 ↓
Delivery Queue
 ↓
Recipient Domain
 ↓
DNS / MX
 ↓
MTA-STS / DANE Policy
 ↓
STARTTLS
 ↓
Certificate Validation
 ↓
SMTP Delivery
 ↓
 ┌───────────────┬─────────────────┐
 ▼               ▼                 ▼
Success       Temporary Fail     Permanent Fail
 ▼               ▼                 ▼
Delivered      Retry             Bounce
                 │
                 ▼
              Backoff
                 │
                 ▼
               Retry
```

---

# 20. Mail Queue and Retry Algorithms

Mail delivery must tolerate network failure.

Eazzio will therefore use:

- durable queues;
- persistent delivery state;
- exponential backoff;
- temporary/permanent failure classification;
- retry windows;
- dead-letter handling;
- idempotency;
- delivery history.

The project source specifically establishes durable queues, retries, failover and dead-letter queues as reliability mechanisms.

---

# 21. Spam Intelligence Engine

Eazzio will use a **multi-layer spam detection system**, not a single algorithm.

```text
                     Email
                       │
             ┌─────────┴─────────┐
             │                   │
       Authentication        Content
             │               Analysis
             │                   │
             └─────────┬─────────┘
                       ▼
                Feature Extraction
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
  Rule Engine     Statistical        ML Model
       │               │                │
       └───────────────┼────────────────┘
                       ▼
                  Risk Scoring
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
           Inbox   Suspicious    Spam
```

Potential algorithms:

- Rule-based scoring
- Bayesian filtering
- Naive Bayes
- Reputation scoring
- Header anomaly detection
- URL analysis
- statistical classification
- machine learning
- behavioral signals
- user feedback
- attachment risk scoring

Rspamd is especially relevant as an open-source implementation foundation because it already combines rules, statistical analysis, URL blacklists, scoring and custom services.

---

# 22. Malware and Attachment Engine

The attachment security system should operate independently.

```text
Attachment
 ↓
MIME Validation
 ↓
File Type Identification
 ↓
Hash
 ↓
Known Threat Check
 ↓
ClamAV
 ↓
Archive Inspection
 ↓
Static Analysis
 ↓
Sandbox
 ↓
Risk Score
 ↓
Allow / Quarantine / Block
```

ClamAV is designed specifically for antivirus and mail-gateway scanning and supports many archive and document formats.

---

# 23. Deterministic Security vs AI

Eazzio must never confuse AI with fundamental security.

### Deterministic security

- TLS
- Authentication
- SPF
- DKIM
- DMARC
- access control
- file validation
- antivirus
- policy rules

### Probabilistic intelligence

- spam prediction
- classification
- priority prediction
- summarization
- response generation
- semantic search

The architecture must be:

```text
Security
   ↓
Trust Boundary
   ↓
Deterministic Policy
   ↓
Optional AI
```

Not:

```text
AI
 ↓
Decides whether security is valid
```

The existing Eazzio architecture already establishes this separation.

---

# 24. Search and Indexing

Search is a core subsystem.

The architecture:

```text
Email
 ↓
Parser
 ↓
Tokenizer
 ↓
Normalizer
 ↓
Indexer
 ↓
Inverted Index
 ↓
Query Engine
 ↓
Ranking
```

Searchable fields include:

- sender;
- recipient;
- CC;
- BCC;
- subject;
- body;
- filename;
- attachment;
- date;
- folder;
- label;
- thread;
- domain;
- status;
- size.

Candidate algorithms include:

- inverted indexes;
- tokenization;
- stemming;
- phrase matching;
- Boolean search;
- prefix search;
- relevance scoring;
- fuzzy matching;
- autocomplete;
- filtering;
- sorting.

OpenSearch can serve as the self-hostable search platform for this layer.

---

# 25. Gmail-Inspired Labels + Traditional Folders

Eazzio will intentionally support **both**.

### Folder

Represents hierarchical mailbox organization and interoperability.

### Label

Represents flexible metadata.

One message can therefore simultaneously have:

```text
Folder:
Inbox

Labels:
Work
Important
Finance
Project-X
```

without duplicating the underlying message.

This retains the project’s Gmail-inspired organization model.

---

# 26. Threading

Conversation view will be built using message relationships such as:

- Message-ID
- In-Reply-To
- References
- subject relationships
- participants
- internal thread identifiers

Each actual message remains independently stored.

```text
Thread
├── Original
├── Reply
├── Reply
├── Forward
└── Reply
```

---

# 27. Data Architecture

Eazzio will separate data responsibilities.

### PostgreSQL

Structured metadata:

- users;
- organizations;
- domains;
- mailboxes;
- messages metadata;
- recipients;
- labels;
- folders;
- threads;
- policies;
- sessions;
- audit records.

PostgreSQL is open source, supports transactional integrity and is explicitly maintained as a free/open-source database.

### Object Storage

Large data:

- raw MIME;
- attachments;
- message media;
- large objects.

### OpenSearch

Search index:

- full-text terms;
- metadata;
- ranking;
- filtering.

### Valkey

Fast data:

- sessions;
- caching;
- rate-limit counters;
- temporary state;
- queues where appropriate.

Valkey is particularly aligned with the "open source forever" requirement and is backed by the Linux Foundation.

---

# 28. Encryption Architecture

Eazzio will distinguish three privacy levels.

## Standard Mode

```text
Client
 ↓ TLS
Eazzio
 ↓
Encrypted Storage
```

The server can perform:

- spam filtering;
- malware scanning;
- search indexing;
- optional AI processing.

## Enhanced Privacy Mode

The system restricts server-side processing and strengthens encryption/key controls.

## End-to-End Encryption Mode

```text
Sender Device
 ↓
Encrypt
 ↓
Eazzio
 ↓
Encrypted Message
 ↓
Recipient Device
 ↓
Decrypt
```

The server must not be described as providing E2EE merely because it uses TLS or encrypted storage.

This distinction is essential to the project.

---

# 29. Cryptographic Architecture

The final cryptographic implementation should prefer well-established, audited, open-source cryptographic libraries and standardized algorithms.

Potential building blocks include:

- authenticated symmetric encryption;
- modern public-key cryptography;
- elliptic-curve key agreement;
- digital signatures;
- key derivation;
- secure random generation;
- device keys;
- recovery keys;
- key rotation;
- cryptographic versioning.

The principle is:

> **Do not invent cryptography.**

Proton's published architecture provides a useful reference for the use of open-source cryptographic components and client-side encryption concepts.

---

# 30. Authentication and Authorization

Eazzio will contain its own identity system.

### Authentication

- password authentication;
- MFA;
- device/session management;
- recovery;
- suspicious-login detection;
- session revocation.

### Authorization

- user permissions;
- organization permissions;
- mailbox permissions;
- delegated access;
- domain administration;
- API scopes;
- service accounts.

Example:

```text
Platform Admin
      ↓
Organization Admin
      ↓
Domain Admin
      ↓
Mailbox Admin
      ↓
User
```

---

# 31. API-First Architecture

The existing project source establishes API-first architecture as a central principle.

Core API areas:

```text
/auth
/users
/organizations
/domains
/mailboxes
/messages
/threads
/labels
/folders
/attachments
/search
/contacts
/notifications
/settings
/security
/admin
```

The API becomes the central interface for:

- web;
- mobile;
- desktop;
- automation;
- integrations;
- developer applications.

---

# 32. Event-Driven Architecture

Internal operations generate events such as:

```text
EMAIL_RECEIVED
EMAIL_CLASSIFIED
EMAIL_STORED
EMAIL_INDEXED
EMAIL_DELIVERED
EMAIL_READ
EMAIL_ARCHIVED
EMAIL_LABELED
EMAIL_DELETED
ATTACHMENT_SCANNED
SPAM_DETECTED
LOGIN_DETECTED
```

These events can drive:

- notifications;
- search indexing;
- analytics;
- audit;
- automation;
- AI;
- security monitoring.

The event-driven model is already established in the existing project documentation.

---

# 33. Real-Time Synchronization

Eazzio will synchronize:

- web;
- mobile;
- desktop;
- IMAP;
- API clients.

Example:

```text
Mobile
  ↓
Mark Read
  ↓
Eazzio API
  ↓
Database
  ↓
Event
  ↓
Realtime Layer
  ├── Web
  ├── Desktop
  └── Mobile
```

---

# 34. Notification Architecture

The notification subsystem should be asynchronous.

It can handle:

- new mail;
- important messages;
- delivery events;
- security alerts;
- account alerts;
- mobile push;
- web push;
- future calendar events.

It must not delay the fundamental mail-storage transaction.

This preserves the asynchronous notification principle already established in the project source.

---

# 35. Multi-Tenant Architecture

Eazzio will support personal accounts and organizations.

```text
EAZZIO
│
├── Organization A
│   ├── Domains
│   ├── Users
│   ├── Policies
│   └── Mailboxes
│
├── Organization B
│   ├── Domains
│   ├── Users
│   ├── Policies
│   └── Mailboxes
│
└── Organization C
    ├── Domains
    ├── Users
    ├── Policies
    └── Mailboxes
```

Tenant isolation must exist across:

- API;
- database;
- storage;
- search;
- background workers;
- authorization;
- administration.

The project source explicitly retains Zoho-inspired multi-tenancy as a major Eazzio feature.

---

# 36. Custom Domain and Alias Architecture

Eazzio will support:

- custom domains;
- role addresses;
- department addresses;
- aliases;
- temporary addresses;
- disposable addresses.

Example:

```text
rahul@company.com
support@company.com
sales@company.com
billing@company.com
shopping-7d91@alias.eazzio.com
```

Aliases may point to existing mailboxes without creating separate physical mail storage.

---

# 37. Filtering Rule Engine

Users will be able to create rules such as:

```text
IF sender domain = company.com
THEN label = Work

IF subject contains "invoice"
THEN label = Finance

IF attachment = executable
THEN quarantine

IF sender reputation = malicious
THEN reject

IF mailing-list headers exist
THEN label = Subscriptions
```

Rules can operate:

- before storage;
- after authentication;
- after classification;
- at mailbox level.

---

# 38. Mailing-List and Subscription Intelligence

Eazzio should understand relevant email subscription mechanisms.

Where supported, the interface can provide a safe **Unsubscribe** action.

The project source already includes RFC 8058-inspired one-click unsubscribe handling as part of its mail functionality.

---

# 39. Abuse Prevention

Email is a high-abuse infrastructure.

Eazzio will use rate limits at multiple layers.

### User

- login;
- API;
- sending.

### IP

- request rate;
- SMTP connections;
- abuse detection.

### Domain

- sending quotas;
- reputation;
- authentication.

### Infrastructure

- connection limits;
- worker limits;
- queue limits.

Candidate algorithms:

- Token Bucket
- Leaky Bucket
- Sliding Window
- Exponential Backoff
- Reputation Scoring

These mechanisms already appear in the project's reliability/abuse model.

---

# 40. Reliability and Fault Tolerance

Eazzio must assume infrastructure failure.

Possible failures:

- database;
- network;
- SMTP;
- DNS;
- worker;
- storage;
- search;
- notifications.

Required mechanisms:

- durable queues;
- retries;
- idempotency;
- health checks;
- failover;
- replication;
- backup;
- dead-letter queues.

The source project explicitly establishes these as core reliability mechanisms.

---

# 41. Idempotency

Repeated processing must not produce repeated effects.

```text
Same Event
    +
Retry
    ↓
Same Result
```

Idempotency is especially important for:

- message delivery;
- queue processing;
- webhooks;
- notifications;
- attachment scanning;
- indexing;
- automated actions.

---

# 42. Observability

The system will contain self-hosted observability.

### Logs

- authentication;
- SMTP;
- API;
- workers;
- security;
- delivery.

### Metrics

- delivery success;
- delivery latency;
- bounce rate;
- spam rate;
- queue depth;
- API latency;
- storage;
- search latency;
- CPU;
- memory;
- failures.

### Tracing

```text
API
 ↓
Mail Service
 ↓
Queue
 ↓
Worker
 ↓
Database
 ↓
Notification
```

The project source already establishes this logging/metrics/tracing model.

---

# 43. Audit System

Sensitive actions must generate immutable or strongly protected audit events.

Examples:

```text
USER_LOGIN
PASSWORD_CHANGED
MFA_CHANGED
DOMAIN_ADDED
MAILBOX_CREATED
MAIL_SENT
MAIL_DELETED
ADMIN_ACCESS
POLICY_CHANGED
API_KEY_CREATED
SESSION_REVOKED
```

---

# 44. Backup and Disaster Recovery

Eazzio will define:

- backup schedule;
- retention;
- replication;
- point-in-time recovery;
- object-storage backup;
- configuration backup;
- encryption-key recovery;
- recovery procedures.

Two primary objectives:

**RPO — Recovery Point Objective**

**RTO — Recovery Time Objective**

---

# 45. Scalability

Eazzio should scale components independently when required.

```text
                Load Balancer
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
        API-1      API-2      API-3
          │          │          │
          └──────────┼──────────┘
                     ▼
                 Mail Layer
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
        Queue      Search     Storage
```

Potential scaling units:

- API servers;
- SMTP workers;
- IMAP servers;
- queue workers;
- search nodes;
- notification workers;
- databases;
- object storage.

---

# 46. Cache Architecture

Valkey or another qualified open-source cache layer can provide:

- session caching;
- mailbox metadata;
- DNS caching;
- domain settings;
- search-cache candidates;
- rate-limit counters;
- temporary state.

Caching must never cross authorization boundaries.

Valkey is especially attractive under the Eazzio license policy because it explicitly describes itself as open source forever and is BSD-licensed.

---

# 47. Client Architecture

Eazzio will eventually expose:

### Web

Full browser mail experience.

### Mobile

Android and iOS.

### Desktop

Desktop application or PWA where useful.

### Third-Party Clients

IMAP/SMTP interoperability.

### Developer Clients

REST APIs and events.

This preserves the distinction between client applications and the underlying mail infrastructure.

---

# 48. Business Platform

Eazzio can eventually provide:

- custom-domain business mail;
- employee administration;
- quotas;
- policies;
- delegated access;
- domain aliases;
- group addresses;
- organizational security;
- audit;
- reporting;
- multi-tenancy.

This combines the strongest relevant business concepts from Outlook and Zoho.

---

# 49. Productivity Ecosystem

Future modules include:

```text
Eazzio Mail
├── Calendar
├── Contacts
├── Tasks
├── Notes
├── Cloud Storage
├── Collaboration
└── Automation
```

The original reference highlights ecosystem integration in Gmail, enterprise productivity in Outlook, and business-app integration in Zoho.

---

# 50. AI Mail System

AI is an **optional intelligence layer**.

Potential features:

- summarization;
- smart categorization;
- smart compose;
- reply suggestions;
- priority prediction;
- semantic search;
- thread summarization;
- phishing explanation;
- attachment understanding;
- inbox cleanup.

The AI system must be compatible with the open-source/free-technology rule.

Therefore Eazzio should prefer:

- self-hosted open-source models;
- local inference;
- open model runtimes;
- self-hosted embeddings;
- self-hosted vector/search infrastructure.

External proprietary AI APIs may be optional integrations, but they must never be required for core Eazzio operation.

---

# 51. AI Privacy Rule

For privacy-sensitive accounts:

```text
User Data
   ↓
Self-hosted AI
   ↓
Analysis
```

rather than:

```text
User Data
   ↓
External Proprietary AI API
   ↓
Third-party infrastructure
```

The user should be able to disable AI processing.

---

# 52. Modular Architecture

A mature Eazzio deployment may contain:

```text
Identity Service
Mail API
SMTP Inbound
SMTP Outbound
IMAP
Queue
Routing
Spam
Malware
Attachment
Search
Notification
Storage
Domain
Organization
Admin
Audit
AI
Analytics
```

However, Eazzio should **not begin as dozens of microservices**.

---

# 53. Recommended Evolution

```text
Phase 1
Modular Monolith
        ↓
Phase 2
Mail Workers
        ↓
Phase 3
Search / Notification / Scan Workers
        ↓
Phase 4
Independently Scaled Services
        ↓
Phase 5
Distributed Multi-Tenant Platform
```

This retains the previously established architecture strategy while avoiding premature complexity.

---

# 54. Complete Protocol Stack

```text
APPLICATION
│
├── REST API
├── WebSocket / Realtime
└── Web Push / Mobile Push
│
MAIL ACCESS
│
├── IMAP
└── SMTP Submission
│
MAIL TRANSPORT
│
└── SMTP
│
MESSAGE
│
├── RFC 5322
└── MIME
│
AUTHENTICATION
│
├── SPF
├── DKIM
├── DMARC
└── ARC
│
TRANSPORT SECURITY
│
├── TLS
├── STARTTLS
├── MTA-STS
├── TLS-RPT
└── Optional DANE
│
NETWORK
│
├── TCP/IP
└── DNS
```

This maintains the protocol-stack concept from the previous project version.

---

# 55. Eazzio Technology Categories

Eazzio's technology strategy will therefore be divided into four categories.

## Category A — Core Open Source

These become preferred permanent foundations.

Examples:

- PostgreSQL
- Nginx
- Postfix
- Dovecot CE
- Rspamd
- ClamAV
- OpenSearch
- Valkey
- Podman

## Category B — Open Standards

These are not products but protocols/specifications.

Examples:

- SMTP
- IMAP
- MIME
- DNS
- SPF
- DKIM
- DMARC
- ARC
- TLS
- MTA-STS
- TLS-RPT

## Category C — Eazzio-Owned Code

All core Eazzio business logic should be developed by the project itself:

- APIs;
- mailbox rules;
- authorization;
- tenant logic;
- UI;
- workflows;
- mail orchestration;
- policy engine;
- Eazzio-specific security controls.

## Category D — Optional External Integrations

These may exist but can never become mandatory core dependencies.

Examples:

- third-party AI;
- commercial cloud storage;
- optional SaaS integrations;
- commercial monitoring;
- optional external identity providers.

---

# 56. Open-Source Dependency Firewall

Eazzio should maintain a rule:

> **No new dependency enters production merely because it is popular.**

Every major dependency must be evaluated for:

```text
License
Security
Maintainer health
Community health
Self-hostability
Commercial-use rights
Vendor lock-in
Data ownership
Migration difficulty
Long-term sustainability
```

A dependency that fails the policy should be replaced or isolated behind an interface.

---

# 57. Vendor-Lock-In Prevention

Every external subsystem should have an abstraction layer.

Example:

```text
Eazzio Storage Interface
        │
        ├── MinIO
        ├── Local filesystem
        ├── S3-compatible storage
        └── Future provider
```

Similarly:

```text
Eazzio AI Interface
        │
        ├── Local Model
        ├── Ollama
        ├── Open-source inference server
        └── Optional external API
```

The core architecture should never assume a single vendor.

---

# 58. Development Environment

The development environment should also follow the same philosophy.

Preferred tools:

- Linux
- Git
- Git-based workflows
- open-source IDE/editor options
- Python
- Node.js
- PostgreSQL
- Podman
- open-source test tooling
- open-source linters
- open-source dependency scanners
- local development environments

The project should avoid requiring a paid IDE or development SaaS.

---

# 59. Deployment Philosophy

Eazzio must be capable of:

### Local Deployment

```text
Single Linux Machine
```

### Small Server Deployment

```text
Linux Server
 + PostgreSQL
 + Mail Services
 + Search
 + Cache
 + Web
```

### Distributed Deployment

```text
Load Balancer
     ↓
Application Nodes
     ↓
Mail Workers
     ↓
Queues
     ↓
Search / Database / Storage
```

### Self-Hosted Enterprise Deployment

Multiple isolated organizations and domains.

---

# 60. Open-Source Infrastructure Principle

Eazzio should preferably run on a standard Linux server using software available independently of a specific cloud provider.

The system should be deployable on:

- personal hardware;
- VPS;
- dedicated server;
- private cloud;
- on-premises infrastructure;
- multiple cloud providers.

The target architecture is:

> **Cloud-optional, cloud-neutral, self-hostable.**

---

# 61. Security-by-Design

Every Eazzio subsystem should follow:

1. Least privilege
2. Defense in depth
3. Zero-trust service boundaries
4. Encryption in transit
5. Encryption at rest
6. Strong authentication
7. Tenant isolation
8. Secret management
9. Auditability
10. Rate limiting
11. Input validation
12. Secure output handling
13. Secure file handling
14. Dependency security
15. Vulnerability management

The project's previous security principles are retained in this final version.

---

# 62. Development Reasoning Rule

Every major Eazzio technical decision must answer four questions:

### What?

What protocol, technology, algorithm, feature or component is being used?

### Why?

What problem does it solve?

### How?

How does it operate internally?

### Why Eazzio?

Why was this solution selected over the alternatives?

This rule already exists in the project source and remains mandatory.

---

# 63. Example Technology Decision

Instead of writing:

> "Use PostgreSQL."

Eazzio documentation should state:

> **What:** PostgreSQL  
> **Why:** reliable transactional relational storage for structured mail metadata  
> **How:** ACID transactions, indexing, constraints, MVCC and relational modeling  
> **Why Eazzio:** open source, self-hostable, mature, highly extensible and available without recurring software licensing fees.

PostgreSQL's official project documentation supports its open-source licensing, reliability and extensibility.

The same format will apply to every major technology.

---

# 64. Documentation Architecture

This Project Overview becomes the parent document for all subsequent Eazzio documents.

```text
EAZZIO MAIL
│
├── 01. PROJECT OVERVIEW
├── 02. REQUIREMENTS SPECIFICATION
├── 03. SYSTEM ARCHITECTURE
├── 04. OPEN-SOURCE TECHNOLOGY STACK
├── 05. PROTOCOL & MAIL STANDARDS
├── 06. DATABASE ARCHITECTURE
├── 07. MAIL FLOW ARCHITECTURE
├── 08. SPAM & FILTERING ENGINE
├── 09. MALWARE & ATTACHMENT SECURITY
├── 10. SECURITY ARCHITECTURE
├── 11. ENCRYPTION ARCHITECTURE
├── 12. AUTHENTICATION & AUTHORIZATION
├── 13. API SPECIFICATION
├── 14. SEARCH & INDEXING
├── 15. STORAGE ARCHITECTURE
├── 16. QUEUE & DELIVERY SYSTEM
├── 17. NOTIFICATION & REALTIME
├── 18. MULTI-TENANCY
├── 19. DOMAIN & DNS ARCHITECTURE
├── 20. ADMINISTRATION
├── 21. OBSERVABILITY & AUDIT
├── 22. BACKUP & DISASTER RECOVERY
├── 23. WEB APPLICATION
├── 24. MOBILE APPLICATION
├── 25. AI MAIL SYSTEM
├── 26. TESTING STRATEGY
├── 27. DEPLOYMENT & INFRASTRUCTURE
├── 28. LICENSE & DEPENDENCY GOVERNANCE
└── 29. FUTURE EAZZIO ECOSYSTEM
```

The prior documentation hierarchy already establishes the Project Overview as the parent document for subsequent technical documents; this final version adds an explicit Open-Source Technology Stack and License & Dependency Governance layer.

---

# 65. Project Success Criteria

Eazzio Mail will be considered architecturally successful when it can:

- send email;
- receive email;
- store email;
- synchronize email;
- search email;
- organize email;
- filter spam;
- scan attachments;
- authenticate domains;
- enforce transport security;
- support custom domains;
- support aliases;
- support third-party mail clients;
- provide APIs;
- provide administration;
- support organizations;
- protect tenant boundaries;
- recover from failures;
- expose observability;
- scale independently;
- operate without proprietary SaaS dependencies;
- operate using self-hostable open-source infrastructure.

---

# 66. Core Feature Matrix

| Capability | Eazzio Status |
|---|---|
| Email sending | Core |
| Email receiving | Core |
| SMTP | Core |
| SMTP Submission | Core |
| IMAP | Core interoperability |
| MIME | Core |
| TLS | Core |
| SPF | Core |
| DKIM | Core |
| DMARC | Core |
| ARC | Advanced |
| MTA-STS | Advanced |
| TLS-RPT | Advanced |
| DANE | Optional advanced |
| Spam filtering | Core |
| Bayesian filtering | Candidate |
| Statistical filtering | Core |
| ML classification | Advanced |
| Malware scanning | Core |
| Sandboxing | Advanced |
| Phishing detection | Core |
| Rule engine | Core |
| Search | Core |
| Full-text indexing | Core |
| Labels | Core |
| Folders | Core |
| Threads | Core |
| Attachments | Core |
| Aliases | Core |
| Disposable aliases | Advanced |
| Custom domains | Advanced/Core for business |
| API | Core |
| Webhooks | Advanced |
| Realtime synchronization | Core |
| Push notifications | Core |
| Multi-tenancy | Advanced |
| Admin portal | Core for organization edition |
| Audit logs | Core |
| Monitoring | Core |
| Encryption at rest | Core |
| Privacy mode | Advanced |
| E2EE | Advanced |
| AI | Advanced |
| Calendar | Future |
| Contacts | Future |
| Tasks | Future |
| Cloud storage | Future |
| Collaboration | Future |

---

# 67. What Eazzio Will Not Do

Eazzio will not:

- blindly copy Gmail's proprietary architecture;
- reproduce Microsoft's proprietary Exchange implementation;
- claim Proton's exact security model without implementing the necessary cryptographic guarantees;
- depend permanently on OpenAI or another proprietary AI provider;
- make a paid SaaS database mandatory;
- make a paid search engine mandatory;
- make a paid mail server mandatory;
- make a paid observability platform mandatory;
- make a paid hosting provider mandatory;
- treat "free tier" SaaS as equivalent to open source;
- invent cryptographic algorithms;
- sacrifice security merely to avoid licensing costs.

---

# 68. Eazzio's Central Architectural Formula

```text
OPEN STANDARDS
       +
OPEN SOURCE
       +
SELF HOSTING
       +
SECURITY
       +
INTEROPERABILITY
       +
SCALABILITY
       +
MODULARITY
       +
PRIVACY
       +
AUTOMATION
       +
AI
       ↓
   EAZZIO MAIL
```

The objective is not merely "free email software."

The objective is:

> **A complete independent email ecosystem that Eazzio can own, operate, modify, scale and migrate without becoming structurally dependent on a proprietary vendor.**

---

# 69. Final Project Definition

**Eazzio Mail is an independent, open-source-first, standards-based, self-hostable email and communication ecosystem designed to combine advanced usability, organization, enterprise administration, privacy, encryption, interoperability, spam intelligence, malware protection, search, automation, realtime synchronization, APIs, multi-tenancy, and scalable infrastructure into one unified platform.**

It combines the strongest applicable concepts identified in the supplied Gmail/Yahoo/Outlook/Proton Mail/Zoho reference while maintaining an independent implementation. The reference specifically provides comparisons of features, working models, filtering, storage, synchronization, security, APIs and mail-server protocols across those systems.

Its technical foundation will use established email standards including SMTP, IMAP, MIME, DNS, SPF, DKIM, DMARC, TLS and related security/interoperability mechanisms.

Its software stack will follow the Eazzio **Open-Source-First / Free-Software Policy**:

> **Prefer software that is open source, self-hostable, commercially usable under its license, free of mandatory recurring software-license fees, and maintainable independently of a proprietary SaaS provider.**

Projects with especially strong open-source commitments may be preferred where technically suitable; for example, PostgreSQL explicitly states its continuing free/open-source commitment, while Valkey explicitly positions itself as open source forever.

The project will also maintain a **dependency and license governance process** so that "free" does not become synonymous with "vendor-controlled."

---

# 70. Fundamental Eazzio Engineering Rule

> **Understand the problem first.**
>
> **Select the open standard where one exists.**
>
> **Select the strongest suitable open-source implementation where appropriate.**
>
> **Use an independent Eazzio implementation where necessary.**
>
> **Document what, why, how, and why Eazzio.**
>
> **Never allow a convenient proprietary dependency to become an unavoidable core dependency.**
>
> **Build every subsystem so that security, interoperability, reliability, scalability, privacy and long-term independence are preserved.**

---

# 71. Status of This Document

This document is the **Final Task 1 — Master Project Overview for Eazzio Mail**.

It is the parent context for all future Eazzio Mail work.

The next technical tasks should **expand this document**, not contradict it.

Every later architecture, database, protocol, algorithm, UI, security, infrastructure, API, AI, testing and deployment decision must remain consistent with:

**Eazzio Mail = All-in-One Email Ecosystem + Open Standards + Open Source + Free-Software-First + Self-Hosted + Secure + Scalable + Independent.**
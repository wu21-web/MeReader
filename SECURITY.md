# Security Policy

## Supported Versions
**NOTICE THAT MEREADER ON VERCEL IS NOT STABLE. TO CONTRIBUTE, YOU SHOULD CLONE AND RUN A DEV SERVER ON A LOCAL MACHINE.**

We actively provide security updates for the following versions of **MeReader**:

| Version | Supported |
| --- | --- |
| 1.0.x | ✅ |
| < 1.0 | ❌ |

## Our Commitment to Privacy

This application is designed with **Privacy by Design** principles:

- **Ephemeral Storage:** All uploaded files are stored in the `tmp_uploads/` directory.
- **Auto-Deletion:** Files are strictly purged **24 hours** after upload via an automated cleanup task.
- **No Persistent Database:** We do not index or store the content of your READMEs in a permanent database.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a potential security flaw (e.g., Remote Code Execution in the PDF engine, Cross-Site Scripting (XSS) in the Markdown renderer, or directory traversal risks), please follow these steps:

1. **Email us:** Send a detailed report to **wu2196674@gmail.com**.
2. **Include Details:** Provide a summary of the vulnerability, steps to reproduce, and a proof-of-concept (if applicable).
3. **Wait for Response:** You will receive an acknowledgment within **48–72 hours**.
4. **Collaboration:** We can add you as a collaborator if you have enough ability to maintain this repository after evaluating your email.

### Scope

We are particularly interested in reports related to:

- **XSS (Cross-Site Scripting):** Bypassing the Markdown sanitizer to execute arbitrary JS.
- **SSRF (Server-Side Request Forgery):** Using the PDF exporter to access internal network resources.
- **Path Traversal:** Accessing files outside the designated `tmp_uploads/` directory.

## Response Process

After a report is received:

1. We will verify the vulnerability in a sandbox environment.
2. A fix will be developed and tested.
3. A security advisory will be published, and the reporter will be credited (unless anonymity is requested).

## Non-Qualifying Vulnerabilities

- Social engineering attacks against maintainers.
- Denial of Service (DoS) attacks that do not involve a specific software bug.
- Issues related to outdated browser versions.

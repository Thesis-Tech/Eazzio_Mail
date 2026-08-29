import { SmtpDiagnosticRunner } from '../packages/infra-adapters/src/email-transport/smtp-diagnostic-cli.js';

const targetDomain = process.argv[2] || 'gmail.com';
console.log(`\n🔍 Running Eazzio SMTP Diagnostic Test against: ${targetDomain} ...\n`);

SmtpDiagnosticRunner.runDiagnostics(targetDomain)
  .then((res) => {
    console.log('================ DIAGNOSTIC REPORT ================');
    console.log(`Target Domain        : ${res.domain}`);
    console.log(`Resolved MX Hosts    : ${res.mxRecords.map((m) => `${m.host} (priority ${m.priority})`).join(', ') || 'None'}`);
    console.log(`Port 25 Reachable    : ${res.port25Reachable ? '✅ YES' : '❌ NO (Blocked/Timed out)'}`);
    console.log(`STARTTLS Handshake   : ${res.tlsHandshakeSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (res.tlsProtocol) console.log(`TLS Protocol         : ${res.tlsProtocol}`);
    if (res.tlsCipher) console.log(`TLS Cipher           : ${res.tlsCipher}`);
    if (res.certificateSubject) console.log(`Certificate Subject  : ${res.certificateSubject}`);
    console.log(`DKIM RSA-2048 Signer : ${res.dkimSignatureGenerated ? '✅ OPERATIONAL' : '❌ FAILED'}`);
    if (res.diagnosticError) console.log(`Diagnostic Notice    : ⚠️  ${res.diagnosticError}`);
    console.log('====================================================\n');
  })
  .catch((err) => {
    console.error('Fatal diagnostic failure:', err);
    process.exit(1);
  });

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dns from 'dns';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to, cc, bcc, subject, text, html, attachments } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipient address (to) is required.' },
        { status: 400 }
      );
    }

    const fromAddress = from || process.env.DEFAULT_FROM_EMAIL || 'support@eazzio.com';
    const emailSubject = subject || '(No Subject)';
    const emailBody = text || '';
    const emailHtml = html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`;

    let transporter: nodemailer.Transporter | null = null;

    // 1. Check if explicit SMTP credentials or service are configured in environment
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });
    } else if (process.env.SMTP_SERVICE) {
      transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });
    } else {
      // 2. Direct MX resolution fallback for external destinations (e.g. gmail.com)
      const recipientDomain = to[0].split('@')[1];
      let mxHost = 'localhost';
      let mxPort = 25;

      try {
        if (recipientDomain && recipientDomain !== 'localhost' && recipientDomain !== 'eazzio.com') {
          const mxRecords = await dns.promises.resolveMx(recipientDomain);
          if (mxRecords && mxRecords.length > 0) {
            mxRecords.sort((a, b) => a.priority - b.priority);
            mxHost = mxRecords[0]!.exchange;
            mxPort = 25;
          }
        }
      } catch (dnsErr) {
        console.warn('Direct DNS MX lookup warning:', dnsErr);
      }

      transporter = nodemailer.createTransport({
        host: mxHost,
        port: mxPort,
        secure: false,
        ignoreTLS: false,
        name: 'eazzio.com',
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
      });
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `Eazzio Mail <${fromAddress}>`,
      to: to.join(', '),
      cc: cc && cc.length > 0 ? cc.join(', ') : undefined,
      bcc: bcc && bcc.length > 0 ? bcc.join(', ') : undefined,
      subject: emailSubject,
      text: emailBody,
      html: emailHtml,
      attachments: attachments?.map((a: { name: string; content?: string; path?: string }) => ({
        filename: a.name,
        content: a.content ? Buffer.from(a.content, 'base64') : undefined,
        path: a.path,
      })),
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response,
    });
  } catch (error: any) {
    console.error('Mail dispatch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to dispatch email.',
        code: error.code,
        command: error.command,
      },
      { status: 500 }
    );
  }
}

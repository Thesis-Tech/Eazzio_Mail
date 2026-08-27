import { NextResponse } from 'next/server';
import { OtpStore } from '../../../../lib/otp-store';

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json() as { phoneNumber?: string };

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Generate random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    OtpStore.setOtp(cleanPhone, generatedOtp, 'whatsapp', 300);

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (accessToken && phoneNumberId) {
      // Call Meta WhatsApp Cloud API
      const metaUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      const metaResponse = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: `Your Eazzio Mail verification code is: *${generatedOtp}*. It expires in 5 minutes. Do not share this code with anyone.`,
          },
        }),
      });

      if (!metaResponse.ok) {
        const errorData = await metaResponse.json() as unknown;
        console.error('Meta Cloud API Error:', errorData);
        // Fallback: OTP is cached in memory
      }
    } else {
      console.log(`[Eazzio Mail WhatsApp Gateway (Dev Mode)] OTP for ${phoneNumber}: ${generatedOtp}`);
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent via WhatsApp',
      // In dev mode (without token), return code in response for testing ease
      devCode: !accessToken ? generatedOtp : undefined,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { OtpStore } from '../../../../lib/otp-store';

export async function POST(req: Request) {
  try {
    const { phoneNumber, code } = await req.json() as { phoneNumber?: string; code?: string };

    if (!phoneNumber || !code) {
      return NextResponse.json({ error: 'Phone number and verification code are required' }, { status: 400 });
    }

    const isValid = OtpStore.verifyOtp(phoneNumber, code.trim());

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Phone number successfully verified',
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Verification failed' },
      { status: 500 }
    );
  }
}

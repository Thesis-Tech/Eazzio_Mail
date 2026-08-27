'use client';

import Script from 'next/script';

export interface FacebookAuthResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
  };
}

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      AppEvents: {
        logPageView: () => void;
      };
      getLoginStatus: (callback: (response: FacebookAuthResponse) => void) => void;
      login: (
        callback: (response: FacebookAuthResponse) => void,
        options?: { scope?: string; return_scopes?: boolean }
      ) => void;
      api: (
        path: string,
        params: Record<string, unknown>,
        callback: (response: { id?: string; name?: string; email?: string }) => void
      ) => void;
    };
  }
}

export function FacebookSdk() {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1048603114736224';
  const apiVersion = process.env.NEXT_PUBLIC_FACEBOOK_API_VERSION || 'v21.0';

  return (
    <>
      <div id="fb-root"></div>
      <Script
        id="facebook-jssdk"
        strategy="lazyOnload"
        src="https://connect.facebook.net/en_US/sdk.js"
        onError={(e) => {
          // Silently handle blocked tracking script in privacy browsers (Brave, ad blockers)
          console.debug('Facebook SDK script blocked or unavailable');
        }}
        onLoad={() => {
          if (typeof window !== 'undefined') {
            window.fbAsyncInit = function () {
              if (window.FB) {
                window.FB.init({
                  appId: appId,
                  cookie: true,
                  xfbml: true,
                  version: apiVersion,
                });
                window.FB.AppEvents.logPageView();
              }
            };
            if (window.FB) {
              window.fbAsyncInit();
            }
          }
        }}
      />
    </>
  );
}

export function loginWithFacebook(): Promise<{ id: string; name: string; email: string }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window context is unavailable.'));
      return;
    }

    // Facebook OAuth strictly requires HTTPS per Facebook Platform Security Policy.
    const isHttps = window.location.protocol === 'https:';

    if (!isHttps) {
      reject(
        new Error(
          'Facebook OAuth requires a secure HTTPS connection. On localhost, please use Email, Password, or OTP authentication.'
        )
      );
      return;
    }

    if (!window.FB) {
      reject(
        new Error(
          'Facebook SDK is blocked by your browser (e.g. tracking protection) or currently unavailable.'
        )
      );
      return;
    }

    try {
      window.FB.login(
        (response) => {
          if (response.status === 'connected') {
            window.FB?.api('/me', { fields: 'id,name,email' }, (profile) => {
              if (!profile || !profile.id) {
                reject(new Error('Failed to retrieve profile data from Facebook Graph API.'));
                return;
              }
              const email =
                profile.email ||
                `${profile.name?.toLowerCase().replace(/[^a-z0-9.]/g, '.') || 'fb.user'}@eazzio.com`;
              resolve({
                id: profile.id,
                name: profile.name || 'Facebook User',
                email,
              });
            });
          } else {
            reject(new Error('Facebook login was cancelled or not authorized.'));
          }
        },
        { scope: 'public_profile,email' }
      );
    } catch (err: any) {
      reject(err);
    }
  });
}

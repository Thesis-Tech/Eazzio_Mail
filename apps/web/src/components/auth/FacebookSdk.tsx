'use client';

import Script from 'next/script';

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
      login: (
        callback: (response: unknown) => void,
        options?: { scope?: string; return_scopes?: boolean }
      ) => void;
    };
  }
}

export function FacebookSdk() {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
  const apiVersion = process.env.NEXT_PUBLIC_FACEBOOK_API_VERSION || 'v21.0';

  return (
    <>
      <div id="fb-root"></div>
      <Script
        id="facebook-jssdk"
        strategy="afterInteractive"
        src="https://connect.facebook.net/en_US/sdk.js"
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
            // Trigger init if FB is already loaded
            if (window.FB) {
              window.fbAsyncInit();
            }
          }
        }}
      />
    </>
  );
}

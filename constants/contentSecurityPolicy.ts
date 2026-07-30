/** Shared CSP — keep in sync with vercel.json production headers. */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; base-uri 'self'; object-src 'none'; " +
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://www.googletagmanager.com " +
  "https://js.paystack.co https://paystack.co https://*.paystack.co https://paystack.com https://*.paystack.com " +
  "https://esm.sh https://static.zdassets.com https://ekr.zdassets.com https://zendesk.com https://*.zendesk.com " +
  "https://connect.facebook.net https://doubleclick.net https://*.doubleclick.net https://googleadservices.com " +
  "https://*.googleadservices.com https://widget.dojah.io https://dojah.io https://*.dojah.io; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://zdassets.com https://*.zdassets.com " +
  "https://paystack.com https://*.paystack.com https://paystack.co https://*.paystack.co; " +
  "font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; " +
  "connect-src 'self' https://api.dojah.io https://identity.dojah.io https://widget.dojah.io https://dojah.io https://*.dojah.io " +
  "https://nolt-admin-backend-production-7761.up.railway.app wss://nolt-admin-backend-production-7761.up.railway.app " +
  "https://api.paystack.co https://paystack.co https://*.paystack.co https://paystack.com https://*.paystack.com " +
  "https://api.ng.termii.com https://api.usezeeh.com https://google-analytics.com https://www.google-analytics.com " +
  "https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://doubleclick.net " +
  "https://*.doubleclick.net https://googleadservices.com https://*.googleadservices.com https://facebook.com " +
  "https://*.facebook.com https://google.com https://www.google.com https://esm.sh https://zdassets.com https://*.zdassets.com " +
  "https://zendesk.com https://*.zendesk.com https://*.a.run.app https://*.on.aws; " +
  "frame-src https://identity.dojah.io https://widget.dojah.io https://dojah.io https://*.dojah.io " +
  "https://www.openstreetmap.org https://www.googletagmanager.com https://zendesk.com https://*.zendesk.com " +
  "https://zdassets.com https://*.zdassets.com https://paystack.com https://*.paystack.com https://paystack.co https://*.paystack.co; " +
  "frame-ancestors 'self'; form-action 'self'";

export const PERMISSIONS_POLICY =
  'geolocation=(self "https://identity.dojah.io" "https://widget.dojah.io"), ' +
  'microphone=(self "https://identity.dojah.io" "https://widget.dojah.io"), ' +
  'camera=(self "https://identity.dojah.io" "https://widget.dojah.io")';

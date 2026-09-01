/** Load non-critical third-party scripts after first paint. */
let loaded = false;

function appendScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
}

function loadGoogleTagManager() {
  if (document.getElementById('gtm-script')) return;

  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-P6JJ5QJH';
  document.head.appendChild(script);
}

export function loadDeferredScripts() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;

  loadGoogleTagManager();
  appendScript('https://js.paystack.co/v1/inline.js', 'paystack-inline');
  appendScript(
    'https://static.zdassets.com/ekr/snippet.js?key=c46adf86-c074-4726-8a74-de0668daf164',
    'ze-snippet',
  );
}

export function scheduleDeferredScripts() {
  const run = () => loadDeferredScripts();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    window.setTimeout(run, 1500);
  }
}

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { warmStrategyCache } from 'workbox-recipes';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';

// https://developer.chrome.com/docs/workbox/modules/workbox-core#clients_claim
// This clientsClaim() should be at the top level
// of your service worker, not inside of, e.g.,
// an event handler.
clientsClaim();

declare const self: ServiceWorkerGlobalScope;

// Optional: use the injectManifest mode of one of the Workbox
// build tools to precache a list of URLs, including fallbacks.
precacheAndRoute(self.__WB_MANIFEST);

const CACHE_STRATEGY = new NetworkFirst();
const FALLBACK_HTML_URL = '/offline.html';

// Warm the runtime cache with a list of asset URLs
warmStrategyCache({
  urls: [
    FALLBACK_HTML_URL,
    '/modules/htmx.min.js',
    '/modules/_hyperscript.min.js',
    '/modules/sse.js',
    '/modules/pwa-install.bundle.js',
  ],
  strategy: CACHE_STRATEGY,
});

// SSE is a streaming connection - bypass the service worker cache entirely
registerRoute(({ url }) => url.pathname === '/sse', new NetworkOnly());

// https://developer.chrome.com/docs/workbox/modules/workbox-routing
registerRoute(() => true, CACHE_STRATEGY);

// https://developer.chrome.com/docs/workbox/managing-fallback-responses
// This "catch" handler is triggered when any of the other routes fail to
// generate a response.
setCatchHandler(async ({ event, request }) => {
  // The warmStrategyCache recipe is used to add the fallback assets ahead of
  // time to the runtime cache, and are served in the event of an error below.
  // Use `event`, `request`, and `url` to figure out how to respond, or
  // use request.destination to match requests for specific resource types.
  console.log(`setCatchHandler callback:`, event);

  // For navigation requests, serve the offline page
  if (request.destination === 'document') {
    return CACHE_STRATEGY.handle({
      event,
      request: new Request(FALLBACK_HTML_URL),
    }).catch(() => Response.error());
  }

  // For other requests, just return an error
  return Response.error();
});

// AGGRESSIVE UPDATE HANDLING
// Skip waiting immediately on install to force update
addEventListener('install', (event) => {
  console.log('Service worker installing - skipping waiting');
  self.skipWaiting();
});

// Web Push Notification Handling
// https://blog.lekoala.be/the-only-snippet-you-will-need-to-deal-with-push-notifications-in-a-service-worker
// @link https://flaviocopes.com/push-api/
// @link https://web.dev/push-notifications-handling-messages/
(self as any).addEventListener('push', function (event) {
  if (!event.data) {
    console.log('This push event has no data.');
    return;
  }
  if (!(self as any).registration) {
    console.log('Service worker does not control the page');
    return;
  }
  if (!(self as any).registration || !(self as any).registration.pushManager) {
    console.log('Push is not supported');
    return;
  }

  const eventText = event.data.text();
  // Specify default options
  let options = {};
  let title = '';

  // Support both plain text notification and json
  if (eventText.substr(0, 1) === '{') {
    const eventData = JSON.parse(eventText);
    title = eventData.title;

    // Set specific options
    // @link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification#parameters
    if (eventData.options) {
      options = Object.assign(options, eventData.options);
    }

    // Check expiration if specified
    if (eventData.expires && Date.now() > eventData.expires) {
      console.log('Push notification has expired');
      return;
    }
  } else {
    title = eventText;
  }

  // Warning: this can fail silently if notifications are disabled at system level
  // The promise itself resolve to undefined and is not helpful to see if it has been displayed properly
  const promiseChain = (self as any).registration.showNotification(
    title,
    options,
  );

  // With this, the browser will keep the service worker running until the promise you passed in has settled.
  event.waitUntil(promiseChain);
});

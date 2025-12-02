

---

## Part 1 – Turn your current app into a PWA

You already have:

* `index.html`
* `style.css`
* `script.js`

We’ll add:

* `manifest.webmanifest`
* `sw.js`
* A couple of small changes to `index.html`

I’ll assume your app is served from the site root (e.g. `https://mydomain.com/`) and that your icon is a PNG. You can keep everything inside `web/` in your repo; when you deploy, make sure these files end up in the same directory as `index.html`.

---

### 1. Create icons from your existing icon file

Chrome expects at least:

* **192×192** PNG
* **512×512** PNG

If your icon file is large enough (e.g. 1024×1024), generate:

* `icons/icon-192.png`
* `icons/icon-512.png`

(Use something like GIMP, Figma, or an online “PWA icon generator”.)

Folder structure (in `web/`):

```text
web/
  index.html
  style.css
  script.js
  sw.js
  manifest.webmanifest
  icons/
    icon-192.png
    icon-512.png
```

---

### 2. Add `manifest.webmanifest`

Create `web/manifest.webmanifest`:

```json
{
  "name": "Life Manager",
  "short_name": "LifeMgr",
  "description": "Offline-first life organizer with calendar, tags, and backups.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f1014",
  "theme_color": "#0f1014",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

> `start_url` and `scope` assume the app is at the root. If you serve from `/life-manager/`, change both to `"/life-manager/"`.

---

### 3. Wire manifest + theme color into `index.html`

Modify your `<head>` in `web/index.html` to include the manifest and theme color.

Right now you have:

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>life-manager</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
```

Change to:

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>life-manager</title>

    <!-- PWA: theme color (matches manifest) -->
    <meta name="theme-color" content="#0f1014">

    <!-- PWA: manifest -->
    <link rel="manifest" href="manifest.webmanifest">

    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
```

---

### 4. Register a service worker from `index.html`

Just before `</body>` you already have:

```html
    <script src="script.js"></script>
</body>
</html>
```

Change to:

```html
    <script src="script.js"></script>

    <!-- PWA: Service worker registration -->
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .catch(err => {
              console.error('SW registration failed', err);
            });
        });
      }
    </script>
</body>
</html>
```

> If you host the app under a path (e.g. `/life-manager/`), change the registration path to `'/life-manager/sw.js'`.

---

### 5. Add `sw.js` (service worker)

Create `web/sw.js`:

```js
// sw.js - simple cache-first service worker

const CACHE_NAME = 'lifemgr-cache-v1';

// List everything needed for offline
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: cleanup old caches if you bump the version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      // Serve from cache if available, else network
      return (
        cached ||
        fetch(request).catch(() => {
          // Optional: custom offline response for HTML requests
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        })
      );
    })
  );
});
```

> Again, if hosted under a sub-path, prepend `/life-manager` in `ASSETS`.

Now when you deploy over **HTTPS**, Chrome will see:

* a valid manifest,
* a service worker controlling the scope,
* and will treat it as a PWA with install capability.

---

### 6. Deploy and sanity-check

1. Deploy `web/` to somewhere HTTPS (Netlify, Vercel, etc.).

2. Open it in Chrome (Android or desktop).

3. In DevTools → Application → Manifest/Service Workers:
   
   * Confirm manifest is found,
   * service worker is active,
   * and pages are controlled.

4. On Android Chrome, you should see **“Install app” / “Add to Home screen”** in the menu.

Once this works, you’re ready for the **Trusted Web Activity** step.

---

## Part 2 – Wrap your PWA in a Trusted Web Activity (TWA) with Bubblewrap

Now you have a real PWA live at (for example):

```text
https://your-domain.com/
```

We’ll use **Bubblewrap**, which takes your hosted `manifest.webmanifest` and generates an Android project that starts your PWA as a TWA.

### 1. Prereqs checklist

You need:

* Node.js (v14+)

* Java JDK

* Android SDK

* Your PWA served via **HTTPS** with:
  
  * manifest,
  * service worker,
  * and working offline (which we just did).

And of course, a **Google Play developer account** for publishing later.

---

### 2. Install Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
bubblewrap --version
```

(Just to confirm it’s installed.)

---

### 3. Initialize a Bubblewrap project from your manifest

Pick a new folder for the Android project:

```bash
mkdir life-manager-twa
cd life-manager-twa
```

Run the init command, pointing to your **hosted** manifest:

```bash
bubblewrap init --manifest https://your-domain.com/manifest.webmanifest
```

Bubblewrap will:

* Download the web manifest.

* Ask you about:
  
  * **Package ID** (e.g. `com.yourdomain.lifemanager`)
  * **App name** (can reuse `"Life Manager"`)
  * **Colors, icons, orientation** (it can reuse values from the manifest)
  * **Signing key** (create a new keystore or use an existing one)

It will generate:

* An Android project (Gradle, Java/Kotlin code that opens your URL as a TWA).
* A `twa-manifest.json` with config about your app.
* An `assetlinks.json` file template for your website.

---

### 4. Build the APK/App Bundle

Inside that new project folder:

```bash
bubblewrap build
```

This compiles the Android project and outputs a release build (APK/App Bundle).

You can also install directly on a connected device:

```bash
bubblewrap install
```

At this stage, when you open the app on the device:

* It will usually open as a **Custom Tab** (with a little browser UI) until we set up the trust link (Digital Asset Links).

---

### 5. Set up Digital Asset Links (`assetlinks.json`)

To get true **Trusted Web Activity** (full screen, no browser bar), Android needs to verify that:

* The app signing key
* And your website’s domain

belong to the same owner, via **Digital Asset Links**.

Bubblewrap will give you an `assetlinks.json` snippet. If you need a template, it looks like this:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourdomain.lifemanager",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:..."
      ]
    }
  }
]
```

* Replace `com.yourdomain.lifemanager` with your actual package ID.
* Replace the fingerprint with the SHA-256 of the keystore you **actually sign the Play build with** (Bubblewrap/Android Studio docs show how to get this).

Host this file at:

```text
https://your-domain.com/.well-known/assetlinks.json
```

Once this is accessible and valid:

* Opening your app on device will show your PWA **full-screen** as a Trusted Web Activity, not a normal Chrome tab.

---

### 6. Open in Android Studio (optional but recommended)

You can open the generated Android project in Android Studio for:

* Changing app name, icon, version code, etc.
* Building signed App Bundles for the Play Store.
* Running on emulators.

Bubblewrap’s `build` and `install` commands already use Gradle under the hood, so this is optional, but very handy for Play Store upload.

---

### 7. Upload to Google Play

Once:

* PWA runs well over HTTPS.
* Asset Links are configured and verified.
* The app works as full-screen TWA on a device.

Then:

1. In the **Google Play Console**, create a new app.
2. Upload the signed **App Bundle/APK** from your Bubblewrap/Android Studio build.
3. Fill in listing details (screenshots, description, etc.).
4. Roll out a test track or production release.

---



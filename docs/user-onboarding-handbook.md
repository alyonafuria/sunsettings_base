# User Onboarding Handbook

A friendly handbook for new users and hackathon judges.

## What Sunsettings does
- Predicts the beauty of the sunset using weather signals.
- Lets you capture and share sunset photos with a location context.
- Shows your progress and streaks.

## Onboarding screens
- Welcome: short tour of the app.
- What is this app?: community for sky lovers — rate and share.
- How prediction works: we analyze temperature, clouds, air quality, humidity, wind, etc. (science view). Your personal rating can differ.
- How to post: when you’re at the same location you analyzed, take a photo in-app; we attach rounded coordinates and time.
- Your account: sign up, see posts and track progress/streaks.
- Let’s go: start exploring.

## Location flow (Base-first)
- Inside Base Mini App: we attempt to read location from the Mini App context.
- Otherwise: we try browser geolocation.
- If permission is blocked or unavailable: we fall back to IP-based coarse location.

## If location doesn’t work right away
- Give the webview permission to access Location in device settings (Base app may need OS-level permission).
- Try Detect again from the home screen or from the upload panel.
- We’ll always try to give a coarse IP-based fallback so you can keep exploring.

## Posting a photo
- Ensure you are at or near the analyzed location.
- Take photo → we compute an H3 cell and reverse geocode to a readable label.
- If EXIF GPS is missing, we use device location (or fallback) to tag the post.

## Privacy
- We do not store raw precise GPS server-side. We persist a blurred center + radius and a neighborhood label.

See also:
- Quick Start: `docs/quick-start.md`
- Troubleshooting: `docs/troubleshooting.md`

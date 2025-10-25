# Troubleshooting

Practical fixes for the most common issues, especially in mobile webviews.

## Location isn’t detected
- Inside Base Mini App, ensure the Base app has Location permission at the OS level.
- If the app previously denied Location, you may need to toggle it in Settings and retry Detect.
- If precise location is unavailable, the app falls back to IP-based coarse coordinates.
- As a workaround, search for your city in the location combobox.

## Camera doesn’t open
- Ensure you are using a modern mobile browser or the Base app webview.
- If blocked, check Camera permissions in device settings.

## Upload failed
- Network conditions can interrupt large uploads.
- Try re-selecting the photo.

## Wallet not connecting
- If on Base Mini App, the Smart Wallet context should connect seamlessly. If not, try standard wallet connect flow.
- If the environment is a regular browser, use the wallet connect button; ensure you’re on Base.

## Map not rendering
- Check connectivity and try again. If issue persists, refresh the page.

## Still stuck?
- Contact maintainers or open an issue with device model, OS version, and steps to reproduce.

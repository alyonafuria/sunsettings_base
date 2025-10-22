// function withValidProperties(properties: Record<string, undefined | string | string[]>) {
// return Object.fromEntries(
//     Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
// );
// }

export async function GET() {
return Response.json({
   "accountAssociation": {
    "header": "eyJmaWQiOjc1MTMsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgxMTA5MjFFMTg2YjQ2MDUwQmI0NUJhOThhMzRCMThhYzAxQzkwZUQ0In0",
    "payload": "eyJkb21haW4iOiJjYXRjaC5zdW5zZXR0aW5ncy5hcHAifQ",
    "signature": "1/Fc4pmYQqj22M+4yFElFX5in/jmtY6HvCzGl/edJSljq0XOzz41iFFabDbdWh1Ivg2uSqTzddPLrrdmPQ84Yxw="
  },
  "baseBuilder": {
    "allowedAddresses": ["0xC6a8Ba6F67C52f2F489069aa44570938334C11F6"]
  },
  "miniapp": {
    "version": "1",
    "name": "sunsettings",
    "homeUrl": "https://catch.sunsettings.app",
    "iconUrl": "https://catch.sunsettings.app/icon.png",
    "splashImageUrl": "https://catch.sunsettings.app/icon.png",
    "splashBackgroundColor": "#009bfa",
    "webhookUrl": "https://catch.sunsettings.app/api/webhook",
    "subtitle": "basic miracles",
    "description": "get prediction of sunset beauty, share your photos with the world and track sunset catching progress",
    "screenshotUrls": [
      "https://catch.sunsettings.app/screenshot1.png",
      "https://catch.sunsettings.app/screenshot2.png",
      "https://catch.sunsettings.app/screenshot3.jpg"
    ],
    "primaryCategory": "social",
    "tags": ["sunset", "photos", "nature", "beauty", "social"],
    "heroImageUrl": "https://catch.sunsettings.app/icon.png",
    "tagline": "basic miracles",
    "ogTitle": "sunsettings",
    "ogDescription": "get prediction of sunset beauty, share your photos with the world and track sunset catching progress",
    "ogImageUrl": "https://catch.sunsettings.app/icon.png",
    "noindex": true
  }
});
}
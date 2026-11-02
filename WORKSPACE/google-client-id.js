/*
 * MegaLab - Google OAuth configuration
 * ------------------------------------
 * This is the ONLY file you edit to enable Google Sign-In.
 *
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create an OAuth 2.0 Client ID of type "Web application".
 * 3. Add your exact origin under "Authorized JavaScript origins":
 *      https://your-domain.com
 *      http://localhost:5173        (only if you develop locally)
 *    Do NOT add a redirect URI - the token flow does not need one.
 * 4. Paste the client ID below (it ends in .apps.googleusercontent.com).
 *
 * The client ID is public by design (it is sent to Google in the browser).
 * Never put a client SECRET in a static site.
 *
 * Google Sign-In requires an http(s) origin. It cannot run from file://.
 */
window.MEGALAB_CONFIG = {
  appName: "MegaLab",
  version: "3.0.0",
  googleClientId: "5962265454-sc36s4rcp65dh4a4okoq00h4pm9mpkiv.apps.googleusercontent.com",
  oneTap: false,
  sessionDays: 30,
  supportEmail: "",
  storagePrefix: "megalab",

  /* Optional: live AI endpoint. POST {prompt, stream}. Return {text} or plain text.
     Leave empty to use the deterministic offline tutor. */
  aiEndpoint: "",

  /* Optional: override the PDF.js build used for PDF text extraction. */
  pdfJsUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdfWorkerUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
};

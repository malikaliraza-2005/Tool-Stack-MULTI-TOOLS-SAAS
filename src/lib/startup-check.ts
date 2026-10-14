// Tells users when the page's JavaScript can't run (e.g. a phone browser older
// than the build targets, browser-device-support §1). Without it the page
// looks normal but nothing reacts, which reads as "broken".
//
// Inline, ES5-only and self-contained so it runs in any browser. Shows the
// notice when a site script fails to load or parse, or when the app has not
// started after STARTUP_TIMEOUT_MS. `Providers` sets `data-app-started`.

export const STARTUP_NOTICE_ID = "startup-notice";
export const STARTUP_ATTRIBUTE = "data-app-started";
const STARTUP_TIMEOUT_MS = 20_000;

export const startupCheckScript = `(function(){var d=document,s=${JSON.stringify(
  STARTUP_ATTRIBUTE,
)};function show(){if(d.documentElement.hasAttribute(s))return;var n=d.getElementById(${JSON.stringify(
  STARTUP_NOTICE_ID,
)});if(n)n.hidden=false}window.addEventListener("error",function(e){var t=e.target;var src=(t&&t.src)||e.filename||"";if(src.indexOf("/_next/")!==-1)show()},true);setTimeout(show,${STARTUP_TIMEOUT_MS})})()`;

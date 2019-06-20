const DP_DEV_HOST = "dinopark.k8s.dev.sso.allizom.org";
const DP_TEST_HOST = "dinopark.k8s.test.sso.allizom.org";
const DP_HOST_NAMES = [DP_DEV_HOST, DP_TEST_HOST];
const DP_DEV_PATTERN = `https://${DP_DEV_HOST}/*`;
const DP_TEST_PATTERN = `https://${DP_TEST_HOST}/*`;
const DP_PATTERN = [DP_DEV_PATTERN, DP_TEST_PATTERN];
const FRONT_END_PATTERN = /https:\/\/dinopark\.k8s\..*\.sso\.allizom\.org\/(.*.js|css|img).*/
const BLACK_LIST = [
  "content-security-policy",
  "x-content-type-options",
  "strict-transport-security",
  "x-xss-protection",
];

let enabled = false;


async function redirect(requestDetails) {
  if (requestDetails.url.match(FRONT_END_PATTERN)) {
    const url = new URL(requestDetails.url);
    url.hostname = "localhost";
    url.port = 8080;
    console.log(`Redirecting: ${requestDetails.url} → ${url.toString()}`);

    return { redirectUrl: url.toString() };
  }
}

async function unsecure(e) {
  const url = new URL(e.url);
  if (DP_HOST_NAMES.includes(url.hostname)) {
    const h = e.responseHeaders;
    const orgCsp = h.find(h => h.name === "content-security-policy")
    if (orgCsp) {
      const filtered = h.filter(h => !BLACK_LIST.includes(h.name));
      return { responseHeaders: filtered }
    }
  }
}


function fixJs(details) {
  if (details.type === "main_frame") {
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();

    filter.ondata = event => {
      let str = decoder.decode(event.data, { stream: true });
      str = str.replace(/\/js\/app\.js/g, '/app.js');
      str = str.replace(/<script src="?\/js\/chunk\-vendors\.js"?><\/script>/g, '');
      filter.write(encoder.encode(str));
      filter.disconnect();
    }
  }
}

function enable() {
  enabled = true;
  browser.browserAction.setIcon({ path: { "64": "icons/icon.svg" } })
  browser.webRequest.onBeforeRequest.addListener(
    fixJs,
    { urls: DP_PATTERN },
    ["blocking"]
  );

  browser.webRequest.onBeforeRequest.addListener(
    redirect,
    { urls: DP_PATTERN },
    ["blocking"]
  );

  browser.webRequest.onHeadersReceived.addListener(
    unsecure,
    { urls: DP_PATTERN },
    ["blocking", "responseHeaders"]
  );
  console.log("enabled");
}

function disable() {
  browser.webRequest.onBeforeRequest.removeListener(
    fixJs,
  );

  browser.webRequest.onBeforeRequest.removeListener(
    redirect
  );

  browser.webRequest.onHeadersReceived.removeListener(
    unsecure
  );
  enabled = false;
  browser.browserAction.setIcon({ path: { "64": "icons/icon-grey.svg" } })
  console.log("disabled");
}

browser.browserAction.onClicked.addListener(() => {
  console.log("DOOM");
  if (!enabled) {
    enable();
  } else {
    disable();
  }
});
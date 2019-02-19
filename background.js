const DP_PATTERN = "https://dinopark.k8s.dev.sso.allizom.org/*";
const INDEX_PATTERN = ["https://dinopark.k8s.dev.sso.allizom.org/", "https://dinopark.k8s.dev.sso.allizom.org/beta/"];
const FRONT_END_PATTERN = /https:\/\/dinopark\.k8s\.dev\.sso\.allizom\.org\/beta\/(app\.js|css|img).*/
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
  if (url.hostname === "dinopark.k8s.dev.sso.allizom.org") {
    const h = e.responseHeaders;
    const orgCsp = h.find(h => h.name === "content-security-policy")
    if (orgCsp) {
      const filtered = h.filter(h => !BLACK_LIST.includes(h.name));
      let csp = orgCsp.value;
      csp = csp.replace(/script\-src 'self'/g, "script-src 'self' 'unsafe-eval' https://localhost:8080 https://127.0.0.1:8080");
      csp = csp.replace(/style\-src 'self'/g, "style-src 'self' https://localhost:8080 https://127.0.0.1:8080");
      csp = csp.replace(/img\-src 'self' data:/g, "img-src 'self' data: https://localhost:8080 https://127.0.0.1:8080");
      filtered.push({ name: "content-security-policy", value: csp });
      return { responseHeaders: filtered }
    }
  }
}


function fixJs(details) {
  const filter = browser.webRequest.filterResponseData(details.requestId);
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  filter.ondata = event => {
    let str = decoder.decode(event.data, { stream: true });
    str = str.replace(/\/beta\/js\/app\.js/g, '/beta/app.js');
    str = str.replace(/<script src="?\/beta\/js\/chunk\-vendors\.js"?><\/script>/g, '');
    filter.write(encoder.encode(str));
    filter.disconnect();
  }
}

function enable() {
  enabled = true;
  browser.browserAction.setIcon({ path: { "64": "icons/icon.svg" } })
  browser.webRequest.onBeforeRequest.addListener(
    fixJs,
    { urls: INDEX_PATTERN },
    ["blocking"]
  );

  browser.webRequest.onBeforeRequest.addListener(
    redirect,
    { urls: [DP_PATTERN] },
    ["blocking"]
  );

  browser.webRequest.onHeadersReceived.addListener(
    unsecure,
    { urls: [DP_PATTERN] },
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
const DP_DEV_HOST = 'dinopark.k8s.dev.sso.allizom.org';
const DP_TEST_HOST = 'dinopark.k8s.test.sso.allizom.org';
const DP_PROD_HOST = 'people.mozilla.org';
const DP_HOST_NAMES = [DP_DEV_HOST, DP_TEST_HOST, DP_PROD_HOST];
const DP_DEV_PATTERN = `https://${DP_DEV_HOST}/*`;
const DP_TEST_PATTERN = `https://${DP_TEST_HOST}/*`;
const DP_PROD_PATTERN = `https://${DP_PROD_HOST}/*`;
const DP_PATTERN = [DP_DEV_PATTERN, DP_TEST_PATTERN, DP_PROD_PATTERN];
const FRONT_END_PATTERN = /https:\/\/(dinopark\.k8s\..*\.sso\.allizom|people\.mozilla)\.org\/(.*.js|css|img).*/;
const INDEX_PATTERN = /https:\/\/(dinopark\.k8s\..*\.sso\.allizom|people\.mozilla)\.org\/[a-z]?(\?.*)?$/;
const WHOAMI_PATTERN = /https:\/\/(dinopark\.k8s\..*\.sso\.allizom|people\.mozilla)\.org\/whoami\/.*/;
const BLACK_LIST = [
  'content-security-policy',
  'x-content-type-options',
  'strict-transport-security',
  'x-xss-protection',
];

const GA_CODE = `<!-- Global site tag (gtag.js) - Google Analytics -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-3919QT0M94"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());

  gtag('config', 'G-3919QT0M94');
</script>`;

let enabled = false;

async function redirect(requestDetails) {
  if (requestDetails.url.match(WHOAMI_PATTERN)) {
    const url = new URL(requestDetails.url);
    url.protocol = 'http';
    url.hostname = 'localhost';
    // url.hostname = 'c513f608.ngrok.io';
    // url.port = 8084;
    console.log(`Redirecting ssl: ${requestDetails.url} → ${url.toString()}`);
    return { redirectUrl: url.toString() };
  } else if (requestDetails.url.match(FRONT_END_PATTERN)) {
    const url = new URL(requestDetails.url);
    url.hostname = 'localhost';
    url.port = 8080;
    console.log(`Redirecting: ${requestDetails.url} → ${url.toString()}`);
    return { redirectUrl: url.toString() };
  } else if (requestDetails.url.match(INDEX_PATTERN)) {
    let filter = browser.webRequest.filterResponseData(requestDetails.requestId);
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();
    let completeData = '';
    filter.ondata = event => {
      const str = decoder.decode(event.data, { stream: true });
      completeData += str;
    };
    filter.onstop = event => {
      completeData = completeData.replace('<head>', '<head>' + GA_CODE);
      console.log('Replacing data: ', completeData);
      filter.write(encoder.encode(completeData));
      filter.disconnect();
    };
  }
}

async function unsecure(e) {
  const url = new URL(e.url);
  if (DP_HOST_NAMES.includes(url.hostname)) {
    const h = e.responseHeaders;
    const orgCsp = h.find(h => h.name === 'content-security-policy');
    if (orgCsp) {
      const filtered = h.filter(h => !BLACK_LIST.includes(h.name));
      return { responseHeaders: filtered };
    }
  }
}

function fixJs(details) {
  if (details.type === 'main_frame') {
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder('utf-8');

    filter.ondata = event => {
      let str = decoder.decode(event.data, { stream: true });
      str = str.replace(/\/js\/app[A-Za-z0-9\-\.]*\.js/g, '/js/app.js');
      str = str.replace(
        /\/js\/chunk-vendors[A-Za-z0-9\-\.]*\.js/g,
        '/js/chunk-vendors.js'
      );
      filter.write(encoder.encode(str));
      filter.disconnect();
    };
  }
  return {};
}

function enable() {
  enabled = true;
  browser.browserAction.setIcon({ path: { '64': 'icons/icon.svg' } });
  browser.webRequest.onBeforeRequest.addListener(fixJs, { urls: DP_PATTERN }, [
    'blocking',
  ]);

  browser.webRequest.onBeforeRequest.addListener(redirect, { urls: DP_PATTERN }, [
    'blocking',
  ]);

  browser.webRequest.onHeadersReceived.addListener(unsecure, { urls: DP_PATTERN }, [
    'blocking',
    'responseHeaders',
  ]);
  console.log('enabled');
}

function disable() {
  browser.webRequest.onBeforeRequest.removeListener(fixJs);

  browser.webRequest.onBeforeRequest.removeListener(redirect);

  browser.webRequest.onHeadersReceived.removeListener(unsecure);
  enabled = false;
  browser.browserAction.setIcon({ path: { '64': 'icons/icon-grey.svg' } });
  console.log('disabled');
}

browser.browserAction.onClicked.addListener(() => {
  console.log('DOOM');
  if (!enabled) {
    enable();
  } else {
    disable();
  }
});

# DinoParkLocalDev

Proxy all the things! This helps developing [DinoPark's front-end](https://github.com/mozilla-iam/dino-park-front-end/)
against the DinoPark developer preview: [https://dinopark.k8s.dev.sso.allizom.org/](https://dinopark.k8s.dev.sso.allizom.org/).

## Setup

### (Optional) mkcert
Install [mkcert](https://github.com/FiloSottile/mkcert) to enable seamless https.

```bash
mkcert -install
# if promted for
# Enter Password or Pin for "NSS Certificate DB":
# if you're using Firefox this requires your Firefox master password
mkcert localhost 127.0.0.1
mkdir ~/.mkcert
mv localhost+1* ~/.mkcert
```

### Front-End Configuration

Go into the front-end directory and run:

```bash
export DP_HTTPS_KEY=~/.mkcert/localhost+1-key.pem
export DP_HTTPS_CERT=~/.mkcert/localhost+1.pem
npm run serve
```

- Acticate `DinoParkLocalDev` (click on the dino head in the toolbar so it turns red)
- Visit [DinoPark Dev](https://dinopark.k8s.dev.sso.allizom.org/) or [DinoPark Test](https://dinopark.k8s.test.sso.allizom.org/)
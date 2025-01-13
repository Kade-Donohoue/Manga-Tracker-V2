# Manga Activity

This is based off of discord embedded app sdk playground. For more detailed information you can find it at https://github.com/discord/embedded-app-sdk. 

## Running your app locally

```
1. pnpm install # only need to run this the first time 
2. copy example.env and rename to env.dev (or env.production) and fill in all variables
3. follow cloudflare setup
3. pnpm dev
4. pnpm tunnel # from another terminal this creates a cloudflare try tunnel with a random domain that you need
```

# Cloudflare Setup
A few cloudflare services are used so you will need an account and a domain on cloudflare. 

If you are using a tunnel and dont want to keep changing the endpoint to the try cloudflare one you can set up one using your cloudflare domain. 

- Create a worker and fill in its credentions in packages/server/wrangler.toml 
- create a D1 database and fill in its credentials in wrangler.toml
- open `package.json` in package/server and replace dev-manga-bot with the name of your db
- run `pnpm resetDbRemote` if staging or production otherwise run `pnpm resetDbLocal` (in `packages/server` directory)
- create a r2 database and connect a subdomain to it. fill in credentials to wrangler.toml(found in `packages/server`)

# Manual Deployment

## Steps to manually deploy the embedded app.

1. ensure `.env.production` is filled out
2. ensure `wrangler.toml`(found in `packages/server`) is filled 
3. Log into cloudflare
```sh
npx wrangler login
```
4. run the following commands to deploy the client
```sh
cd packages/client
npm run build
npx wrangler pages deploy dist
```
5. go to cloudflare pages and urls for `VITE_SERVER_URL`, `VITE_CLIENT_URL`, and `VITE_IMG_URL`
6. run following commands to deploy the server
```sh
cd packages/server
npm run deploy
```
7. to build the apps run the following commands in `packages/client`
```
pnpm build
pnpm electron:buildAll
pnpm capacitor:build 
```
8. when android studio opens click the hamberger menu in the top. Under `build` click `Generate Signed App Bundle or APK` select `APK` then next. setup a key store and fill in the credentials. click next select release and than click create. 


# Manga Activity

This is based off of discord embedded app sdk playground. For more detailed information you can find it at https://github.com/discord/embedded-app-sdk. 

## Running your app locally

```
1. pnpm install # only need to run this the first time 
2. copy example.env and rename to env.dev and fill in all variables
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
- run `pnpm resetDbRemote` if staging or production otherwise run `pnpm resetDbLocal` in packages/server directory
- create a r2 database and connect a subdomain to it. fill in creds to wrangler.toml

# Manual Deployment

Steps to manually deploy the embedded app 0. Have access to the Discord Dev cloudflare account

1. Log into cloudflare with your credentials associated with Discord Dev

```sh
wrangler login
```

2. Create or verify .env.production file
   If you haven't made it yet, copy the example.env file, rename it to `.env.production`, and then fill in all variables

3. Build and deploy the client

```
cd packages/client
npm run build
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here npx wrangler pages publish dist
```

4. Build and deploy the server

```
cd packages/server
npm run deploy
```

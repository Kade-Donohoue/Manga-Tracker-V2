import { Environment } from './env';

export async function sendEmail(
  env: Environment,
  {
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }
) {
  const endpoint = `https://email.${env.AWS_REGION}.amazonaws.com/v2/email/outbound-emails`;

  const body = JSON.stringify({
    FromEmailAddress: env.SES_FROM,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: {
          ...(html ? { Html: { Data: html } } : {}),
          ...(text ? { Text: { Data: text } } : {}),
        },
      },
    },
  });

  const headers = await signAwsRequest({
    method: 'POST',
    url: endpoint,
    region: env.AWS_REGION,
    service: 'ses',
    body,
    accessKey: env.AWS_ACCESS_KEY_ID,
    secretKey: env.AWS_SECRET_ACCESS_KEY,
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SES error ${res.status}: ${err}`);
  }

  console.log(res);

  return res.json();
}

async function hmac(key: BufferSource, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signAwsRequest({
  method,
  url,
  region,
  service,
  body,
  accessKey,
  secretKey,
}: {
  method: string;
  url: string;
  region: string;
  service: string;
  body: string;
  accessKey: string;
  secretKey: string;
}) {
  const parsedUrl = new URL(url);
  const host = parsedUrl.host;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(body);

  const canonicalHeaders =
    `content-type:application/json\n` + `host:${host}\n` + `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-type;host;x-amz-date';

  const canonicalRequest =
    `${method}\n` +
    `/v2/email/outbound-emails\n\n` +
    canonicalHeaders +
    `\n${signedHeaders}\n` +
    payloadHash;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const stringToSign =
    `AWS4-HMAC-SHA256\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    (await sha256Hex(canonicalRequest));

  const kDate = await hmac(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    'X-Amz-Date': amzDate,
  };
}

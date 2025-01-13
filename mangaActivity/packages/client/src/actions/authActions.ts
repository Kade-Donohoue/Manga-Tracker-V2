import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Cookies } from 'react-cookie'; 
import { authStore } from '../stores/authStore';
import discordSdk from '../discordSdk';
import { type Types } from '@discord/embedded-app-sdk';
import { IGuildsMembersRead } from '../types';
import { toast } from 'react-toastify';
import { setFetchPath, fetchPath } from '../vars';
import { Preferences } from '@capacitor/preferences';
// import { Capacitor } from '@capacitor/core';

export const start = async (isEmbedded: boolean, code:string = '') => {

  // Determine if the app is running in a Capacitor environment
  const isCapacitorApp = Capacitor.isNativePlatform();

  if (isEmbedded) {
    const { user } = authStore.getState();

    if (user != null) {
      console.log('Unable to get User!');
      return;
    }

    await discordSdk.ready();

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
      client_id: import.meta.env.VITE_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: [
        'applications.commands',
        'identify',
      ].filter((scope) => scope != null) as Types.OAuthScopes[],
    });

    console.log(`Authorized with client: ${code}`);

    // Retrieve an access_token from server
    const response = await fetch('/.proxy/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
      }),
    });

    const { access_token } = await response.json<{ access_token: string }>();

    // Authenticate with Discord client (using the access_token)
    const authResponse = await discordSdk.commands.authenticate({
      access_token,
    });

    // Get guild-specific nickname and avatar, fallback to user name and avatar
    const guildMember = await fetch(
      `/discord/api/users/@me/guilds/${discordSdk.guildId}/member`,
      {
        method: 'get',
        headers: { Authorization: `Bearer ${access_token}` },
      }
    )
      .then((j) => j.json<IGuildsMembersRead>())
      .catch(() => {
        return null;
      });

    // Done with discord-specific setup
    const authState = {
      ...authResponse,
      user: {
        ...authResponse.user,
        id: new URLSearchParams(window.location.search).get('user_id') ?? authResponse.user.id,
      },
      guildMember,
    };

    authStore.setState({
      ...authState,
    });

  } else {
    console.log('Starting External Auth');
    const loggedIn: boolean = await externalAuth(isCapacitorApp, code);

    if (!loggedIn) return toast.error('Unable To Login!');
    console.log('Logged In');
  }

  async function getAccess_Token(): Promise<string> {
    const tokenData = await getStorage("access_token");
    if (!tokenData) return "";
  
    try {
      const { value, expirationTime } = JSON.parse(tokenData);
      if (Date.now() > expirationTime) {
        await deleteStorage("access_token"); // Use deleteStorage for clearing expired tokens
        return "";
      }
      return value;
    } catch (error) {
      console.error("Error parsing token data:", error);
      return "";
    }
  }
  

  async function setStorage(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  }

  // Unified function to retrieve a value
  async function getStorage(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  }

  async function deleteStorage(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  }

  async function externalAuth(isCapacitorApp: boolean, code: string = ''): Promise<boolean> {
    console.log('external auth code: ' + code);

    if (import.meta.env.DEV) {
      setFetchPath('');
    } else {
      setFetchPath(import.meta.env.VITE_SERVER_URL);
    }

    let access_token: string = await getAccess_Token();
    let refresh_token: string | null = await getStorage('refresh_token');

    if (!access_token) {
      console.log('No Token Saved');
      if (!code) code = new URLSearchParams(window.location.search).get('code') as string;
      console.log(code);
      if (!code && !refresh_token) return false;

      let body: string;
      const isElectron = typeof window.electron !== 'undefined' && window.electron.isElectron;
      if (isCapacitorApp) {
        console.log(`Capacitor, ${code}`)
        body = JSON.stringify(
          !code
            ? { refresh_token }
            : { code: code, redirectUri: 'kd://callback', codeVerifier: await getStorage('codeVerifier') }
        );
      } else if (isElectron) {
        body = JSON.stringify(
          code
            ? { code: code, redirectUri: 'https://manga.kdonohoue.com/electron' }
            : { refresh_token }
        );
      } else {
        body = JSON.stringify(
          code
            ? { code: code, redirectUri: import.meta.env.VITE_CLIENT_URL }
            : { refresh_token }
        );
      }
      console.log(body);

      const response = await fetch(`${fetchPath}/api/${refresh_token ? 'refresh' : 'token'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (response.status === 400) {
        console.log('clearing refresh token')
        deleteStorage('refresh_token')
      }

      if (!response.ok) return false;

      const responseData = await response.json<{
        access_token: string;
        expires_in: number;
        refresh_token: string;
      }>();

      if (!responseData.access_token || responseData.access_token === 'mock_token') return false;

      console.log('saving tokens');
      access_token = responseData.access_token;

      await setStorage('access_token', JSON.stringify({ value: responseData.access_token, expirationTime: Date.now() + responseData.expires_in * 1000 }));
      await setStorage('refresh_token', responseData.refresh_token);

      console.log('tokens saved');
    }

    // Fetch user Discord data
    const user = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })
      .then((j) => j.json<IGuildsMembersRead>())
      .catch(() => {
        return null;
      });

    // Save Auth For Rest of App
    const authState = {
      access_token: access_token,
      user: user as any,
    };

    authStore.setState({
      ...authState,
    });
    return true;
  }

};

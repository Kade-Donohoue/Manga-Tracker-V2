import { Cookies } from 'react-cookie'; 
import { authStore } from '../stores/authStore';
import discordSdk from '../discordSdk';
import { type Types } from '@discord/embedded-app-sdk';
import { IGuildsMembersRead } from '../types';
import { toast } from 'react-toastify';
import { setFetchPath, fetchPath } from '../vars';

export const start = async (isEmbedded: boolean) => {
  const cookies = new Cookies(); 

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
    const loggedIn: boolean = await externalAuth(cookies);

    if (!loggedIn) return toast.error('Unable To Login!');
    console.log('Logged In');
  }

  function getAccess_Token() {
    const tokenData = localStorage.getItem("access_token")
    if (!tokenData) return ""
    const {value, expirationTime} = JSON.parse(tokenData)
    if (Date.now() > expirationTime) {
      localStorage.removeItem('access_token')
      return ""
    }
    return value as string
  }

  async function externalAuth(cookies: Cookies): Promise<boolean> {
    if (import.meta.env.DEV) {
      setFetchPath("")
    } else {
      setFetchPath(import.meta.env.VITE_SERVER_URL)
    }

    let access_token:string = getAccess_Token()
    let refresh_token:string = localStorage.getItem('refresh_token') as string;

    console.log(`Token: ${access_token}`);

    if (!access_token) {
      console.log('No Token Saved');
      const code: string = new URLSearchParams(window.location.search).get('code') as string;
      if (!code && !refresh_token) return false;

      const isElectron = typeof window.electron !== 'undefined' && window.electron.isElectron;
      const redirectUri = isElectron ? 'https://manga.kdonohoue.com/electron' : import.meta.env.VITE_CLIENT_URL;

      let body = JSON.stringify(refresh_token ? { refresh_token } : { code: code, redirectUri: redirectUri });

      const response = await fetch(`${fetchPath}/api/${refresh_token?'refresh':'token'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
      if (!response.ok) return false
      let responseData = await response.json<{
        access_token: string;
        expires_in: number;
        refresh_token: string;
      }>();

      if (!responseData.access_token || responseData.access_token === 'mock_token') return false;

      console.log('saving tokens')
      access_token = responseData.access_token

      localStorage.setItem('access_token', JSON.stringify({value: responseData.access_token, expirationTime: Date.now() +responseData.expires_in * 1000}));
      localStorage.setItem('refresh_token', responseData.refresh_token);

      console.log('tokens saved')
    } 
    //fetch user discord data
    const user = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })
      .then((j) => j.json<IGuildsMembersRead>())
      .catch(() => {
        return null;
      });

      //Save Auth For rest of App. 
    const authState = {
      access_token: access_token,
      user: user as any
    };

    authStore.setState({
      ...authState,
    });
    return true;
    
  }
};

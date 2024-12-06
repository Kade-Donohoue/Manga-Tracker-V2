import { Cookies } from 'react-cookie'; // Use Cookies class instead of the hook
import { authStore } from '../stores/authStore';
import discordSdk from '../discordSdk';
import { type Types } from '@discord/embedded-app-sdk';
import { IGuildsMembersRead } from '../types';
import { toast } from 'react-toastify';
import { setFetchPath, fetchPath } from '../vars';

export const start = async (isEmbedded: boolean) => {
  const cookies = new Cookies(); // Create an instance of the Cookies class

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

    // Retrieve an access_token from your embedded app's server
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

  async function externalAuth(cookies: Cookies): Promise<boolean> {
    setFetchPath(""/*import.meta.env.VITE_SERVER_URL*/);//remove empty string and uncomment VITE_SERVER_URL for prod env

    // Check if code is stored in cookie
    let access_token:string = await cookies.get('access_token');
    const refresh_token:string = await cookies.get('refresh_token');
    console.log(access_token);

    if (!access_token /*|| !refresh_token*/) {
      console.log('No Token Saved');
      const code: string = new URLSearchParams(window.location.search).get('code') as string;
      // console.log(!code && !refresh_token)
      if (!code && !refresh_token) return false;
      
      let body = JSON.stringify(refresh_token ? { refresh_token } : { code });

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

      access_token = responseData.access_token
      cookies.set('access_token', responseData.access_token, {
        path: '/',
        secure: true,
        sameSite: 'strict',
        maxAge: responseData.expires_in,
      });

      let expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 100);
      cookies.set('refresh_token', responseData.refresh_token, {
        path: '/',
        secure: true,
        sameSite: "strict",
        expires: expirationDate
      })
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

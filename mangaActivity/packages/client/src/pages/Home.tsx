import React from 'react';
import discordSdk from '../discordSdk';
import {RPCCloseCodes} from '@discord/embedded-app-sdk';

export default function Home() {
  const onCloseClick = () => {
    discordSdk.close(RPCCloseCodes.CLOSE_NORMAL, 'User closed!');
  };
  return (
    <div style={{padding: 32}}>
      Welcome to the Manga Bot. The one stop shop for your manga tracking needs!<br></br>
      Currently 
      <a style={{color:"lightblue", textDecoration:"underline"}} onClick={(e) => {discordSdk.commands.openExternalLink({url:'https://manganato.com/'})}} href='https://manganato.com/'> Manganato</a>, 
      <a style={{color:"lightblue", textDecoration:"underline"}} onClick={(e) => {discordSdk.commands.openExternalLink({url:'https://asuracomic.net/'})}} href='https://asuracomic.net/'> Asura Scans</a>, 
      {/* <a style={{color:"lightblue", textDecoration:"underline"}} onClick={(e) => {discordSdk.commands.openExternalLink({url:'https://reaper-scans.com/'})}} href='https://reaper-scans.com/'> Reaper-Scans</a>,  */}
      <a style={{color:"lightblue", textDecoration:"underline"}} onClick={(e) => {discordSdk.commands.openExternalLink({url:'https://reaperscans.com/'})}} href='https://reaperscans.com/'> Reaper Scans</a>,
      <a style={{color:"lightblue", textDecoration:"underline"}} onClick={(e) => {discordSdk.commands.openExternalLink({url:'https://comick.io/home2'})}} href='https://comick.io/home2'> Comick</a>, 
      and 
      <a style={{color:"lightblue", textDecoration:"underline"}} onClick={(e) => {discordSdk.commands.openExternalLink({url:'https://mangadex.org/'})}}> Mangadex </a> 
      are supported. 

      <p>
        If you have any requests please file an issue on the <a style={{color:"lightblue", textDecoration:"underline"}} onClick={(e) => {discordSdk.commands.openExternalLink({url:'https://github.com/Kade-Donohoue/Manga-Tracker-V2'})}} href='https://github.com/Kade-Donohoue/Manga-Tracker-V2'>Github</a>!
      </p><br></br>

      To get started select a category<br></br><br></br>

      <div>
        <button className="closeButtonHome" onClick={onCloseClick}>Click here to close.</button>
      </div>
    </div>
  );
}

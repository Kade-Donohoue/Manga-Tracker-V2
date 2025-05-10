import React from 'react';

export default function Home() {
  return (
    <div style={{padding: 32}}>
      Welcome to the Manga Bot. The one stop shop for your manga tracking needs!<br></br>
      Currently 
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://www.manganato.gg/' target="_blank"> Manganato</a>, 
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://asuracomic.net/' target="_blank"> Asura Scans</a>, 
      {/* <a style={{color:"lightblue", textDecoration:"underline"}} href='https://reaperscans.com/' target="_blank"> Reaper Scans</a>, */}
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://comick.io/home2' target="_blank"> Comick</a>, 
      and 
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://mangadex.org/' target="_blank"> Mangadex </a> 
      are supported. 

      <p>
        If you have any requests please file an issue on the <a style={{color:"lightblue", textDecoration:"underline"}} href='https://github.com/Kade-Donohoue/Manga-Tracker-V2' target="_blank">Github</a>!
      </p><br/>

      To Get started its recomended to go to view tracked and start adding your manga!<br/>
    </div>
  );
}

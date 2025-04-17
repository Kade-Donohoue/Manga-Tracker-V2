import React from 'react';

export default function Home() {
  return (
    <div style={{padding: 32}}>
      Welcome to the Manga Bot. The one stop shop for your manga tracking needs!<br></br>
      Currently 
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://manganato.com/'> Manganato</a>, 
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://asuracomic.net/'> Asura Scans</a>, 
      {/* <a style={{color:"lightblue", textDecoration:"underline"}} href='https://reaper-scans.com/'> Reaper-Scans</a>,  */}
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://reaperscans.com/'> Reaper Scans</a>,
      <a style={{color:"lightblue", textDecoration:"underline"}} href='https://comick.io/home2'> Comick</a>, 
      and 
      <a style={{color:"lightblue", textDecoration:"underline"}}> Mangadex </a> 
      are supported. 

      <p>
        If you have any requests please file an issue on the <a style={{color:"lightblue", textDecoration:"underline"}} href='https://github.com/Kade-Donohoue/Manga-Tracker-V2'>Github</a>!
      </p><br></br>

      To get started select a category<br></br><br></br>
    </div>
  );
}

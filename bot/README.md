# AHMADSHAHZAD MD-BOT

AHMADSHAHZAD MD-BOT is a multi-device WhatsApp bot designed to provide enhanced
functionality and automation for WhatsApp users. Developed by **✌︎︎𝑨𝑯𝑴𝑨𝑫☠︎︎𝑺𝑯𝑨𝑯𝒁𝑨𝑫✌︎︎**,
this repository offers an easy-to-deploy solution for integrating with
WhatsApp through a bot interface.

## (Create Your Own WhatsApp Mini Bot)

* SPAM MESSAGE FIXED
* ADMIN CHECK FIXED
* BOT STARTING MESSAGE FIXED
* GROUP ADMIN CHECK FIXED
* OWNER CHECK FIXED
* AUTO STATUS VIEW FIXED
* AUTOREACT FIXED
* ANTIDELETE FIXED
* ANTIBAD FETCHING SYSTEM FIXED
* ANTILINK FIXED (no longer echoes the deleted link)
* AUTO STATUS REACT FIXED
* AUTO STATUS REPLY FIXED
* LATEST BAILEYS SUPPORTED
* REACT TARGET CHANNEL JID FIXED
* CACHE SYSTEM ADDED (branding image cached in memory for faster replies)
* ANTI CALL FIXED
* GROUP JOIN REQUEST ACCEPT AND REJECT FIXED
* PAIRING SYSTEM FIXED (with per-number custom branding + admin panel)
* KICK ALL FIXED
* ADMIN DEMOTE AND PROMOTE FIXED
* GROUP MUTE AND UNMUTE FIXED
* SONG / VIDEO DOWNLOAD FIXED (now via ytdl-core, no third-party API dependency)
* SESSIONS PERSIST ACROSS RESTARTS (MongoDB-backed, auto-reconnects on boot)
* NEW FUN COMMANDS: .wife .husband .love .roast .fact .8ball .rate .simp .character
  (plus existing .ship .joke .truth .dare)
* NEW GROUP COMMANDS: .approve/.reject (join requests — .approve was previously
  broken/unregistered), .setname, .setdesc
* SECURITY: removed a hardcoded live database credential, a hardcoded former
  owner's phone number/links, and a bug where that same number was permanently
  protected from `.end`/`.kickall` regardless of who owns this deployment —
  see git history / commit notes for details. Set MONGODB_URI, OWNER_NUMBER,
  OWNER_LINK, and GROUP_LINK yourself via environment variables before
  deploying — they are intentionally blank by default now.

## [NOTE: DO NOT SELL MY BASE, IT'S FULLY FREE]

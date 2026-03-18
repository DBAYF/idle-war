# Click War – Multiplayer Guide

## Overview

The game now supports **real-time 1v1 multiplayer** via PeerJS (P2P WebRTC). No backend or signup required.

## How to Play Online

### Host (Create Room)

1. Go to **Lobby** → click **Online** (gold card)
2. Click **Create Room**
3. Share the **room code** (e.g. `ABC123`) or **Copy link** with your friend
4. Wait for "Opponent connected!"
5. Click **Start Match**

### Join (Friend)

1. Get the room code or link from the host
2. Go to **Lobby** → click **Online**
3. Enter the room code and click **Join**
   - Or open the link directly: `yoursite.com/#/room/ABC123`
4. Wait for the host to click **Start Match**

### During the Match

- Both players see the same match state
- Clicks, upgrades, banking, and unit deploys sync in real time
- The host relays actions to the client
- No AI opponents – it’s you vs your friend

## Technical Details

- **PeerJS** – P2P WebRTC with signaling via `0.peerjs.com`
- **Host relay** – Host receives actions and broadcasts to all clients
- **Optimistic updates** – Local actions apply immediately, then sync
- **Dedup** – Remote actions from the same player are ignored locally

## Offline Mode

The **Offline · vs CPU** modes (1v1, 2v2, FFA) are unchanged. Use them when you want to play alone against AI.

# HotelStar - Hotel Management System

HotelStar is a comprehensive hotel management system built with React, TypeScript, and Vite.

## Features
- User authentication with role-based access control
- Room management
- Reservation handling
- Check-in/check-out processes
- Billing and payment processing
- Housekeeping management
- Reporting capabilities

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Configure environment variables in the `.env` file

## Telegram Login Notifications

To enable login notifications via Telegram:

1. Create a Telegram bot by talking to [@BotFather](https://t.me/BotFather) on Telegram
2. Get your bot token from BotFather
3. Create a Telegram group or channel for receiving notifications
4. Add your bot to the group/channel
5. Get the chat ID of your group/channel
6. Set the following environment variables in your `.env` file:
   ```
   VITE_TELEGRAM_BOT_TOKEN=your_actual_bot_token
   VITE_TELEGRAM_CHAT_ID=your_actual_chat_id
   ```

The system will automatically send notifications to your Telegram chat:
- When a user successfully logs in
- When a failed login attempt occurs

Notifications include:
- Username
- Login time/attempt time
- IP address

Note: Notifications are sent in both development and production environments.

## Development

To start the development server:
```bash
npm run dev
```

## Build

To build the project for production:
```bash
npm run build
```
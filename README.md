# Paystack Webhook Relayer

This demo verifies Paystack's incoming webhook signatures, confirms transactions with Paystack, forwards webhooks to your target endpoint, and lets you view and replay the latest 10 events

1. Run `npm install`
2. Run `npm run dev`
3. Enter your Paystack test secret key and your target webhook url
4. Copy the `/api/webhook` URL into your paystack dahsbord
5. Make an example payment
6. View the event and click `Replay` to send it again to the target url if need be

This is strictly demo only,
All settings and events are stored in memory, never use live keys here.

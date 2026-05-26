/**
 * Production WhatsApp webhook — full AI + token linking (legacy handler).
 * Connection/message rows are synced via DB triggers and recordInboundMessage.
 */
export { GET, POST } from './route.legacy.js';

/**
 * WhatsApp Linking System
 * Handles WhatsApp phone verification via CONNECT_TOKEN flow
 */

import crypto from 'crypto';
import { supabaseAdmin } from '../supabase/admin.js';
import { getUserById, updateUser, getUserByPhone } from './userManager.js';

/**
 * Generate linking token
 * @param {string} userId - User ID
 * @returns {Object} - Token info
 */
export async function generateLinkingToken(userId) {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  if (user.whatsappVerified) throw new Error('WhatsApp already verified for this user');

  const token = 'CONNECT_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('whatsapp_link_tokens')
    .insert({ token, user_id: userId, expires_at: expiresAt, used: false })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create linking token in DB:', error);
    throw new Error('Failed to create linking token');
  }

  console.log('🔗 Linking token created (db):', { userId, token, expiresAt, timestamp: new Date().toISOString() });
  return { token: data.token, userId: data.user_id, phoneNumber: null, createdAt: data.created_at, expiresAt: data.expires_at, used: data.used };
}

/**
 * Get linking token info
 * @param {string} token - Token string
 * @returns {Object|null} - Token data or null
 */
export async function getLinkingToken(token) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('whatsapp_link_tokens').select('*').eq('token', token).limit(1);
  if (error || !data || data.length === 0) return null;
  const t = data[0];
  if (new Date(t.expires_at) < new Date()) return null;
  return t;
}

/**
 * Validate and consume linking token
 * @param {string} token - Token string
 * @param {string} phoneNumber - Phone number from WhatsApp
 * @returns {Object|null} - Updated user or null
 */
export async function consumeLinkingToken(token, phoneNumber) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc('consume_whatsapp_token', { p_token: token, p_phone: phoneNumber });
  if (error) {
    console.error('Failed to consume linking token via RPC:', error);
    throw new Error(error.message || 'Failed to consume linking token');
  }
  return data;
}

/**
 * Generate WhatsApp link URL
 * @param {string} token - Linking token
 * @param {string} whatsappNumber - WhatsApp business number
 * @returns {string} - WhatsApp URL
 */
export function generateWhatsAppLinkURL(token, whatsappNumber) {
  if (!whatsappNumber) throw new Error('WhatsApp number is required');
  // Keep only digits and remove any leading zeros or plus signs
  const digits = whatsappNumber.toString().replace(/\D/g, '');
  const sanitized = digits.replace(/^0+/, '');
  const message = encodeURIComponent(token);
  return `https://wa.me/${sanitized}?text=${message}`;
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens() {
  const sb = supabaseAdmin();
  const { error } = await sb.from('whatsapp_link_tokens').delete().lt('expires_at', new Date().toISOString());
  if (error) {
    console.error('Failed to cleanup expired tokens:', error);
    return 0;
  }
  return 1;
}

/**
 * Get active linking tokens for user
 * @param {string} userId - User ID
 * @returns {Array} - Active tokens
 */
export async function getActiveTokensForUser(userId) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('whatsapp_link_tokens').select('*').eq('user_id', userId).eq('used', false).gt('expires_at', new Date().toISOString());
  if (error) {
    console.error('Failed to fetch active tokens:', error);
    return [];
  }
  return data || [];
}

/**
 * Revoke linking token
 * @param {string} token - Token to revoke
 * @returns {boolean} - True if revoked
 */
export async function revokeLinkingToken(token) {
  const sb = supabaseAdmin();
  const { error } = await sb.from('whatsapp_link_tokens').delete().eq('token', token);
  if (error) {
    console.error('Failed to revoke linking token:', error);
    return false;
  }
  console.log('🔓 Linking token revoked (db):', { token });
  return true;
}

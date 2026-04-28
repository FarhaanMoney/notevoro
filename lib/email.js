import { Resend } from 'resend';

function emailClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendEmail({ to, subject, html }) {
  const from = process.env.RESEND_FROM;
  const cli = emailClient();
  if (!cli || !from) return { skipped: true };
  if (!to) return { skipped: true };

  const { data, error } = await cli.emails.send({
    from,
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
  return { ok: true, id: data?.id || null };
}

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}


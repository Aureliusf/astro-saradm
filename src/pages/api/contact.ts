import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import escapeHtml from 'escape-html';

export const POST: APIRoute = async ({ request, locals }) => {
  const resend = new Resend(locals.runtime.env.RESEND_API_KEY);
  
  try {
    const data = await request.json();
    const { name, email, message, privacyConsent } = data;

    // Validation
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return new Response(
        JSON.stringify({ message: 'Invalid name. Must be 1-100 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email || typeof email !== 'string' || email.length < 5 || email.length > 254) {
      return new Response(
        JSON.stringify({ message: 'Invalid email. Must be 5-254 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ message: 'Invalid email format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!message || typeof message !== 'string' || message.length < 1 || message.length > 5000) {
      return new Response(
        JSON.stringify({ message: 'Invalid message. Must be 1-5000 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newlineCount = (message.match(/\n/g) || []).length;
    if (newlineCount > 50) {
      return new Response(
        JSON.stringify({ message: 'Message contains too many newlines (max 50).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!privacyConsent || typeof privacyConsent !== 'boolean' || !privacyConsent) {
      return new Response(
        JSON.stringify({ message: 'Privacy consent is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and format
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    // Send email
    const { data: sendData, error } = await resend.emails.send({
      from: 'Saradm Website <formulario@saradm.com>',
      to: ['saradelmor@gmail.com'],
      subject: `Nuevo formulario de saradm.com - ${safeName}`,
      html: `<p>You have a new message from your website contact form.</p>
             <p><strong>Name:</strong> ${safeName}</p>
             <p><strong>Email:</strong> ${safeEmail}</p>
             <p><strong>Message:</strong></p>
             <p>${safeMessage}</p>`,
    });

    if (error) {
      console.error({ error });
      return new Response(
        JSON.stringify({ message: 'Error sending email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Message sent successfully!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ message: 'An unexpected error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

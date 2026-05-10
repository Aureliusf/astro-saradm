import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import escapeHtml from 'escape-html';
import { validateContactForm } from '../../utils/contactValidation';

export const POST: APIRoute = async ({ request, locals }) => {
  const resend = new Resend(locals.runtime.env.RESEND_API_KEY);
  
  try {
    const data = await request.json();
    const { name, email, message, privacyConsent } = data;

    // Validate fields using shared validation
    const { valid, errors } = validateContactForm({ name, email, message });
    if (!valid) {
      return new Response(
        JSON.stringify({ message: errors.map(e => e.message).join(' ') }),
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

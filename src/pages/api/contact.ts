import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, message } = data;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ message: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // Send the email using Resend
    const { data: sendData, error } = await resend.emails.send({
      from: 'Saradm Website <no-reply@saradm.com>',
      to: ['saradelmor@gmail.com'],
      subject: `Nuevo formulario de saradm.com - ${name}`,
      html: `<p>You have a new message from your website contact form.</p>
             <p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Message:</strong></p>
             <p>${message}</p>`,
    });

    if (error) {
      console.error({ error });
      return new Response(
        JSON.stringify({ message: 'Error sending email' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Message sent successfully!' }),
      { status: 200 }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ message: 'An unexpected error occurred.' }),
      { status: 500 }
    );
  }
};

import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState(''); // '', 'loading', 'success', 'error'

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' }); // Clear form
      } else {
        const errorData = await response.json();
        console.error('Submission error:', errorData);
        setStatus('error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <p className="text-xl md:text-2xl text-center text-[#a48374]">
        ¡Gracias por tu mensaje! Te responderé pronto.
      </p>
    );
  }

  return (
    <form className="text-xl md:text-2xl space-y-6" onSubmit={handleSubmit}>
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="text-xl md:text-2xl block font-medium mb-2 text-[#a48374]">
          Nombre
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-400 bg-[#f1ede6] text-black transition-all duration-300"
        />
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="text-xl md:text-2xl block font-medium mb-2 text-[#a48374]">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-400 bg-[#f1ede6] text-black transition-all duration-300"
        />
      </div>

      {/* Message Field */}
      <div>
        <label htmlFor="message" className="text-xl md:text-2xl block font-medium mb-2 text-[#a48374]">
          Mensaje
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows="6"
          required
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-400 bg-[#f1ede6] text-black transition-all duration-300 resize-none"
        ></textarea>
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-hover px-8 py-3 rounded-full font-medium transition-all duration-300 bg-[#a48374] text-[#f1ede6] disabled:opacity-50"
        >
          {status === 'loading' ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-red-500 text-center">
          Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo.
        </p>
      )}
    </form>
  );
}

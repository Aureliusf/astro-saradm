import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    privacyConsent: false,
  });
  const [status, setStatus] = useState(''); // '', 'loading', 'success', 'error'

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.privacyConsent) {
      alert('Debes aceptar la política de privacidad para continuar.');
      return;
    }
    
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
        setFormData({ name: '', email: '', message: '', privacyConsent: false }); // Clear form
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
      <p className="text-xl md:text-2xl text-center text-[#220d0c]">
        ¡Gracias por tu mensaje! Te responderé pronto.
      </p>
    );
  }

  return (
    <form className="text-xl md:text-2xl space-y-6" onSubmit={handleSubmit}>
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="text-xl md:text-2xl block font-medium mb-2 text-[#220d0c]">
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
        <label htmlFor="email" className="text-xl md:text-2xl block font-medium mb-2 text-[#220d0c]">
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
        <label htmlFor="message" className="text-xl md:text-2xl block font-medium mb-2 text-[#220d0c]">
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

      {/* Privacy Consent Checkbox */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="privacyConsent"
          name="privacyConsent"
          checked={formData.privacyConsent}
          onChange={handleChange}
          className="mt-1.5 w-5 h-5 rounded border-2 border-gray-400 bg-[#f1ede6] text-[#541409] focus:ring-[#541409] transition-all duration-300"
        />
        <label htmlFor="privacyConsent" className="text-lg md:text-xl text-[#220d0c] leading-relaxed">
          Acepto la <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#541409] underline hover:text-[#220d0c] transition-colors">política de privacidad</a> y el tratamiento de mis datos personales.
        </label>
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="main-title-font btn-hover px-8 py-3 rounded-full font-medium transition-all duration-300 bg-[#541409] text-[#f1ede6] disabled:opacity-50"
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

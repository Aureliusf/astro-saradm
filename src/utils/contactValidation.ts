// Validation constants shared between client and server
const VALIDATION_LIMITS = {
  name: { min: 1, max: 100 },
  email: { min: 5, max: 254 },
  message: { min: 1, max: 5000, maxNewlines: 50 }
} as const;

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateContactForm(data: {
  name?: string;
  email?: string;
  message?: string;
}): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  // Name validation
  if (!data.name || data.name.length < VALIDATION_LIMITS.name.min) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (data.name.length > VALIDATION_LIMITS.name.max) {
    errors.push({ field: 'name', message: `Name must be under ${VALIDATION_LIMITS.name.max} characters` });
  }
  
  // Email validation
  if (!data.email || data.email.length < VALIDATION_LIMITS.email.min) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email' });
  } else if (data.email.length > VALIDATION_LIMITS.email.max) {
    errors.push({ field: 'email', message: 'Email is too long' });
  }
  
  // Message validation
  if (!data.message || data.message.length < VALIDATION_LIMITS.message.min) {
    errors.push({ field: 'message', message: 'Message is required' });
  } else if (data.message.length > VALIDATION_LIMITS.message.max) {
    errors.push({ field: 'message', message: `Message must be under ${VALIDATION_LIMITS.message.max} characters` });
  } else {
    const newlines = (data.message.match(/\n/g) || []).length;
    if (newlines > VALIDATION_LIMITS.message.maxNewlines) {
      errors.push({ field: 'message', message: 'Too many line breaks' });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// M3.1: walidacja żądania rejestracji. Funkcje bez efektów ubocznych;
// testy w validation.test.js ładują ten plik w Node. Reguły jak w SPEC.md i TECH.md,
// te same co w src/validation.ts.

const ORDER_NUMBER_RE = /^\d{7}$/;
const FIRST_NAME_RE = /^\p{L}[\p{L} -]{1,29}$/u;
const LAST_INITIAL_RE = /^\p{L}$/u;

function normalizeOrderNumber(value) {
  return String(value ?? '').replace(/\s+/g, '');
}

function normalizeFirstName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeLastInitial(value) {
  return String(value ?? '').trim().toLocaleUpperCase('pl');
}

/**
 * Sprawdza dane z formularza.
 * Zwraca { ok: true, value: { orderNumber, firstName, lastInitial } }
 * albo { ok: false, error: 'VALIDATION', field? }.
 * Wypełnione pole-pułapka `website` daje VALIDATION bez `field`.
 */
function validateRegistration(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'VALIDATION' };
  }
  if (String(input.website ?? '') !== '') {
    return { ok: false, error: 'VALIDATION' };
  }

  const orderNumber = normalizeOrderNumber(input.orderNumber);
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    return { ok: false, error: 'VALIDATION', field: 'orderNumber' };
  }

  const firstName = normalizeFirstName(input.firstName);
  if (!FIRST_NAME_RE.test(firstName)) {
    return { ok: false, error: 'VALIDATION', field: 'firstName' };
  }

  const lastInitial = normalizeLastInitial(input.lastInitial);
  if (!LAST_INITIAL_RE.test(lastInitial)) {
    return { ok: false, error: 'VALIDATION', field: 'lastInitial' };
  }

  return { ok: true, value: { orderNumber, firstName, lastInitial } };
}

/** Parsuje ciało żądania (tekst JSON) i sprawdza je przez validateRegistration. */
function parseRegistration(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: 'VALIDATION' };
  }
  return validateRegistration(input);
}

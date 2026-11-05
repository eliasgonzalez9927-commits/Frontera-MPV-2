export const COMPLAINT_MAX_LENGTH = 1000;

// Validación de interfaz únicamente: pide que haya contenido. No interpreta el texto
// ni evalúa su contenido clínico.
export function validateComplaint(text: string): string | null {
  if (text.replace(/\s/g, "").length < 3) {
    return "Contanos con tus palabras qué te está pasando para poder continuar.";
  }
  return null;
}

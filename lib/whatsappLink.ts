const FRONTERA_WHATSAPP_NUMBER = "5492617261009";

export function buildClinicWhatsappUrl(slug: string) {
  const message = `[FRONTERA-CLINIC:${slug}] Hola, quiero hacer mi pre-triaje`;

  return `https://wa.me/${FRONTERA_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

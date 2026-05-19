// Normalise n'importe quel téléphone tapé librement en format international
// E.164 (ex: +32475123456) ET produit un affichage lisible BE-friendly
// (ex: "0475 12 34 56"). Utilisé partout dans l'UI pour avoir un rendu
// cohérent quel que soit le format de saisie initial.

export type FormattedPhone = {
  /** Format E.164 pour `href="tel:..."` (compatible iOS Phone, Android dialer). */
  tel: string;
  /** Format lisible affiché à l'écran (0475 12 34 56 pour BE, sinon tel quel). */
  display: string;
};

function stripChars(input: string): string {
  return input.replace(/[\s.\-()]/g, "");
}

function toE164(raw: string): string {
  const cleaned = stripChars(raw);
  if (cleaned.startsWith("0032")) return "+32" + cleaned.slice(4);
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+32" + cleaned.slice(1);
  return cleaned;
}

/** Découpe un numéro BE (sans le préfixe +32) en groupes lisibles. */
function groupBE(rest: string): string {
  // 9 chiffres typique : 475 12 34 56 → 0475 12 34 56
  // 8 chiffres (numéro fixe) : 2 511 22 33 → 02 511 22 33
  if (rest.length === 9) {
    return `0${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7)}`;
  }
  if (rest.length === 8) {
    return `0${rest.slice(0, 1)} ${rest.slice(1, 4)} ${rest.slice(4, 6)} ${rest.slice(6)}`;
  }
  return `0${rest}`;
}

export function formatPhoneBE(raw: string | null | undefined): FormattedPhone {
  if (!raw) return { tel: "", display: "" };
  const tel = toE164(raw);
  if (tel.startsWith("+32")) {
    return { tel, display: groupBE(tel.slice(3)) };
  }
  return { tel, display: tel };
}

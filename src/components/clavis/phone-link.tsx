import { formatPhoneBE } from "@/lib/format";

export function PhoneLink({
  phone,
  className,
}: {
  phone: string | null | undefined;
  className?: string;
}) {
  const { tel, display } = formatPhoneBE(phone);
  if (!tel) return null;
  return (
    <a
      href={`tel:${tel}`}
      className={`hover:text-primary transition-colors hover:underline ${className ?? ""}`}
    >
      {display}
    </a>
  );
}

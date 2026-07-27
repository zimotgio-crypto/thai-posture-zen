import type { ElementType, ReactNode } from "react";

/**
 * Rendert von der Therapeutin eingegebene Inhalte (Behandlungsnamen, Studiotexte,
 * Kundenstimmen, Notizen …) IMMER unverändert.
 *
 * `translate="no"` + die Klasse `notranslate` verhindern, dass Browser-
 * Übersetzer (Chrome, Safari, Edge) solche Werte automatisch ersetzen —
 * z. B. eine Behandlung „Test“ zu „Prüfen“ machen. Studio-Inhalte laufen
 * grundsätzlich nicht über eine Übersetzungsschicht.
 */
export function StudioText({
  children,
  as: Tag = "span",
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}) {
  return (
    <Tag translate="no" className={className ? `notranslate ${className}` : "notranslate"}>
      {children}
    </Tag>
  );
}
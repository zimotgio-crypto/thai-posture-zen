import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { BookingModal } from "./booking-modal";

type Ctx = { open: (treatment?: string) => void; close: () => void };
const BookingCtx = createContext<Ctx | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [treatment, setTreatment] = useState<string | undefined>(undefined);

  const open = useCallback((t?: string) => {
    setTreatment(t);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <BookingCtx.Provider value={value}>
      {children}
      <BookingModal open={isOpen} onOpenChange={setIsOpen} initialTreatment={treatment} />
    </BookingCtx.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingCtx);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
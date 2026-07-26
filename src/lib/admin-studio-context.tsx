import { createContext, useContext, type ReactNode } from "react";

export type AdminStudio = {
  id: string;
  slug: string;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
};

export type AdminStudioValue = {
  studioId: string;
  studio: AdminStudio;
  studios: { id: string; name: string; city: string | null }[];
  isPlatformAdmin: boolean;
  setStudioId: (id: string) => void;
};

const AdminStudioCtx = createContext<AdminStudioValue | null>(null);

export function AdminStudioProvider({
  value,
  children,
}: {
  value: AdminStudioValue;
  children: ReactNode;
}) {
  return <AdminStudioCtx.Provider value={value}>{children}</AdminStudioCtx.Provider>;
}

export function useAdminStudio(): AdminStudioValue {
  const ctx = useContext(AdminStudioCtx);
  if (!ctx) throw new Error("useAdminStudio must be used within AdminStudioProvider");
  return ctx;
}

export function useAdminStudioOptional(): AdminStudioValue | null {
  return useContext(AdminStudioCtx);
}
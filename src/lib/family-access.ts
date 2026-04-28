/**
 * Helpers para sesión familiar de Legados Eternos.
 *
 * El token plano nunca se envía al servidor para login normal:
 * se valida vía RPC `validate_family_access_token` que compara
 * su hash SHA-256 con el almacenado en DB.
 *
 * El token vive en localStorage bajo la clave FAMILY_TOKEN_KEY.
 * La sesión se renueva automáticamente cada vez que se valida (30 días).
 */

import { supabase } from "@/integrations/supabase/client";

export const FAMILY_TOKEN_KEY = "family_access_token";

export interface FamilySession {
  accessId: string;
  memorialId: string;
  memorialSlug: string;
  memorialName: string;
  familyEmail: string;
  familyName: string;
  expiresAt: string;
}

export function getStoredFamilyToken(): string | null {
  try {
    return localStorage.getItem(FAMILY_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeFamilyToken(token: string) {
  try {
    localStorage.setItem(FAMILY_TOKEN_KEY, token);
  } catch {}
}

export function clearFamilyToken() {
  try {
    localStorage.removeItem(FAMILY_TOKEN_KEY);
  } catch {}
}

export async function validateFamilyToken(token: string): Promise<FamilySession | null> {
  if (!token || token.length < 16) return null;
  const { data, error } = await supabase.rpc("validate_family_access_token", { _token: token });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as {
    access_id: string;
    memorial_id: string;
    memorial_slug: string;
    memorial_name: string;
    family_email: string;
    family_name: string;
    expires_at: string;
  };
  return {
    accessId: row.access_id,
    memorialId: row.memorial_id,
    memorialSlug: row.memorial_slug,
    memorialName: row.memorial_name,
    familyEmail: row.family_email,
    familyName: row.family_name,
    expiresAt: row.expires_at,
  };
}

/** Token criptográficamente seguro de 48 caracteres URL-safe. */
export function generateSecureToken(): string {
  const bytes = new Uint8Array(36);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Código de recuperación legible: 12 chars alfanuméricos sin ambigüedad. */
export function generateRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function resetFamilyAccess(
  email: string,
  recoveryCode: string,
): Promise<{ success: boolean; newToken?: string }> {
  const newToken = generateSecureToken();
  const { data, error } = await supabase.rpc("reset_family_access_with_recovery_code", {
    _email: email,
    _recovery_code: recoveryCode,
    _new_token: newToken,
  });
  if (error || data !== true) return { success: false };
  return { success: true, newToken };
}

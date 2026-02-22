import { NextResponse } from "next/server";

export function apiUnauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function apiValidationError(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function apiServerError(error: unknown) {
  const message = error instanceof Error ? error.message : "Error interno";
  return NextResponse.json({ error: message }, { status: 500 });
}


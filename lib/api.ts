import { NextResponse } from "next/server";

export function apiUnauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function apiValidationError(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function apiUnexpectedError(message = "Ocurrió un error interno del servidor.") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function apiServerError(error?: unknown) {
  void error;
  return apiUnexpectedError();
}

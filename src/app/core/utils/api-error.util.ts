import { HttpErrorResponse } from '@angular/common/http';

const TECHNICAL_MESSAGE =
  /json value|byteposition|linenumber|system\.|path:\s*\$|could not be converted|unexpected token|at\s+\w+\.|stack trace|exception/i;

const HTTP_FAILURE_MESSAGE = /^http failure response for\s+/i;

const DEFAULT_UNHANDLED = 'Internal Server Error';

/**
 * User-safe API error text for SmartOpsApp.
 * - Shows API body message when it is a proper, non-technical message
 * - Never surfaces URL / "Http failure response for …" text
 * - Unhandled / no usable message → "Internal Server Error"
 */
export function getUserFacingApiError(
  err: unknown,
  fallback: string = DEFAULT_UNHANDLED,
): string {
  const messages = collectErrorMessages(err).filter((m) => m.trim());
  const friendly = messages.find((m) => !isTechnicalOrHttpNoise(m));
  if (friendly) {
    return friendly;
  }

  const status = resolveHttpStatus(err);
  if (status >= 500 || status === 0) {
    return DEFAULT_UNHANDLED;
  }

  return fallback || DEFAULT_UNHANDLED;
}

function resolveHttpStatus(err: unknown): number {
  if (err instanceof HttpErrorResponse) {
    return err.status;
  }
  if (err && typeof err === 'object' && 'status' in err) {
    const status = Number((err as { status?: number }).status);
    return Number.isFinite(status) ? status : 0;
  }
  return 0;
}

function collectErrorMessages(err: unknown): string[] {
  const out: string[] = [];

  const body =
    err instanceof HttpErrorResponse
      ? err.error
      : err && typeof err === 'object' && 'error' in err
        ? (err as { error?: unknown }).error
        : undefined;

  pushBodyMessages(body, out);

  // Only use top-level .message when it is not Angular's HTTP failure noise.
  if (err && typeof err === 'object' && 'message' in err) {
    const top = String((err as { message?: unknown }).message ?? '').trim();
    if (top && !HTTP_FAILURE_MESSAGE.test(top) && !isTechnicalOrHttpNoise(top)) {
      out.push(top);
    }
  }

  return out;
}

function pushBodyMessages(body: unknown, out: string[]): void {
  if (body == null) return;

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return;
    // ASP.NET sometimes returns JSON string; try parse.
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        pushBodyMessages(JSON.parse(trimmed), out);
        return;
      } catch {
        out.push(trimmed);
        return;
      }
    }
    out.push(trimmed);
    return;
  }

  if (Array.isArray(body)) {
    for (const item of body) {
      if (typeof item === 'string' && item.trim()) {
        out.push(item.trim());
      } else if (item != null) {
        pushBodyMessages(item, out);
      }
    }
    return;
  }

  if (typeof body !== 'object') return;

  const record = body as Record<string, unknown>;
  const errors = record['errors'];
  if (errors && typeof errors === 'object') {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        out.push(...value.map((v) => String(v)).filter((v) => v.trim()));
      } else if (value != null && String(value).trim()) {
        out.push(String(value).trim());
      }
    }
  }

  for (const key of ['message', 'Message', 'detail', 'Detail', 'title', 'Title', 'error', 'Error']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      out.push(value.trim());
    }
  }
}

function isTechnicalOrHttpNoise(message: string): boolean {
  const m = message.trim();
  if (!m) return true;
  if (HTTP_FAILURE_MESSAGE.test(m)) return true;
  if (/https?:\/\//i.test(m) && /\/api\//i.test(m)) return true;
  if (/<!DOCTYPE|<html[\s>]/i.test(m)) return true;
  if (TECHNICAL_MESSAGE.test(m) || m.includes('$.')) return true;
  return false;
}

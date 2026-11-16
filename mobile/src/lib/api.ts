import { useMobileStore } from "@/stores/mobile-store";

function formatApiError(errField: unknown, status: number): string {
  if (typeof errField === "string") return errField;
  if (errField && typeof errField === "object") {
    const obj = errField as {
      message?: string;
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    };
    if (obj.message) return obj.message;
    if (obj.fieldErrors) {
      const first = Object.entries(obj.fieldErrors)
        .filter(([, msgs]) => msgs && msgs.length > 0)
        .map(([k, msgs]) => `${k}: ${msgs[0]}`);
      if (first.length > 0) return first.join(", ");
    }
    if (obj.formErrors && obj.formErrors.length > 0) {
      return obj.formErrors.join(", ");
    }
    return JSON.stringify(errField);
  }
  return `HTTP ${status}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = useMobileStore.getState().serverUrl;
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`Invalid server response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(formatApiError(json?.error, res.status));
  }
  return json as T;
}

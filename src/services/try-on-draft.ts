import { TryOnDraft } from "@/types/try-on";


let draft: TryOnDraft | null = null;

export function setTryOnDraft(value: TryOnDraft): void {
  draft = value;
}

export function consumeTryOnDraft(): TryOnDraft | null {
  const value = draft;
  draft = null;
  return value;
}

export function peekTryOnDraft(): TryOnDraft | null {
  return draft;
}

export function clearTryOnDraft(): void {
  draft = null;
}

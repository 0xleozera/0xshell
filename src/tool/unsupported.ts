/**
 * Declares that a Tool does not exist on a Platform. Reported with `⊘`
 * and its reason — never skipped silently (ADR-0002).
 */
export type Unsupported = {
  readonly unsupported: true;
  readonly reason: string;
};

export function unsupported(reason: string): Unsupported {
  return { unsupported: true, reason };
}

export function isUnsupported(value: unknown): value is Unsupported {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Unsupported).unsupported === true &&
    typeof (value as Unsupported).reason === 'string' &&
    (value as Unsupported).reason.length > 0
  );
}

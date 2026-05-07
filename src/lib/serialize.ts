/** JSON-safe deep clone that turns BigInt into string. */
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

/**
 * PDPL-safe public projection of a User row (spec §12.5).
 *
 * Public surfaces (parcel detail, SidePanel, listing card, ActivityLog)
 * MUST go through this helper. Real name, email, and phone are stripped
 * — only the nickname identifies the user externally. Admin surfaces
 * use a separate (richer) shape.
 *
 * Pass any object with the listed fields; extra fields are ignored.
 * Returns nullable nickname because legacy / autoMigrated users may
 * not have one set yet — the UI should render "—" or hide the
 * "Owner: X" row entirely (per spec §5.4.1) when nickname is null.
 */
export interface UserPublic {
  id: string;
  nickname: string | null;
  role: string;
  avatarUrl: string | null;
  companyName: string | null;
  reraLicense: string | null;
}

export function serializeUserPublic(u: {
  id: string;
  nickname?: string | null;
  role: string;
  avatarUrl?: string | null;
  companyName?: string | null;
  reraLicense?: string | null;
}): UserPublic {
  return {
    id: u.id,
    nickname: u.nickname ?? null,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    companyName: u.companyName ?? null,
    reraLicense: u.reraLicense ?? null,
  };
}

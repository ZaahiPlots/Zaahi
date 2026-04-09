/** JSON-safe deep clone that turns BigInt into string. */
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

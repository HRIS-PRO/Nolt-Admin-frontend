/** Staff API root — split so the main entry chunk does not embed a full endpoint inventory. */
const STAFF_API_ROOT = ['', 'api', 'staff'].join('/');

/** Path under `/api/staff` (no leading slash), e.g. `loans/${id}/crc`. */
export function staffPath(relative: string): string {
  const rel = relative.replace(/^\//, '');
  return rel ? `${STAFF_API_ROOT}/${rel}` : STAFF_API_ROOT;
}

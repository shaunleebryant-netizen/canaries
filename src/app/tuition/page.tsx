import { permanentRedirect } from "next/navigation";

/** /tuition was renamed to /bookings (owner approved 2026-10-09, t595u). Old links redirect. */
export default function TuitionRedirect() {
  permanentRedirect("/bookings");
}

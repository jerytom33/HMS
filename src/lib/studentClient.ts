// Browser helpers for the student portal pages.

export type PassportInfo = {
  allowed: boolean; status: 'none' | 'submitted' | 'verified' | 'rejected';
  number: string; validUntil: string; validUntilIso: string; rejectReason: string; copyUploadedAt: string;
};

export type StudentProfile = {
  name: string; whatsapp: string; email: string; gender: string; course: string; yearOfStudy: string;
  arrivalDateText: string; arrivalDate: string; passport: PassportInfo;
};

export type StudentBooking = {
  ref: string; status: string; hostel: string; room: string; floor: string; bed: string;
  arrivalDate?: string; price: string; deposit: string; createdAt?: string; canCancel?: boolean;
};

export type StudentRoom = {
  hostel: string; location: string; facilities: string[]; unitType: string; label: string; roomNum: string;
  floorName: string; bed: string; bedType: string; sharing: number; rent: number | null; deposit: number | null;
  rentIncludes: string; amenities: string[]; genderPolicy: string; bedImage: string | null; images: string[];
  /** The paid booking this room comes from (null for a bed staff assigned by hand). */
  booking: { ref: string; status: string; arrivalDate: string; rent: number | null; deposit: number | null; minStayAgreed: boolean } | null;
};

/** A booking still on hold, waiting for payment confirmation. */
export type PendingBooking = { ref: string; room: string; bed: string; hostel: string; arrivalDate: string };

export const BOOKING_STATUS: Record<string, string> = { held: 'On hold — awaiting payment', paid: 'Paid', cancelled: 'Cancelled' };

/** Cancel a booking that is on hold; the answer's message is for the student. */
export async function cancelBooking(ref: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/student/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: Boolean(data.ok), message: data.message || "Couldn't cancel the booking. Please try again." };
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' };
  }
}

/** JSON from a student API; a 401 sends the student to the login page and rejects with 'signed out'. */
export async function studentGet<T>(url: string, back: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = `/student/login?callbackUrl=${encodeURIComponent(back)}`;
    throw new Error('signed out');
  }
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

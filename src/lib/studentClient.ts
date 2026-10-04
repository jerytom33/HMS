// Browser helpers for the student portal pages.

export type StudentProfile = {
  name: string; whatsapp: string; email: string; gender: string; course: string; yearOfStudy: string;
  arrivalDateText: string; arrivalDate: string;
};

export type StudentBooking = {
  ref: string; status: string; hostel: string; room: string; floor: string; bed: string;
  arrivalDate?: string; price: string; deposit: string; createdAt?: string;
};

export type StudentRoom = {
  hostel: string; location: string; facilities: string[]; unitType: string; label: string; roomNum: string;
  floorName: string; bed: string; bedType: string; sharing: number; rent: number | null; deposit: number | null;
  rentIncludes: string; amenities: string[]; genderPolicy: string; bedImage: string | null; images: string[];
};

export const BOOKING_STATUS: Record<string, string> = { held: 'On hold — awaiting payment', paid: 'Paid', cancelled: 'Cancelled' };

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

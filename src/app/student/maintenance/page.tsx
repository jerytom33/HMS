import { redirect } from 'next/navigation';

// Not offered in the student portal yet; old links land on the dashboard
export default function Page() {
  redirect('/student');
}

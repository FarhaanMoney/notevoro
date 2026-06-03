import { redirect } from 'next/navigation';

export default function WorkspaceRedirect() {
  redirect('/dashboard/study-sets');
}

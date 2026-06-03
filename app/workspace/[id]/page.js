import { redirect } from 'next/navigation';

export default function WorkspaceDetailRedirect({ params }) {
  redirect(`/dashboard/study-sets/${params.id}`);
}

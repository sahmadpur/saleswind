import { requireUser } from "@/lib/session";
import { changePasswordAction } from "@/actions/auth-actions";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle={`Signed in as ${user.email}`} />

      <Card>
        <CardLabel>Change password</CardLabel>
        <ChangePasswordForm action={changePasswordAction} />
      </Card>
    </div>
  );
}

import { changePasswordAction } from "@/actions/auth-actions";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";

export default async function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />

      <Card>
        <CardLabel>Change password</CardLabel>
        <ChangePasswordForm action={changePasswordAction} />
      </Card>
    </div>
  );
}

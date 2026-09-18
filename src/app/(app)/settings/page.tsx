import { changePasswordAction } from "@/actions/auth-actions";
import { Card, CardLabel } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { PushToggle } from "@/components/settings/PushToggle";
import { vapidPublicKey } from "@/services/push-service";

export default async function SettingsPage() {
  const publicKey = vapidPublicKey();
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />

      {publicKey && (
        <Card>
          <CardLabel>Notifications</CardLabel>
          <PushToggle publicKey={publicKey} />
        </Card>
      )}

      <Card>
        <CardLabel>Change password</CardLabel>
        <ChangePasswordForm action={changePasswordAction} />
      </Card>
    </div>
  );
}

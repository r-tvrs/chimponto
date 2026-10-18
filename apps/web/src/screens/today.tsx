import { formatLongDate } from "@chimponto/domain";
import { useSignedInUser } from "@/auth/auth";
import { Avatar } from "@/components/avatar";
import { ScreenHeader } from "@/components/screen-header";
import { useProfile } from "@/data/profile";

export function TodayScreen() {
  const user = useSignedInUser();
  const { data: profile } = useProfile(user.id);

  return (
    <ScreenHeader title="Hoje" eyebrow={formatLongDate(new Date())}>
      <Avatar displayName={profile?.display_name ?? null} email={user.email} />
    </ScreenHeader>
  );
}

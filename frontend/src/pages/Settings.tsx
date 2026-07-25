import { useEffect, useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useForwardingAddress } from "@/hooks/useForwardingAddress";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/useTheme";
import { Mail } from "lucide-react";

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const { data: forwardingData } = useForwardingAddress();

  const [currency, setCurrency] = useState("USD");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
      setNotifications(settings.notification_email);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      currency,
      notification_email: notifications,
      theme,
    });
  };

  if (isLoading) {
    return (
      <PageWrapper title="Settings">
        <Skeleton className="h-[300px]" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email Notifications</Label>
              <Select
                value={notifications ? "true" : "false"}
                onValueChange={(v) => setNotifications(v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Forwarding
            </CardTitle>
            <CardDescription>
              Forward your bank statement emails to automatically detect subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Your forwarding address:</p>
              <p className="mt-1 font-mono text-lg">{forwardingData?.forwarding_address || "Loading..."}</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>How to set up:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open your email client</li>
                <li>Forward a bank statement email to the address above</li>
                <li>The system will automatically parse and analyze it</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}

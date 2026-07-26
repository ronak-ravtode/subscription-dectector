import { useEffect, useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useForwardingAddress } from "@/hooks/useForwardingAddress";
import { useSmsSettings, useUpdateSmsSettings } from "@/hooks/useSmsSettings";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/useTheme";
import { Mail, MessageSquare, Palette, Settings as SettingsIcon, CheckCircle } from "lucide-react";
import api from "@/lib/api";

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const { data: forwardingData } = useForwardingAddress();
  const { data: smsSettings } = useSmsSettings();
  const updateSmsSettings = useUpdateSmsSettings();

  const [currency, setCurrency] = useState("USD");
  const [notifications, setNotifications] = useState(true);
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
      setNotifications(settings.notification_email);
    }
  }, [settings]);

  useEffect(() => {
    if (smsSettings?.phone_number) {
      setSmsPhoneNumber(smsSettings.phone_number);
    }
  }, [smsSettings]);

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
        <div className="space-y-section">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Settings" description="Customize your SubGuard experience.">
      <div className="mx-auto max-w-2xl space-y-section">
        <Card className="border border-hairline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-mute" />
              Appearance
            </CardTitle>
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

        <Card className="border border-hairline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-mute" />
              Preferences
            </CardTitle>
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

        <Card className="border border-hairline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-mute" />
              Email Forwarding
            </CardTitle>
            <CardDescription>
              Forward your bank statement emails to automatically detect subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-soft-cloud p-4">
              <p className="text-sm font-medium text-mute mb-1">Your forwarding address:</p>
              <p className="font-mono text-lg">{forwardingData?.forwarding_address || "Loading..."}</p>
            </div>
            <div className="text-sm text-mute space-y-2">
              <p className="font-medium">How to set up:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open your email client</li>
                <li>Forward a bank statement email to the address above</li>
                <li>The system will automatically parse and analyze it</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-hairline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-mute" />
              SMS Forwarding
            </CardTitle>
            <CardDescription>
              Automatically detect subscriptions from bank SMS alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {smsSettings?.forwarding_number && (
              <div className="bg-soft-cloud p-4">
                <p className="text-sm font-medium text-mute mb-1">Your forwarding number:</p>
                <p className="font-mono text-lg">{smsSettings.forwarding_number}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sms-phone">Your phone number</Label>
              <Input
                id="sms-phone"
                placeholder="+91 98765 43210"
                value={smsPhoneNumber}
                onChange={(e) => setSmsPhoneNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>SMS Forwarding</Label>
              <Select
                value={smsSettings?.sms_forwarding_enabled ? "true" : "false"}
                onValueChange={(v) =>
                  updateSmsSettings.mutate({ sms_forwarding_enabled: v === "true" })
                }
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

            <Button
              onClick={() => updateSmsSettings.mutate({ phone_number: smsPhoneNumber })}
              disabled={updateSmsSettings.isPending}
            >
              Save Phone Number
            </Button>

            {smsSettings?.sms_forwarding_enabled && (
              <div className="bg-soft-cloud p-4 text-sm space-y-2">
                <p className="font-medium">Setup Instructions:</p>
                <p>
                  <strong>iOS:</strong> Open Shortcuts → Create automation → When SMS received
                  containing "deducted"/"spent" → Forward to{" "}
                  {smsSettings.forwarding_number}
                </p>
                <p>
                  <strong>Android:</strong> Install Tasker → Profile: SMS received → Filter: Body
                  matches "deducted" → Task: Send SMS to {smsSettings.forwarding_number}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              disabled={updateSmsSettings.isPending}
              onClick={() => {
                // Save phone number first if it's not yet persisted, then test
                const savePromise = smsPhoneNumber && smsPhoneNumber !== smsSettings?.phone_number
                  ? new Promise((resolve, reject) => {
                      updateSmsSettings.mutate(
                        { phone_number: smsPhoneNumber },
                        { onSuccess: resolve, onError: reject }
                      );
                    })
                  : Promise.resolve();

                savePromise
                  .then(() => api.post("/api/user/sms-test"))
                  .then(() => alert("Test SMS sent!"))
                  .catch((err) => {
                    const msg = err?.response?.data?.detail || "Failed to send test SMS. Make sure you've saved your phone number.";
                    alert(msg);
                  });
              }}
            >
              Test Forwarding
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="lg"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Save Settings
              </span>
            )}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}

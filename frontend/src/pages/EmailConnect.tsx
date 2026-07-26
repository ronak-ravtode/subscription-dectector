import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Loader2, Mail, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface EmailResult {
  id: string;
  subject: string;
  from_email: string;
  received_date: string | null;
  transactions: Array<{
    date: string;
    amount: string;
    description: string;
  }>;
  is_recurring: boolean;
  merchant_detected: string | null;
  amount_detected: number | null;
  scanned_at: string | null;
}

export function EmailConnect() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["email-status"],
    queryFn: () => api.get("/api/user/email/status").then((r) => r.data),
  });

  const { data: results, isLoading: resultsLoading, refetch: refetchResults } = useQuery<EmailResult[]>({
    queryKey: ["email-results"],
    queryFn: () => api.get("/api/user/email/results?limit=20").then((r) => r.data),
    enabled: status?.connected,
  });

  const connectMutation = useMutation({
    mutationFn: (data: { email: string; app_password: string }) =>
      api.post("/api/user/email/connect", data).then((r) => r.data),
    onSuccess: () => {
      setEmail("");
      setAppPassword("");
      refetchStatus();
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => api.post("/api/user/email/scan-now").then((r) => r.data),
    onSuccess: () => {
      refetchStatus();
      refetchResults();
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete("/api/user/email/disconnect").then((r) => r.data),
    onSuccess: () => {
      refetchStatus();
    },
  });

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Email Scanning</h1>
          <p className="text-muted-foreground">
            Connect your Gmail to automatically detect subscription emails.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to scan for subscription emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!status?.connected ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                connectMutation.mutate({ email, app_password: appPassword });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Gmail Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-password">App Password</Label>
                <Input
                  id="app-password"
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Generate at Google Account - Security - App Passwords
                </p>
              </div>

              {connectMutation.isError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connection failed. Please check your credentials.
                  </AlertDescription>
                </Alert>
              )}

              {connectMutation.isSuccess && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Gmail connected successfully!
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={connectMutation.isPending}
                className="w-full"
              >
                {connectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Gmail"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Connected to <strong>{status.email}</strong>
                  <br />
                  Last scan:{" "}
                  {status.last_scan
                    ? new Date(status.last_scan).toLocaleString()
                    : "Never"}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{status.emails_scanned}</div>
                  <div className="text-sm text-muted-foreground">Emails Scanned</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{status.subscriptions_detected}</div>
                  <div className="text-sm text-muted-foreground">Subscriptions Found</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending}
                  className="flex-1"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    "Scan Now"
                  )}
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>

              {scanMutation.isSuccess && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Scan complete! {scanMutation.data.emails_scanned} emails scanned,{' '}
                    {scanMutation.data.transactions_found} transactions found,{' '}
                    {scanMutation.data.subscriptions_detected} subscriptions detected.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {status?.connected && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Scan Results</CardTitle>
              <CardDescription>Emails scanned and transactions detected</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchResults()}
              disabled={resultsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${resultsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {resultsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : results && results.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Subject</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {result.subject || "No subject"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {result.from_email}
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.received_date
                            ? new Date(result.received_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {result.merchant_detected ? (
                            <span className="font-medium">{result.merchant_detected}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.amount_detected ? (
                            <span className="font-mono">${result.amount_detected.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.is_recurring ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Recurring
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              One-time
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No scan results yet. Click "Scan Now" to scan your emails.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Go to{" "}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Google Account Security
              </a>
            </li>
            <li>
              Enable <strong>2-Step Verification</strong> if not already enabled
            </li>
            <li>
              Go to{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                App Passwords
              </a>
            </li>
            <li>
              Select <strong>Mail</strong> and your device
            </li>
            <li>
              Click <strong>Generate</strong>
            </li>
            <li>Copy the 16-character password and paste above</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

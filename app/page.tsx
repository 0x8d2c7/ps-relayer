"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DemoEvent } from "@/lib/store";

function postConfig(secretKey: string, targetUrl: string) {
  return fetch("/api/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secretKey, targetUrl }),
  });
}

function showTime(receivedAt: string) {
  return new Date(receivedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Home() {
  const [secretKey, setSecretKey] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("/api/webhook");
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DemoEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replayId, setReplayId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events", { cache: "no-store" });

      if (response.ok) {
        setEvents((await response.json()) as DemoEvent[]);
      }
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    const urlTimer = window.setTimeout(() => {
      setWebhookUrl(`${window.location.origin}/api/webhook`);

      setSecretKey(localStorage.getItem("secretKey") ?? "");
      setTargetUrl(localStorage.getItem("targetUrl") ?? "");

      void loadEvents();
    }, 0);

    // no websockets here, just poll for new events
    const timer = window.setInterval(() => {
      void loadEvents();
    }, 2000);

    return () => {
      window.clearTimeout(urlTimer);
      window.clearInterval(timer);
    };
  }, [loadEvents]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await postConfig(secretKey, targetUrl);
      localStorage.setItem("secretKey", secretKey);
      localStorage.setItem("targetUrl", targetUrl);
    } finally {
      setIsSaving(false);
    }
  }

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function replay(id: string) {
    setReplayId(id);

    try {
      await fetch("/api/replay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadEvents();
    } finally {
      setReplayId(null);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Paystack Webhook Relayer
          </h1>
          <p className="text-muted-foreground">
            Read your paystack events, responses, replay failed webhooks
          </p>
        </header>

        <Card>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={save}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Secret key
                  <Input
                    type="password"
                    value={secretKey}
                    onChange={(event) => setSecretKey(event.target.value)}
                    placeholder="sk_test_..."
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Target webhook
                  <Input
                    type="url"
                    value={targetUrl}
                    onChange={(event) => setTargetUrl(event.target.value)}
                    placeholder="https://example.com/webhook"
                  />
                </label>
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <p className="text-sm text-muted-foreground">
              Paste this into your paystack dashboard
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={webhookUrl} readOnly />
              <Button type="button" variant="outline" onClick={copyWebhookUrl}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received at</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <span className="text-muted-foreground">
                        No events yet.
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.event}</TableCell>
                      <TableCell>{event.reference ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.signatureValid ? "default" : "destructive"
                          }
                        >
                          {event.signatureValid ? "Valid" : "Invalid"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {typeof event.targetStatus === "number" ? (
                          <Badge
                            variant={
                              event.targetStatus >= 200 &&
                              event.targetStatus < 300
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {event.targetStatus}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell>{showTime(event.receivedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEvent(event)}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={replayId === event.id}
                            onClick={() => replay(event.id)}
                          >
                            {replayId === event.id ? "Replaying..." : "Replay"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedEvent ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.event}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.reference ?? "No transaction reference"}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Signature</dt>
                  <dd>{selectedEvent.signatureValid ? "Valid" : "Invalid"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{selectedEvent.targetStatus ?? "Failed"}</dd>
                </div>
              </dl>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap">
                {selectedEvent.rawBody}
              </pre>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}

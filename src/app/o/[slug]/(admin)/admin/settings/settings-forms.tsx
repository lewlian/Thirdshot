"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateOrgSettings,
  updateBookingSettings,
  updateBranding,
  updateClubPage,
} from "@/lib/actions/organization";
import { updateWaiver } from "@/lib/actions/waivers";
import type { Json } from "@/types/database";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  timezone: string;
  currency: string;
  primary_color: string;
  booking_window_days: number;
  slot_duration_minutes: number;
  max_consecutive_slots: number;
  payment_timeout_minutes: number;
  allow_guest_bookings: boolean;
  hero_image_url?: string | null;
  tagline?: string | null;
  operating_hours?: Record<string, string> | Json | null;
}

export function GeneralSettingsForm({
  org,
  isOwner,
}: {
  org: OrgData;
  isOwner: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateOrgSettings(org.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Settings updated");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Basic information about your organization
          {!isOwner && " (Owner only)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={org.name}
                required
                disabled={!isOwner}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input id="slug" value={org.slug} disabled />
              <p className="text-xs text-muted-foreground">
                Cannot be changed
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={org.description || ""}
              rows={3}
              disabled={!isOwner}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={org.email || ""}
                disabled={!isOwner}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={org.phone || ""}
                disabled={!isOwner}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                defaultValue={org.website || ""}
                disabled={!isOwner}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={org.address || ""}
                disabled={!isOwner}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                defaultValue={org.city || ""}
                disabled={!isOwner}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                name="timezone"
                defaultValue={org.timezone}
                disabled={!isOwner}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Singapore">
                    Asia/Singapore (SGT)
                  </SelectItem>
                  <SelectItem value="Asia/Kuala_Lumpur">
                    Asia/Kuala Lumpur (MYT)
                  </SelectItem>
                  <SelectItem value="Asia/Bangkok">
                    Asia/Bangkok (ICT)
                  </SelectItem>
                  <SelectItem value="Asia/Jakarta">
                    Asia/Jakarta (WIB)
                  </SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  <SelectItem value="America/New_York">
                    America/New York (EST)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    America/Los Angeles (PST)
                  </SelectItem>
                  <SelectItem value="Europe/London">
                    Europe/London (GMT)
                  </SelectItem>
                  <SelectItem value="Australia/Sydney">
                    Australia/Sydney (AEST)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                name="currency"
                defaultValue={org.currency}
                disabled={!isOwner}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SGD">SGD</SelectItem>
                  <SelectItem value="MYR">MYR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="THB">THB</SelectItem>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isOwner && (
            <div className="pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export function BookingSettingsForm({ org }: { org: OrgData }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateBookingSettings(org.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Booking settings updated");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Settings</CardTitle>
        <CardDescription>
          Configure how court bookings work for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking_window_days">
                Booking Window (days ahead)
              </Label>
              <Input
                id="booking_window_days"
                name="booking_window_days"
                type="number"
                min={1}
                max={90}
                defaultValue={org.booking_window_days}
              />
              <p className="text-xs text-muted-foreground">
                How far in advance members can book
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot_duration_minutes">
                Slot Duration (minutes)
              </Label>
              <Select
                name="slot_duration_minutes"
                defaultValue={org.slot_duration_minutes.toString()}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max_consecutive_slots">
                Max Consecutive Slots
              </Label>
              <Input
                id="max_consecutive_slots"
                name="max_consecutive_slots"
                type="number"
                min={1}
                max={8}
                defaultValue={org.max_consecutive_slots}
              />
              <p className="text-xs text-muted-foreground">
                Maximum hours per booking
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_timeout_minutes">
                Payment Timeout (minutes)
              </Label>
              <Input
                id="payment_timeout_minutes"
                name="payment_timeout_minutes"
                type="number"
                min={5}
                max={60}
                defaultValue={org.payment_timeout_minutes}
              />
              <p className="text-xs text-muted-foreground">
                Time to complete payment before booking expires
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label htmlFor="allow_guest_bookings" className="font-medium">
                Allow Guest Bookings
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Let non-members book courts without signing up
              </p>
            </div>
            <input
              type="hidden"
              name="allow_guest_bookings"
              value={org.allow_guest_bookings ? "true" : "false"}
              id="allow_guest_bookings_hidden"
            />
            <Switch
              defaultChecked={org.allow_guest_bookings}
              onCheckedChange={(checked) => {
                const hidden = document.getElementById(
                  "allow_guest_bookings_hidden"
                ) as HTMLInputElement;
                if (hidden) hidden.value = checked ? "true" : "false";
              }}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Booking Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function BrandingForm({ org }: { org: OrgData }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateBranding(org.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Branding updated");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Customize the look of your booking pages</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="primary_color"
                name="primary_color"
                type="color"
                defaultValue={org.primary_color}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                defaultValue={org.primary_color}
                className="w-32 font-mono text-sm"
                onChange={(e) => {
                  const colorInput = document.getElementById(
                    "primary_color"
                  ) as HTMLInputElement;
                  if (colorInput && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                    colorInput.value = e.target.value;
                  }
                }}
              />
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DEFAULT_HOURS: Record<string, string> = {
  mon: "07:00-22:00",
  tue: "07:00-22:00",
  wed: "07:00-22:00",
  thu: "07:00-22:00",
  fri: "07:00-22:00",
  sat: "08:00-22:00",
  sun: "08:00-22:00",
};

export function ClubPageForm({ org }: { org: OrgData }) {
  const [isPending, startTransition] = useTransition();
  const hours = (org.operating_hours as Record<string, string> | null) || DEFAULT_HOURS;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateClubPage(org.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Club page updated");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Club Page</CardTitle>
        <CardDescription>
          Customize your public club page at{" "}
          <a
            href={`/o/${org.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            /o/{org.slug}
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_image_url">Hero Image URL</Label>
            <Input
              id="hero_image_url"
              name="hero_image_url"
              type="url"
              placeholder="https://example.com/hero.jpg"
              defaultValue={org.hero_image_url || ""}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for a gradient background using your primary color
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              name="tagline"
              placeholder="Your club's tagline..."
              defaultValue={org.tagline || ""}
              maxLength={120}
            />
          </div>

          <div className="space-y-3">
            <Label>Operating Hours</Label>
            {DAY_ORDER.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium">{DAY_LABELS[day]}</span>
                <Input
                  name={`hours_${day}`}
                  defaultValue={hours[day] || "07:00-22:00"}
                  placeholder="07:00-22:00"
                  className="w-40"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Format: HH:MM-HH:MM or &quot;closed&quot;
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Club Page"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface WaiverData {
  id: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
}

export function WaiverSettingsForm({
  org,
  waiver,
  signatureCount,
}: {
  org: OrgData;
  waiver: WaiverData | null;
  signatureCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateWaiver(org.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Waiver updated");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Digital Waiver</CardTitle>
        <CardDescription>
          Require members to sign a liability waiver when joining.
          {waiver && ` Version ${waiver.version} - ${signatureCount} signature${signatureCount !== 1 ? "s" : ""}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waiver_title">Waiver Title</Label>
            <Input
              id="waiver_title"
              name="title"
              defaultValue={waiver?.title || "Liability Waiver"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waiver_content">Waiver Content</Label>
            <Textarea
              id="waiver_content"
              name="content"
              rows={10}
              defaultValue={waiver?.content || DEFAULT_WAIVER_CONTENT}
              placeholder="Enter your waiver text..."
            />
            <p className="text-xs text-muted-foreground">
              Editing the waiver creates a new version. Existing signatures remain valid.
            </p>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label htmlFor="waiver_active" className="font-medium">
                Require Waiver
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                New members must sign the waiver before accessing courts
              </p>
            </div>
            <input
              type="hidden"
              name="is_active"
              value={waiver?.is_active !== false ? "true" : "false"}
              id="waiver_active_hidden"
            />
            <Switch
              defaultChecked={waiver?.is_active !== false}
              onCheckedChange={(checked) => {
                const hidden = document.getElementById(
                  "waiver_active_hidden"
                ) as HTMLInputElement;
                if (hidden) hidden.value = checked ? "true" : "false";
              }}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Waiver"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const DEFAULT_WAIVER_CONTENT = `ASSUMPTION OF RISK AND WAIVER OF LIABILITY

I acknowledge that participation in pickleball and related activities involves inherent risks, including but not limited to:

- Physical injuries including sprains, strains, fractures, and other bodily harm
- Contact with other participants, equipment, or court surfaces
- Exposure to weather conditions
- Cardiovascular incidents

I voluntarily assume all risks associated with my participation in pickleball activities at this facility.

I hereby release, waive, and discharge the facility, its owners, operators, employees, and agents from any and all liability, claims, demands, and causes of action arising from my participation in pickleball activities.

I confirm that I am physically fit and have no medical conditions that would prevent my safe participation.

I have read this waiver, understand its terms, and sign it voluntarily.`;

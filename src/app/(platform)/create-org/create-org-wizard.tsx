"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check } from "lucide-react";

const STEPS = [
  "Basics",
  "Contact",
  "Courts",
  "Booking Rules",
  "Done",
] as const;

interface OrgFormData {
  // Step 1: Basics
  name: string;
  slug: string;
  description: string;
  // Step 2: Contact
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  // Step 3: Courts
  courts: { name: string; hourlyRate: number }[];
  // Step 4: Booking Rules
  bookingWindowDays: number;
  slotDurationMinutes: number;
  maxConsecutiveSlots: number;
  paymentTimeoutMinutes: number;
  allowGuestBookings: boolean;
  primaryColor: string;
  currency: string;
}

const DEFAULT_FORM: OrgFormData = {
  name: "",
  slug: "",
  description: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "SG",
  timezone: "Asia/Singapore",
  courts: [{ name: "Court 1", hourlyRate: 20 }],
  bookingWindowDays: 14,
  slotDurationMinutes: 60,
  maxConsecutiveSlots: 3,
  paymentTimeoutMinutes: 15,
  allowGuestBookings: true,
  primaryColor: "#16a34a",
  currency: "SGD",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function CreateOrgWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OrgFormData>(DEFAULT_FORM);
  const [isPending, startTransition] = useTransition();
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const router = useRouter();

  const updateField = <K extends keyof OrgFormData>(
    key: K,
    value: OrgFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNameChange = (name: string) => {
    updateField("name", name);
    updateField("slug", slugify(name));
  };

  const addCourt = () => {
    updateField("courts", [
      ...form.courts,
      { name: `Court ${form.courts.length + 1}`, hourlyRate: 20 },
    ]);
  };

  const updateCourt = (index: number, field: "name" | "hourlyRate", value: string | number) => {
    const updated = [...form.courts];
    updated[index] = { ...updated[index], [field]: value };
    updateField("courts", updated);
  };

  const removeCourt = (index: number) => {
    if (form.courts.length <= 1) return;
    updateField(
      "courts",
      form.courts.filter((_, i) => i !== index)
    );
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return form.name.trim().length > 0 && form.slug.trim().length > 0;
      case 1:
        return true; // Contact info is optional
      case 2:
        return form.courts.length > 0 && form.courts.every((c) => c.name.trim());
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/create-org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to create organization");
          return;
        }

        setCreatedSlug(data.slug);
        setStep(4); // Move to "Done" step
        toast.success("Organization created!");
      } catch {
        toast.error("Something went wrong");
      }
    });
  };

  const handleNext = () => {
    if (step === 3) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div>
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8 gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? "bg-green-600 text-white"
                  : i === step
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${i < step ? "bg-green-600" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div>
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Smash Pickleball Club"
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">thirdshot.app/o/</span>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => updateField("slug", slugify(e.target.value))}
                    placeholder="smash-pickleball"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Premier pickleball facility in Singapore"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="hello@club.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+65 9123 4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="123 Sports Avenue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Singapore"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="SG">Singapore</option>
                    <option value="MY">Malaysia</option>
                    <option value="US">United States</option>
                    <option value="AU">Australia</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={form.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT)</option>
                    <option value="America/New_York">America/New_York (ET)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="SGD">SGD</option>
                    <option value="MYR">MYR</option>
                    <option value="USD">USD</option>
                    <option value="AUD">AUD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-gray-500">
                Add the courts at your facility. You can add more later.
              </p>
              {form.courts.map((court, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Court Name</Label>
                    <Input
                      value={court.name}
                      onChange={(e) => updateCourt(i, "name", e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Label>$/hr</Label>
                    <Input
                      type="number"
                      min={0}
                      value={court.hourlyRate}
                      onChange={(e) =>
                        updateCourt(i, "hourlyRate", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  {form.courts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCourt(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCourt}>
                + Add Court
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bookingWindowDays">Booking Window (days)</Label>
                  <Input
                    id="bookingWindowDays"
                    type="number"
                    min={1}
                    max={90}
                    value={form.bookingWindowDays}
                    onChange={(e) =>
                      updateField("bookingWindowDays", parseInt(e.target.value) || 14)
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How far in advance can members book
                  </p>
                </div>
                <div>
                  <Label htmlFor="slotDurationMinutes">Slot Duration (min)</Label>
                  <select
                    id="slotDurationMinutes"
                    value={form.slotDurationMinutes}
                    onChange={(e) =>
                      updateField("slotDurationMinutes", parseInt(e.target.value))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxConsecutiveSlots">Max Consecutive Slots</Label>
                  <Input
                    id="maxConsecutiveSlots"
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxConsecutiveSlots}
                    onChange={(e) =>
                      updateField("maxConsecutiveSlots", parseInt(e.target.value) || 3)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="paymentTimeoutMinutes">Payment Timeout (min)</Label>
                  <Input
                    id="paymentTimeoutMinutes"
                    type="number"
                    min={5}
                    max={60}
                    value={form.paymentTimeoutMinutes}
                    onChange={(e) =>
                      updateField(
                        "paymentTimeoutMinutes",
                        parseInt(e.target.value) || 15
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowGuestBookings"
                  checked={form.allowGuestBookings}
                  onChange={(e) =>
                    updateField("allowGuestBookings", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="allowGuestBookings" className="mb-0">
                  Allow guest bookings (no account required)
                </Label>
              </div>
              <div>
                <Label htmlFor="primaryColor">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={form.primaryColor}
                    onChange={(e) => updateField("primaryColor", e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{form.primaryColor}</span>
                </div>
              </div>
            </>
          )}

          {step === 4 && createdSlug && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">
                  {form.name} is ready!
                </h2>
                <p className="text-gray-600">
                  Your booking page is live. Share this link with your members:
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <code className="text-sm font-mono break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/o/{createdSlug}/book
                </code>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => router.push(`/o/${createdSlug}/admin`)}
                  className="bg-gray-900 text-white hover:bg-gray-800"
                >
                  Go to Admin Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/o/${createdSlug}/admin/members`)}
                >
                  Invite Members
                </Button>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {step < 4 && (
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canAdvance() || isPending}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                {isPending
                  ? "Creating..."
                  : step === 3
                    ? "Create Organization"
                    : "Next"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

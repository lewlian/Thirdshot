"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/user";

interface ProfileFormProps {
  defaultValues: {
    name: string;
    email: string;
    phone: string;
  };
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Profile updated successfully" });
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={defaultValues.email}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone}
          placeholder="+65 XXXX XXXX"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-green-600"}`}>
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

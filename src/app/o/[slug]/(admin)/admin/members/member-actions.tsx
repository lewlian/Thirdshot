"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  updateMemberRole,
  updateMemberTier,
  suspendMember,
  activateMember,
  removeMember,
} from "@/lib/actions/members";
import type { OrgRole } from "@/lib/permissions";
import {
  Shield,
  UserMinus,
  Ban,
  CheckCircle,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";

interface MemberTier {
  id: string;
  name: string;
}

interface MemberActionsProps {
  orgId: string;
  memberId: string;
  memberName: string;
  currentRole: string;
  currentTierId: string | null;
  memberStatus: string;
  tiers: MemberTier[];
  isCurrentUser: boolean;
}

export function RoleSelect({
  orgId,
  memberId,
  currentRole,
}: {
  orgId: string;
  memberId: string;
  currentRole: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: string) => {
    if (newRole === currentRole) return;
    startTransition(async () => {
      const result = await updateMemberRole(orgId, memberId, newRole as OrgRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role updated");
      }
    });
  };

  return (
    <Select defaultValue={currentRole} onValueChange={handleRoleChange} disabled={isPending}>
      <SelectTrigger className="w-[120px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="owner">Owner</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="staff">Staff</SelectItem>
        <SelectItem value="member">Member</SelectItem>
        <SelectItem value="guest">Guest</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function TierSelect({
  orgId,
  memberId,
  currentTierId,
  tiers,
}: {
  orgId: string;
  memberId: string;
  currentTierId: string | null;
  tiers: MemberTier[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleTierChange = (value: string) => {
    const newTierId = value === "none" ? null : value;
    if (newTierId === currentTierId) return;
    startTransition(async () => {
      const result = await updateMemberTier(orgId, memberId, newTierId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Tier updated");
      }
    });
  };

  return (
    <Select
      defaultValue={currentTierId || "none"}
      onValueChange={handleTierChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[130px] h-8 text-xs">
        <SelectValue placeholder="No tier" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No tier</SelectItem>
        {tiers.map((tier) => (
          <SelectItem key={tier.id} value={tier.id}>
            {tier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MemberActions({
  orgId,
  memberId,
  memberName,
  currentRole,
  memberStatus,
  isCurrentUser,
}: MemberActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const isOwner = currentRole === "owner";
  const isSuspended = memberStatus === "suspended";
  const canManage = !isOwner && !isCurrentUser;

  const handleSuspendToggle = () => {
    startTransition(async () => {
      const result = isSuspended
        ? await activateMember(orgId, memberId)
        : await suspendMember(orgId, memberId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isSuspended ? "Member activated" : "Member suspended");
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeMember(orgId, memberId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member removed");
        setShowRemoveDialog(false);
      }
    });
  };

  if (!canManage) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSuspendToggle}
        disabled={isPending}
        className="h-8 px-2"
        title={isSuspended ? "Activate member" : "Suspend member"}
      >
        {isSuspended ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <Ban className="h-4 w-4 text-amber-600" />
        )}
      </Button>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            title="Remove member"
            disabled={isPending}
          >
            <UserMinus className="h-4 w-4 text-red-600" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberName}</strong> from
              this organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isPending}
            >
              {isPending ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          Active
        </Badge>
      );
    case "suspended":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
          Suspended
        </Badge>
      );
    case "invited":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          Invited
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
          Expired
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}

export function InviteMemberForm({
  orgId,
  tiers,
}: {
  orgId: string;
  tiers: MemberTier[];
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const { inviteMember } = await import("@/lib/actions/members");
      const result = await inviteMember(orgId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member added successfully");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Shield className="h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add an existing user to this organization by their email address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="invite-email">
              Email Address
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="invite-role">
              Role
            </label>
            <Select name="role" defaultValue="member">
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tiers.length > 0 && (
            <div>
              <label className="text-sm font-medium" htmlFor="invite-tier">
                Membership Tier (optional)
              </label>
              <Select name="tierId" defaultValue="">
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No tier</SelectItem>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

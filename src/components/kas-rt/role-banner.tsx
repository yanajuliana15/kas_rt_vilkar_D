"use client";

import { Shield, ShieldCheck, Eye, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export function RoleBanner() {
  const { role, isSuperadmin, isAdmin, isGuest } = useAuth();

  if (role === "loading") return null;

  if (isSuperadmin) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-200 dark:border-purple-800 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="rounded-full bg-purple-500 p-1">
            <ShieldCheck className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-purple-700 dark:text-purple-300">Mode Superadmin</span>
          <span className="text-muted-foreground hidden sm:inline">— akses penuh ke semua menu & pengaturan</span>
        </div>
        <Badge className="bg-purple-500 hover:bg-purple-600 gap-1">
          <ShieldCheck className="h-3 w-3" /> Superadmin
        </Badge>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="rounded-full bg-violet-500 p-1">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-violet-700 dark:text-violet-300">Mode Admin</span>
          <span className="text-muted-foreground hidden sm:inline">— bisa input & kelola data</span>
        </div>
        <Badge className="bg-violet-500 hover:bg-violet-600 gap-1">
          <Shield className="h-3 w-3" /> Admin
        </Badge>
      </div>
    );
  }

  // Guest / warga
  return (
    <div className="rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <div className="rounded-full bg-amber-500 p-1">
          <Eye className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-amber-700 dark:text-amber-300">Mode Warga (Read-Only)</span>
        <span className="text-muted-foreground hidden sm:inline">— lihat data terbatas. Login untuk input data.</span>
      </div>
      <Badge variant="outline" className="border-amber-400 text-amber-600 gap-1">
        <Lock className="h-3 w-3" /> Read-Only
      </Badge>
    </div>
  );
}

export function ReadOnlyBadge({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) return null;
  return (
    <Badge variant="outline" className="border-amber-400 text-amber-600 gap-1 text-xs">
      <Lock className="h-3 w-3" /> Read-Only
    </Badge>
  );
}

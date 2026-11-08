import React from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail = "";
  let userName = "Restaurant Staff";
  let restaurantName = "Restaurant";
  let restaurantSlug = "";

  const isConfigured = isSupabaseServerConfigured();

  if (isConfigured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userEmail = user.email || userEmail;
        userName = user.user_metadata?.full_name || userName;

        // Fetch user's restaurant
        const { data: member } = await supabase
          .from("restaurant_members")
          .select("restaurant:restaurants(*)")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (member && member.restaurant) {
          const rest = member.restaurant as unknown as { name?: string; slug?: string };
          restaurantName = rest.name || restaurantName;
          restaurantSlug = rest.slug || restaurantSlug;
        }
      }
    } catch (e) {
      console.warn("Failed fetching dashboard user info:", e);
    }
  }

  return (
    <div className="flex min-h-screen bg-charcoal text-cream">
      {/* Sidebar */}
      <DashboardSidebar
        restaurantName={restaurantName}
        restaurantSlug={restaurantSlug}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <DashboardHeader
          userEmail={userEmail}
          userName={userName}
          restaurantName={restaurantName}
          restaurantSlug={restaurantSlug}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

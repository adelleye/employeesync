"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useActiveCompany } from "@/components/providers/ActiveCompanyProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

interface ItemAlertPayload {
  id: string;
  item_id: string;
  company_id: string;
  message: string | null;
  triggering_qty: number;
  reorder_point_at_trigger: number;
  created_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
}

export default function LowStockAlertBanner() {
  const { activeCompany } = useActiveCompany();
  const [alerts, setAlerts] = useState<ItemAlertPayload[]>([]);
  const supabase = createSupabaseBrowserClient();

  const fetchInitialAlerts = useCallback(
    async (companyId: string) => {
      const { data, error } = await supabase
        .from("item_alerts")
        .select("*")
        .eq("company_id", companyId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching initial low stock alerts:", error);
        toast.error("Failed to fetch initial low stock alerts.");
      } else if (data) {
        setAlerts(data as ItemAlertPayload[]);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (activeCompany?.id) {
      fetchInitialAlerts(activeCompany.id);
    } else {
      setAlerts([]); // Clear alerts if no active company
    }
  }, [activeCompany?.id, fetchInitialAlerts]);

  useEffect(() => {
    if (!activeCompany?.id) {
      return;
    }

    const channel = supabase
      .channel(`low_stock_alerts_for_company_${activeCompany.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "item_alerts",
          filter: `company_id=eq.${activeCompany.id}`,
        },
        (payload) => {
          console.log("New low stock alert received:", payload);
          const newAlert = payload.new as ItemAlertPayload;
          if (!newAlert.resolved_at) {
            setAlerts((prevAlerts) => {
              // Avoid duplicates if multiple subscriptions fire closely
              if (prevAlerts.some((a) => a.id === newAlert.id))
                return prevAlerts;
              return [newAlert, ...prevAlerts].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "item_alerts",
          filter: `company_id=eq.${activeCompany.id}`,
        },
        (payload) => {
          console.log("Low stock alert updated:", payload);
          const updatedAlert = payload.new as ItemAlertPayload;
          setAlerts((prevAlerts) =>
            prevAlerts
              .map((alert) =>
                alert.id === updatedAlert.id ? updatedAlert : alert
              )
              .filter((alert) => !alert.resolved_at)
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
          );
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(
            `Subscribed to low_stock_alerts for company ${activeCompany.id}`
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            `Realtime channel error for company ${activeCompany.id}:`,
            err
          );
          toast.error("Realtime connection error for stock alerts.");
        } else if (status === "TIMED_OUT") {
          console.warn(
            `Realtime channel timed out for company ${activeCompany.id}`
          );
          toast.warning("Realtime connection for stock alerts timed out.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompany?.id, supabase]);

  const dismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    // Optionally, you could also call a server action here to mark the alert as 'acknowledged_at'
    // For example: acknowledgeAlertAction(alertId);
  };

  if (!alerts.length || !activeCompany) {
    return null;
  }

  // For MVP, show a dismissible banner for each active alert, up to a max of 3 for screen space
  const alertsToShow = alerts.slice(0, 3);

  return (
    <div className="fixed bottom-4 right-4 w-full max-w-sm z-50 space-y-2">
      {alertsToShow.map((alert) => (
        <Alert key={alert.id} variant="destructive">
          <AlertTitle>Low Stock Alert!</AlertTitle>
          <AlertDescription>
            {alert.message || `Item (ID: ${alert.item_id}) is low on stock.`}
            <br />
            Qty: {alert.triggering_qty}, Reorder Point:{" "}
            {alert.reorder_point_at_trigger}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismissAlert(alert.id)}
            className="absolute top-1 right-1 p-1 h-auto"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}

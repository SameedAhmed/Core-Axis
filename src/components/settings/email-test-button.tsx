"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MailCheck, Loader2 } from "lucide-react";
import { sendTestEmail } from "@/lib/actions/mail-test";

export function EmailTestButton() {
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    const result = await sendTestEmail();
    if (result.success) {
      toast.success("Test email sent successfully! Check your inbox.");
    } else {
      toast.error(`SMTP Connection Failed: ${result.error || "Unknown error"}`);
    }
    setLoading(false);
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleTest} 
      disabled={loading}
      className="gap-2 font-medium"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MailCheck className="w-4 h-4 text-indigo-500" />
      )}
      Send Test Email
    </Button>
  );
}

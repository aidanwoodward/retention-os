"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExecutivePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the dashboard for now (REDHomePage)
    router.push("/dashboard");
  }, [router]);

  return null;
}


import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cantinho do Açaí — Gestão" },
      { name: "description", content: "Sistema de gestão premium para açaiterias: PDV, financeiro e fiados." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
      setShow(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return show ? <SplashScreen /> : null;
}

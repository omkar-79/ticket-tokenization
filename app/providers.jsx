"use client";

import { MotionConfig } from "framer-motion";
import { ToastProvider } from "./components/ui/ToastHost.jsx";

export default function Providers({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}

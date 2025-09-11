// src/hooks/useToast.ts
import { useState } from "react";

export function useToast() {
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<
    "success" | "danger" | "warning"
  >("success");
  const [showToast, setShowToast] = useState(false);

  const showNotification = (
    message: string,
    variant: "success" | "danger" | "warning" = "success"
  ) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  return {
    toastMessage,
    toastVariant,
    showToast,
    setShowToast,
    showNotification,
  };
}

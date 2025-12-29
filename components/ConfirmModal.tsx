import { useEffect, useState } from "react";
import { showAlert } from "../toast-system";

export type ConfirmModalType = "info" | "warning";

interface ConfirmModalProps {
  open: boolean;
  type?: ConfirmModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  closeOnBackdrop?: boolean;
}

const ConfirmModal = ({
  open,
  type = "info",
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  closeOnBackdrop = true
}: ConfirmModalProps) => {
  const [loading, setLoading] = useState(false);
  const isWarning = type === "warning";

  useEffect(() => {
    if (!open) return;

    const showSweetAlert = async () => {
      try {
        const result = await showAlert({
          title: title,
          text: message,
          icon: isWarning ? 'warning' : 'question',
          confirmButtonText: confirmText,
          cancelButtonText: cancelText,
          showCancelButton: true
        });

        if (result.isConfirmed) {
          setLoading(true);
          await onConfirm();
          // SweetAlert handles the success display
        }
      } catch (error) {
        console.error('Confirm action failed:', error);
      } finally {
        setLoading(false);
        onCancel(); // Always close the modal
      }
    };

    showSweetAlert();
  }, [open, title, message, isWarning, confirmText, cancelText, onConfirm, onCancel]);

  // This component now uses SweetAlert2, so it doesn't render anything
  return null;
};

export default ConfirmModal;

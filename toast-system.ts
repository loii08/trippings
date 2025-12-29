// SweetAlert2 notification system
import Swal from 'sweetalert2';

// Toast notifications using SweetAlert2
export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const toastConfig = {
    toast: true,
    position: 'top-end' as const,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast: any) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  };

  switch (type) {
    case 'success':
      Swal.fire({
        ...toastConfig,
        icon: 'success',
        title: 'Success!',
        text: message,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff'
      });
      break;
    case 'error':
      Swal.fire({
        ...toastConfig,
        icon: 'error',
        title: 'Error!',
        text: message,
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: '#ffffff'
      });
      break;
    case 'warning':
      Swal.fire({
        ...toastConfig,
        icon: 'warning',
        title: 'Warning!',
        text: message,
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        color: '#ffffff'
      });
      break;
    case 'info':
    default:
      Swal.fire({
        ...toastConfig,
        icon: 'info',
        title: 'Info',
        text: message,
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        color: '#1f2937'
      });
      break;
  }
};

// Professional alerts for confirmations and important messages
export const showAlert = async (options: {
  title: string;
  text?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  showLoaderOnConfirm?: boolean;
  preConfirm?: () => Promise<any>;
}) => {
  return await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon || 'info',
    confirmButtonText: options.confirmButtonText || 'OK',
    cancelButtonText: options.cancelButtonText || 'Cancel',
    showCancelButton: options.showCancelButton || false,
    showLoaderOnConfirm: options.showLoaderOnConfirm || false,
    preConfirm: options.preConfirm,
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonColor: '#667eea',
    cancelButtonColor: '#6b7280',
    background: '#ffffff',
    color: '#1f2937',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    padding: '2rem'
  });
};

// Success notification with custom styling
export const showSuccess = (message: string) => {
  return showAlert({
    title: 'Success!',
    text: message,
    icon: 'success',
    confirmButtonText: 'Great!',
    showCancelButton: false
  });
};

// Error notification with custom styling
export const showError = (message: string) => {
  return showAlert({
    title: 'Error!',
    text: message,
    icon: 'error',
    confirmButtonText: 'OK',
    showCancelButton: false
  });
};

// Warning notification with custom styling
export const showWarning = (message: string) => {
  return showAlert({
    title: 'Warning!',
    text: message,
    icon: 'warning',
    confirmButtonText: 'Understood',
    showCancelButton: false
  });
};

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).showToast = showToast;
  (window as any).showAlert = showAlert;
  (window as any).showSuccess = showSuccess;
  (window as any).showError = showError;
  (window as any).showWarning = showWarning;
}

// Backward compatibility exports
export const getToasts = () => [];
export const subscribeToToasts = () => () => {};

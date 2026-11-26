export function showToast(message, type = "success") {
  const region = document.getElementById("toast-region");
  if (!region) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  region.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 300);
  }, 2600);
}

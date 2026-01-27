(() => {
  const trigger = document.querySelector("[data-account-trigger]");
  const modal = document.querySelector("[data-account-modal]");

  if (!trigger || !modal) return;

  const closeButtons = modal.querySelectorAll("[data-account-close]");

  const open = () => {
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    modal.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    modal.setAttribute("aria-hidden", "true");
  };

  trigger.addEventListener("click", open);
  closeButtons.forEach((button) => button.addEventListener("click", close));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      close();
    }
  });
})();

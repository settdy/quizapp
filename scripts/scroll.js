function initKeyboardScroll() {
  document.addEventListener("keydown", function (e) {
    const tag = e.target.tagName.toLowerCase();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      window.scrollBy({ top: 150, behavior: "smooth" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      window.scrollBy({ top: -150, behavior: "smooth" });
    }
  });
}

function initScrollHide() {
  const header = document.querySelector("header");
  if (!header) return;

  function checkMobile() {
    return window.innerWidth <= 768;
  }

  function handleScroll() {
    if (!checkMobile()) {
      header.classList.remove("scrolled");
      return;
    }
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }

  handleScroll();
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("resize", handleScroll);
}

initKeyboardScroll();
initScrollHide();

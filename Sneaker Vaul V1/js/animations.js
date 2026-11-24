
// =========================
// PAGE ANIMATIONS
// =========================

const animatedElements = document.querySelectorAll(
    ".section-heading, " +
    ".collection-stats, " +
    ".about, " +
    ".product-specifications, " +
    ".availability-section"
);

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;


if ("IntersectionObserver" in window && !reducedMotion) {

    const observer = new IntersectionObserver(

        function (entries) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    entry.target.classList.add("revealed");

                    observer.unobserve(entry.target);
                }
            });
        },

        {
            threshold: 0.12
        }
    );


    animatedElements.forEach(function (element) {

        element.classList.add("reveal-pending");

        observer.observe(element);
    });
}

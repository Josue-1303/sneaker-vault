
// ========================================
// SNEAKER VAULT
// V0.5.3 - AUTOPLAY CONTROL FIX
// ========================================

(function () {

    "use strict";

    const get = id => document.getElementById(id);

    const hero = get("hero");
    const stage = get("vault-stage");
    const imageLayer = get("vault-image-layer");
    const dotsContainer = get("vault-dots");

    if (!hero || !stage || !imageLayer || !dotsContainer) {
        return;
    }


    // ========================================
    // SETTINGS
    // ========================================

    const settings = {
        autoplayDuration: 8000,
        textTransitionDuration: 750,
        swipeDistance: 45,
        startWithCinematicImage: true
    };


    // ========================================
    // APPLICATION STATE
    // ========================================

    let sneakers = [];
    let currentIndex = 0;

    let autoplayTimer = null;
    let imageRequest = 0;

    let isHovered = false;
    let hasFocus = false;
    let heroVisible = true;

    let touchStartX = null;
    let touchStartY = null;

    let textAnimation = null;

    // Explicit Play takes priority over hover and focus
    let manualPlayOverride = false;

    const dots = [];
    const imageCache = new Map();

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let autoplayEnabled = !reducedMotion.matches;


    // ========================================
    // DOM ELEMENTS
    // ========================================

    const previousButton = get("vault-previous");
    const nextButton = get("vault-next");
    const autoplayButton = get("vault-autoplay");
    const discoverButton = get("vault-discover");

    const placeholder = get("vault-placeholder");
    const copy = get("vault-hero-copy");


    // ========================================
    // HELPERS
    // ========================================

    function setText(id, value) {

        const element = get(id);

        if (element) {
            element.textContent = value;
        }
    }


    function formatNumber(value) {

        return String(value).padStart(2, "0");
    }


    function normalizeIndex(index) {

        return (
            (index % sneakers.length) +
            sneakers.length
        ) % sneakers.length;
    }


    function getCounter(index) {

        return (
            formatNumber(index + 1) +
            " / " +
            formatNumber(sneakers.length)
        );
    }


    // ========================================
    // IMAGE LOADING
    // ========================================

    function loadImage(source) {

        if (imageCache.has(source)) {
            return imageCache.get(source);
        }

        const promise = new Promise(function (resolve) {

            const image = new Image();

            image.decoding = "async";
            image.draggable = false;

            image.onload = function () {
                resolve(image);
            };

            image.onerror = function () {
                resolve(null);
            };

            image.src = source;

        });

        imageCache.set(source, promise);

        return promise;
    }


    // ========================================
    // SELECT BEST AVAILABLE PHOTOGRAPH
    // ========================================

    function getImageCandidates(sneaker) {

        const candidates = [];

        // Cinematic editorial artwork

        if (sneaker.cinematicImage) {

            candidates.push({
                source: sneaker.cinematicImage,
                type: "cinematic"
            });
        }


        // Perspective photograph

        if (Array.isArray(sneaker.gallery)) {

            const perspective = sneaker.gallery.find(
                item => item.label === "Perspective"
            );

            if (perspective && perspective.src) {

                candidates.push({
                    source: perspective.src,
                    type: "product"
                });
            }
        }


        // Standard product photograph

        if (sneaker.image) {

            candidates.push({
                source: sneaker.image,
                type: "product"
            });
        }

        return candidates;
    }


    // ========================================
    // DISPLAY PHOTOGRAPH
    // ========================================

    async function displayImage(sneaker) {

        const request = ++imageRequest;

        imageLayer.replaceChildren();

        placeholder.hidden = false;

        setText(
            "vault-placeholder-brand",
            sneaker.brand.toUpperCase()
        );

        setText(
            "vault-placeholder-model",
            sneaker.model.toUpperCase()
        );

        setText(
            "vault-placeholder-message",
            "LOADING ARTWORK"
        );

        setText(
            "vault-stage-type",
            "THE PERSONAL ARCHIVE"
        );

        const candidates = getImageCandidates(sneaker);


        for (const candidate of candidates) {

            const image = await loadImage(
                candidate.source
            );


            // Prevent outdated image requests

            if (request !== imageRequest) {
                return;
            }

            if (!image) {
                continue;
            }


            image.className =
                "vault-slide-image " +
                (
                    candidate.type === "cinematic"
                    ? "is-cinematic"
                    : "is-product"
                );


            if (candidate.type === "cinematic") {

                image.alt =
                    "AI-generated editorial artwork inspired by " +
                    sneaker.brand + " " +
                    sneaker.model + " " +
                    sneaker.colorway;

                setText(
                    "vault-stage-type",
                    "AI-GENERATED EDITORIAL"
                );

            } else {

                image.alt =
                    sneaker.brand + " " +
                    sneaker.model + " " +
                    sneaker.colorway;

                setText(
                    "vault-stage-type",
                    "PRODUCT PHOTOGRAPH"
                );
            }

            placeholder.hidden = true;

            imageLayer.replaceChildren(image);

            return;
        }


        // Missing image fallback

        if (request === imageRequest) {

            setText(
                "vault-placeholder-message",
                "PHOTOGRAPHY COMING SOON"
            );

            setText(
                "vault-stage-type",
                "ARTWORK PENDING"
            );
        }
    }


    // ========================================
    // EDITORIAL TEXT TRANSITION
    // ========================================

    function animateText() {

        if (textAnimation) {
            textAnimation.cancel();
        }

        if (
            reducedMotion.matches ||
            !copy ||
            typeof copy.animate !== "function"
        ) {
            return;
        }

        textAnimation = copy.animate(

            [
                {
                    opacity: 0.15,
                    transform: "translateY(18px)"
                },
                {
                    opacity: 1,
                    transform: "translateY(0)"
                }
            ],

            {
                duration: settings.textTransitionDuration,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)"
            }
        );
    }


    // ========================================
    // CAROUSEL INDICATORS
    // ========================================

    function updateDots() {

        dots.forEach(function (dot, index) {

            if (index === currentIndex) {

                dot.setAttribute(
                    "aria-current",
                    "true"
                );

            } else {

                dot.removeAttribute("aria-current");
            }
        });
    }


    function createDots() {

        dotsContainer.replaceChildren();

        dots.length = 0;

        sneakers.forEach(function (sneaker, index) {

            const dot = document.createElement(
                "button"
            );

            dot.type = "button";
            dot.className = "vault-carousel-dot";

            dot.setAttribute(
                "aria-label",
                "Show " +
                sneaker.brand + " " +
                sneaker.model + " " +
                sneaker.colorway
            );

            dot.title = sneaker.colorway;

            dot.addEventListener("click", function () {

                manualPlayOverride = false;

                showSlide(index, true);

                scheduleAutoplay();
            });

            dots.push(dot);

            dotsContainer.appendChild(dot);
        });
    }


    // ========================================
    // DISPLAY SELECTED PRODUCT
    // ========================================

    function showSlide(index, announce = false) {

        if (sneakers.length === 0) {
            return;
        }

        currentIndex = normalizeIndex(index);

        const sneaker = sneakers[currentIndex];

        const counter = getCounter(currentIndex);


        // Background theme

        hero.style.setProperty(
            "--vault-theme",
            sneaker.theme || "#614536"
        );


        // Background typography

        setText(
            "vault-watermark",
            sneaker.model.toUpperCase()
        );


        // Product information

        setText(
            "vault-model",
            sneaker.brand + " " + sneaker.model
        );

        setText(
            "vault-colorway",
            sneaker.colorway + "."
        );

        setText(
            "vault-description",
            sneaker.homeDescription ||
            sneaker.description ||
            "Part of the Sneaker Vault archive. " +
            "Explore the color, form and individual " +
            "character of this selected pair."
        );


        // Counters

        setText(
            "vault-top-counter",
            counter
        );

        setText(
            "vault-bottom-counter",
            "ARCHIVE " + counter
        );

        setText(
            "vault-stage-reference",
            "SNEAKER VAULT / " +
            formatNumber(currentIndex + 1)
        );


        // Photography captions

        setText(
            "vault-caption-model",
            sneaker.brand + " / " + sneaker.model
        );

        setText(
            "vault-caption-colorway",
            sneaker.colorway
        );


        // Product link

        discoverButton.href =
            "product.html?id=" +
            encodeURIComponent(sneaker.id);

        discoverButton.setAttribute(
            "aria-label",
            "Discover " +
            sneaker.brand + " " +
            sneaker.model + " " +
            sneaker.colorway
        );


        // Refresh content

        updateDots();

        animateText();

        displayImage(sneaker);


        // Accessibility announcements

        if (announce) {

            setText(
                "vault-announcement",
                sneaker.brand + " " +
                sneaker.model + " " +
                sneaker.colorway + ". " +
                counter
            );
        }
    }


    // ========================================
    // SLIDE NAVIGATION
    // ========================================

    function nextSlide(announce = true) {

        if (announce) {
            manualPlayOverride = false;
        }

        showSlide(
            currentIndex + 1,
            announce
        );

        scheduleAutoplay();
    }


    function previousSlide() {

        manualPlayOverride = false;

        showSlide(
            currentIndex - 1,
            true
        );

        scheduleAutoplay();
    }


    // ========================================
    // AUTOPLAY SYSTEM - FIXED
    // ========================================

    function stopAutoplayTimer() {

        if (autoplayTimer !== null) {

            clearTimeout(autoplayTimer);

            autoplayTimer = null;
        }
    }


    function canAutoplay() {

        // Permanent or environmental restrictions

        if (
            !autoplayEnabled ||
            document.hidden ||
            !heroVisible ||
            sneakers.length < 2
        ) {
            return false;
        }


        // Explicit Play bypasses temporary pauses

        if (manualPlayOverride) {
            return true;
        }


        // Temporary interaction pause

        if (isHovered || hasFocus) {
            return false;
        }

        return true;
    }


    function scheduleAutoplay() {

        stopAutoplayTimer();

        if (!canAutoplay()) {
            return;
        }

        autoplayTimer = setTimeout(function () {

            autoplayTimer = null;

            // Verify state before changing slide

            if (canAutoplay()) {

                nextSlide(false);
            }

        }, settings.autoplayDuration);
    }


    function updateAutoplayButton() {

        autoplayButton.textContent =
            autoplayEnabled
            ? "Pause"
            : "Play";

        autoplayButton.setAttribute(
            "aria-label",
            autoplayEnabled
            ? "Pause automatic slideshow"
            : "Start automatic slideshow"
        );
    }


    function toggleAutoplay() {

        if (autoplayEnabled) {

            // Explicit Pause

            autoplayEnabled = false;

            manualPlayOverride = false;

            stopAutoplayTimer();

            console.log(
                "Homepage autoplay paused."
            );

        } else {

            // Explicit Play

            autoplayEnabled = true;

            manualPlayOverride = true;

            scheduleAutoplay();

            console.log(
                "Homepage autoplay started."
            );
        }

        updateAutoplayButton();
    }


    // ========================================
    // KEYBOARD NAVIGATION
    // ========================================

    function initializeKeyboard() {

        hero.addEventListener("keydown", function (event) {

            if (
                event.altKey ||
                event.ctrlKey ||
                event.metaKey
            ) {
                return;
            }

            if (event.key === "ArrowLeft") {

                event.preventDefault();

                previousSlide();
            }

            if (event.key === "ArrowRight") {

                event.preventDefault();

                nextSlide();
            }
        });
    }


    // ========================================
    // MOBILE SWIPE NAVIGATION
    // ========================================

    function initializeTouch() {

        stage.addEventListener(
            "touchstart",

            function (event) {

                if (event.touches.length !== 1) {

                    touchStartX = null;
                    touchStartY = null;

                    return;
                }

                const touch = event.touches[0];

                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            },

            { passive: true }
        );


        stage.addEventListener(
            "touchend",

            function (event) {

                if (
                    touchStartX === null ||
                    touchStartY === null
                ) {
                    return;
                }

                const touch = event.changedTouches[0];

                const distanceX =
                    touch.clientX - touchStartX;

                const distanceY =
                    touch.clientY - touchStartY;

                touchStartX = null;
                touchStartY = null;


                // Preserve vertical scrolling

                if (
                    Math.abs(distanceX) <
                        settings.swipeDistance ||

                    Math.abs(distanceX) <=
                        Math.abs(distanceY) * 1.3
                ) {
                    return;
                }

                if (distanceX < 0) {

                    nextSlide();

                } else {

                    previousSlide();
                }
            },

            { passive: true }
        );


        stage.addEventListener(
            "touchcancel",

            function () {

                touchStartX = null;
                touchStartY = null;
            }
        );
    }


    // ========================================
    // AUTOPLAY INTERACTION EVENTS - FIXED
    // ========================================

    function initializeAutoplayEvents() {

        // Pause on new mouse interaction

        hero.addEventListener(
            "pointerenter",

            function (event) {

                if (event.pointerType === "mouse") {

                    isHovered = true;

                    manualPlayOverride = false;

                    scheduleAutoplay();
                }
            }
        );


        hero.addEventListener(
            "pointerleave",

            function (event) {

                if (event.pointerType === "mouse") {

                    isHovered = false;

                    if (!hasFocus) {
                        manualPlayOverride = false;
                    }

                    scheduleAutoplay();
                }
            }
        );


        // Pause when a control receives focus

        hero.addEventListener(
            "focusin",

            function () {

                hasFocus = true;

                manualPlayOverride = false;

                scheduleAutoplay();
            }
        );


        hero.addEventListener(
            "focusout",

            function (event) {

                if (!hero.contains(event.relatedTarget)) {

                    hasFocus = false;

                    if (!isHovered) {
                        manualPlayOverride = false;
                    }

                    scheduleAutoplay();
                }
            }
        );


        // Pause when browser tab is hidden

        document.addEventListener(
            "visibilitychange",
            scheduleAutoplay
        );


        // Handle browser accessibility preferences

        reducedMotion.addEventListener(
            "change",

            function () {

                if (reducedMotion.matches) {

                    autoplayEnabled = false;

                    manualPlayOverride = false;

                    if (textAnimation) {
                        textAnimation.cancel();
                    }
                }

                updateAutoplayButton();

                scheduleAutoplay();
            }
        );


        // Pause outside the viewport

        if ("IntersectionObserver" in window) {

            const observer = new IntersectionObserver(

                function (entries) {

                    entries.forEach(function (entry) {

                        heroVisible = entry.isIntersecting;

                        scheduleAutoplay();
                    });
                },

                { threshold: 0.2 }
            );

            observer.observe(hero);
        }
    }


    // ========================================
    // INITIALIZE CONTROLS
    // ========================================

    function initializeControls() {

        previousButton.disabled =
            sneakers.length < 2;

        nextButton.disabled =
            sneakers.length < 2;

        autoplayButton.disabled =
            sneakers.length < 2;


        previousButton.addEventListener(
            "click",
            previousSlide
        );


        nextButton.addEventListener(
            "click",

            function () {

                nextSlide();
            }
        );


        autoplayButton.addEventListener(
            "click",
            toggleAutoplay
        );


        updateAutoplayButton();

        initializeKeyboard();

        initializeTouch();

        initializeAutoplayEvents();
    }


    // ========================================
    // INITIALIZE DYNAMIC HOMEPAGE
    // ========================================

    async function initializeHomepage() {

        try {

            sneakers = await loadSneakers();

            if (
                !Array.isArray(sneakers) ||
                sneakers.length === 0
            ) {

                throw new Error(
                    "No sneakers found."
                );
            }

            createDots();

            initializeControls();


            // Select first cinematic product

            let initialIndex = 0;

            if (settings.startWithCinematicImage) {

                const cinematicIndex = sneakers.findIndex(

                    sneaker => Boolean(
                        sneaker.cinematicImage
                    )
                );

                if (cinematicIndex !== -1) {

                    initialIndex = cinematicIndex;
                }
            }


            showSlide(initialIndex);

            scheduleAutoplay();


            console.log(
                "Sneaker Vault - Dynamic Homepage V0.5.3"
            );

            console.log(
                "Homepage carousel initialized:",
                sneakers.length,
                "products"
            );

        } catch (error) {

            setText(
                "vault-placeholder-message",
                "COLLECTION CURRENTLY UNAVAILABLE"
            );

            console.error(
                "Homepage initialization failed:",
                error
            );
        }
    }


    // ========================================
    // START APPLICATION
    // ========================================

    initializeHomepage();

})();

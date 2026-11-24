
// ========================================
// SNEAKER VAULT
// V0.4.8 - CINEMATIC SCROLL ENHANCEMENT
// ========================================

(function () {

    "use strict";

    const get = id => document.getElementById(id);

    const section = get("cinematic-section");
    const frame = get("cinematic-frame");
    const image = get("cinematic-image");

    if (!section || !frame || !image) {
        return;
    }


    // ========================================
    // ANIMATION SETTINGS
    // ========================================

    const settings = {
    desktopStartScale: 0.95,
    desktopEndScale: 1.29,
    mobileStartScale: 0.96,
    mobileEndScale: 1,
    revealDuration: 3000,
    textDuration: 1000,
    mobileBreakpoint: 768
    };

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let animationFrame = null;

    const entranceAnimations = [];


    // ========================================
    // HELPERS
    // ========================================

    function setText(id, value) {

        const element = get(id);

        if (element) {
            element.textContent = value;
        }
    }

    function number(value) {

        return String(value).padStart(2, "0");
    }

    function clamp(value, minimum, maximum) {

        return Math.min(
            maximum,
            Math.max(minimum, value)
        );
    }


    // ========================================
    // SCROLL-BASED ZOOM
    // ========================================

    function updateScrollAnimation() {

        animationFrame = null;

        if (section.hidden) {
            return;
        }

        if (reducedMotion.matches) {

            image.style.transform = "scale(1)";

            frame.classList.remove(
                "is-scroll-active"
            );

            return;
        }

        const bounds =
            frame.getBoundingClientRect();

        const viewportHeight =
            window.innerHeight;

        const mobile =

            window.innerWidth <=
            settings.mobileBreakpoint;


        // Calculate position relative to viewport

        const startPosition =
            viewportHeight;

        const endPosition =
            viewportHeight * 0.12;


        // Calculate scroll progress from 0 to 1

        const progress = clamp(

            (startPosition - bounds.top) /

            (startPosition - endPosition),

            0,

            1

        );


        // Select desktop or mobile settings

        const startScale = mobile

            ? settings.mobileStartScale

            : settings.desktopStartScale;


        const endScale = mobile

            ? settings.mobileEndScale

            : settings.desktopEndScale;


        // Connect zoom directly to scrolling

        const scale =

            startScale +

            (endScale - startScale) *

            progress;


        image.style.transform =

            "scale(" + scale.toFixed(4) + ")";


        // Optimize rendering while visible

        const visible =

            bounds.bottom > 0 &&

            bounds.top < viewportHeight;


        frame.classList.toggle(

            "is-scroll-active",

            visible

        );
    }


    function requestScrollUpdate() {

        if (animationFrame !== null) {
            return;
        }

        animationFrame = requestAnimationFrame(

            updateScrollAnimation

        );
    }


    // ========================================
    // TEXT REVEAL
    // ========================================

    function revealHeading(heading) {

        if (

            reducedMotion.matches ||

            typeof heading.animate !== "function"

        ) {
            return;
        }


        const animation = heading.animate(

            [

                {
                    opacity: 0,
                    transform: "translateY(35px)"
                },

                {
                    opacity: 1,
                    transform: "translateY(0)"
                }

            ],

            {

                duration: settings.textDuration,

                easing: "cubic-bezier(0.22, 1, 0.36, 1)"

            }

        );

        entranceAnimations.push(animation);
    }


    // ========================================
    // CINEMATIC IMAGE REVEAL
    // ========================================

    function revealImage() {

        if (

            reducedMotion.matches ||

            typeof frame.animate !== "function"

        ) {
            return;
        }


        const animation = frame.animate(

            [

                {

                    opacity: 0.15,

                    clipPath: "inset(10% 7% 10% 7%)"

                },

                {

                    opacity: 1,

                    clipPath: "inset(0% 0% 0% 0%)"

                }

            ],

            {

                duration: settings.revealDuration,

                easing: "cubic-bezier(0.22, 1, 0.36, 1)"

            }

        );

        entranceAnimations.push(animation);

        console.log("Cinematic image reveal started.");
    }


    // ========================================
    // DETECT WHEN ELEMENTS ENTER VIEWPORT
    // ========================================

    function initializeReveal() {

        if (!("IntersectionObserver" in window)) {
            return;
        }

        const heading = section.querySelector(
            ".cinematic-heading"
        );


        const observer = new IntersectionObserver(

            function (entries) {

                entries.forEach(function (entry) {

                    if (!entry.isIntersecting) {
                        return;
                    }


                    if (entry.target === heading) {

                        revealHeading(heading);
                    }


                    if (entry.target === frame) {

                        revealImage();
                    }


                    // Play entrance only once

                    observer.unobserve(entry.target);

                });

            },

            {

                threshold: 0.10

            }

        );


        if (heading) {

            observer.observe(heading);
        }

        observer.observe(frame);
    }


    // ========================================
    // INITIALIZE SCROLL EVENTS
    // ========================================

    function initializeScroll() {

        window.addEventListener(

            "scroll",

            requestScrollUpdate,

            { passive: true }

        );


        window.addEventListener(

            "resize",

            requestScrollUpdate

        );


        window.addEventListener(

            "pageshow",

            requestScrollUpdate

        );


        reducedMotion.addEventListener(

            "change",

            function () {

                if (reducedMotion.matches) {

                    entranceAnimations.forEach(

                        animation => animation.cancel()

                    );
                }

                requestScrollUpdate();

            }

        );


        requestScrollUpdate();
    }


    // ========================================
    // LOAD CINEMATIC IMAGE
    // ========================================

    function displayCinematicImage(sneaker) {

        image.addEventListener(

            "load",

            function () {

                if (

                    image.naturalWidth > 0 &&

                    image.naturalHeight > 0

                ) {

                    frame.style.aspectRatio =

                        image.naturalWidth +

                        " / " +

                        image.naturalHeight;
                }


                requestScrollUpdate();

                initializeReveal();


                console.log(

                    "Cinematic image loaded:",

                    sneaker.colorway

                );
            },

            { once: true }

        );


        image.addEventListener(

            "error",

            function () {

                section.hidden = true;

                console.warn(

                    "Cinematic image unavailable:",

                    sneaker.cinematicImage

                );
            },

            { once: true }

        );


        image.alt =

            "AI-generated editorial artwork inspired by " +

            sneaker.brand + " " +

            sneaker.model + " " +

            sneaker.colorway;


        section.hidden = false;

        initializeScroll();

        image.src = sneaker.cinematicImage;
    }


    // ========================================
    // INITIALIZE CINEMATIC EDITORIAL
    // ========================================

    async function initializeCinematic() {

        try {

            const parameters = new URLSearchParams(

                window.location.search

            );

            const productId = parameters.get("id");

            const sneakers = await loadSneakers();


            const index = sneakers.findIndex(

                sneaker => sneaker.id === productId

            );


            if (index === -1) {
                return;
            }


            const sneaker = sneakers[index];


            // Hide section if no image exists

            if (!sneaker.cinematicImage) {

                section.hidden = true;

                return;
            }


            // Editorial information

            setText(

                "cinematic-title",

                sneaker.cinematicTitle ||

                "Beyond the silhouette."

            );


            setText(

                "cinematic-description",

                sneaker.cinematicDescription ||

                "An editorial interpretation of color, form and texture. A familiar silhouette presented from a different perspective."

            );


            setText(

                "cinematic-colorway",

                sneaker.colorway + "."

            );


            setText(

                "cinematic-product-name",

                sneaker.brand + " / " +

                sneaker.model

            );


            setText(

                "cinematic-reference",

                "ARCHIVE " +

                number(index + 1) +

                " / " +

                number(sneakers.length)

            );


            // Individual theme

            section.style.setProperty(

                "--cinematic-color",

                sneaker.theme || "#614536"

            );


            // Load artwork

            displayCinematicImage(sneaker);


            console.log(

                "Sneaker Vault - Cinematic Scroll V0.4.8"

            );

        } catch (error) {

            section.hidden = true;

            console.warn(

                "Cinematic editorial unavailable:",

                error

            );
        }
    }


    // ========================================
    // START APPLICATION
    // ========================================

    initializeCinematic();

})();

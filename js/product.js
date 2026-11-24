
// ========================================
// SNEAKER VAULT
// PRODUCT EXPERIENCE V0.4.3
// ========================================

(function () {

    "use strict";

    console.log("Sneaker Vault - Product V0.4.3");

    const get = id => document.getElementById(id);

    const productId = new URLSearchParams(
        window.location.search
    ).get("id");

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const desktopPointer = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
    );

    const gsap = window.gsap || null;

    let currentSneaker = null;
    let gallery = [];
    let buttons = [];
    let selectedIndex = -1;
    let imageRequest = 0;
    let navigationLocked = false;

    const unavailableImages = new Set();


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

    function canAnimate() {
        return gsap && !reducedMotion.matches;
    }


    // ========================================
    // INITIALIZE PRODUCT
    // ========================================

    async function initializeProduct() {

        try {

            const sneakers = await loadSneakers();

            const index = sneakers.findIndex(
                item => item.id === productId
            );

            if (index === -1) {
                setText("product-name", "Product not found");
                setText("gallery-message", "NO PRODUCT SELECTED");
                return;
            }

            currentSneaker = sneakers[index];

            const sneaker = currentSneaker;

            document.title =
                sneaker.brand + " " +
                sneaker.model + " | " +
                sneaker.colorway;

            setText("product-brand", sneaker.brand);
            setText("product-name", sneaker.model);
            setText("product-colorway", sneaker.colorway);

            setText(
                "background-text",
                sneaker.model.toUpperCase()
            );

            setText(
                "product-description",
                sneaker.description ||
                "Part of the Sneaker Vault personal collection."
            );

            setText(
                "product-price",
                formatPrice(sneaker.price)
            );

            setText(
                "target-size",
                "EU " + sneaker.targetSize
            );

            setText("product-status", sneaker.status);

            setText(
                "archive-reference",
                "ARCHIVE / " + number(index + 1)
            );

            document.body.style.setProperty(
                "--product-color",
                sneaker.theme || "#614536"
            );

            // Specifications

            setText("spec-brand", sneaker.brand);
            setText("spec-model", sneaker.model);
            setText("spec-colorway", sneaker.colorway);

            setText(
                "spec-materials",
                sneaker.materials || "Not verified"
            );

            // Initialize core gallery first

            initializeGalleryControls();
            initializeGallery(sneaker);

            displayRetailers(sneaker);
            configureProductNavigation(sneakers, index);

            // Optional effects

            try {
                initializeInspector();
                initializeParallax();
                animateEntrance();
            } catch (error) {
                console.warn("Optional effect error:", error);
            }

            console.log("Product initialized:", sneaker.colorway);

        } catch (error) {

            console.error("Product initialization error:", error);

            setText(
                "product-name",
                "Unable to load product"
            );

            setText(
                "gallery-message",
                "PRODUCT COULD NOT BE LOADED"
            );
        }
    }


    // ========================================
    // INITIALIZE GALLERY
    // ========================================

    function initializeGallery(sneaker) {

        const thumbnails = get("product-thumbnails");

        thumbnails.replaceChildren();

        selectedIndex = -1;
        buttons = [];
        unavailableImages.clear();

        gallery = Array.isArray(sneaker.gallery)
            && sneaker.gallery.length > 0
            ? sneaker.gallery
            : [
                {
                    src: sneaker.image,
                    label: "Side Profile"
                }
            ];

        gallery.forEach(function (item, index) {

            const button = document.createElement("button");

            button.type = "button";
            button.className = "thumbnail-button";
            button.title = item.label;

            button.setAttribute("aria-label", item.label);
            button.setAttribute("aria-pressed", "false");

            const image = document.createElement("img");

            image.alt = item.label;
            image.loading = "lazy";

            image.addEventListener("error", function () {

                unavailableImages.add(index);
                button.disabled = true;

                updateGalleryControls();
            });

            image.src = item.src;

            button.appendChild(image);

            button.addEventListener("click", function () {
                showGalleryImage(index);
            });

            buttons.push(button);
            thumbnails.appendChild(button);
        });

        thumbnails.hidden = gallery.length <= 1;

        updateGalleryControls();
        showGalleryImage(0);
    }


    // ========================================
    // CHANGE MAIN IMAGE
    // ========================================

    function showGalleryImage(index) {

        if (index < 0 || index >= gallery.length) {
            return;
        }

        const request = ++imageRequest;

        if (index === selectedIndex) {
            return;
        }

        if (unavailableImages.has(index)) {
            if (selectedIndex === -1) {
                loadAlternativeImage();
            }
            return;
        }

        const item = gallery[index];

        const mainImage = get("product-image");
        const message = get("gallery-message");

        const nextImage = new Image();

        nextImage.onload = function () {

            if (request !== imageRequest) {
                return;
            }

            mainImage.src = item.src;

            mainImage.alt =
                currentSneaker.brand + " " +
                currentSneaker.model + " - " +
                item.label;

            mainImage.hidden = false;

            // Remove loading message

            message.hidden = true;

            // Update selected image

            selectedIndex = index;

            // Enable zoom

            get("zoom-button").disabled = false;

            // Update all controls

            updateGalleryControls();
            updateActiveThumbnail();
            animateGalleryImage();

            console.log(
                "Gallery:",
                number(index + 1) + " / " +
                number(gallery.length),
                item.label
            );
        };

        nextImage.onerror = function () {

            if (request !== imageRequest) {
                return;
            }

            unavailableImages.add(index);

            if (buttons[index]) {
                buttons[index].disabled = true;
            }

            if (selectedIndex === -1) {
                loadAlternativeImage();
            }

            updateGalleryControls();

            console.warn("Image unavailable:", item.src);
        };

        nextImage.src = item.src;
    }


    // ========================================
    // IMAGE FALLBACK
    // ========================================

    function loadAlternativeImage() {

        const index = gallery.findIndex(
            (item, i) => !unavailableImages.has(i)
        );

        if (index !== -1) {
            showGalleryImage(index);
            return;
        }

        get("product-image").hidden = true;
        get("gallery-message").hidden = false;
        get("zoom-button").disabled = true;

        setText(
            "gallery-message",
            "IMAGE COMING SOON"
        );

        updateGalleryControls();
    }


    // ========================================
    // PREVIOUS AND NEXT IMAGE
    // ========================================

    function findAdjacentImage(direction) {

        if (selectedIndex === -1) {
            return -1;
        }

        let index = selectedIndex + direction;

        while (index >= 0 && index < gallery.length) {

            if (!unavailableImages.has(index)) {
                return index;
            }

            index += direction;
        }

        return -1;
    }

    function moveGallery(direction) {

        const index = findAdjacentImage(direction);

        if (index !== -1) {
            showGalleryImage(index);
        }
    }


    // ========================================
    // UPDATE GALLERY CONTROLS
    // ========================================

    function updateGalleryControls() {

        const previous = get("previous-image");
        const next = get("next-image");
        const progress = get("gallery-progress-fill");

        if (selectedIndex === -1) {

            previous.disabled = true;
            next.disabled = true;

            progress.style.width = "0%";

            setText(
                "gallery-counter",
                "00 / " + number(gallery.length)
            );

            return;
        }

        previous.disabled =
            findAdjacentImage(-1) === -1;

        next.disabled =
            findAdjacentImage(1) === -1;

        setText(
            "gallery-counter",

            number(selectedIndex + 1) +
            " / " +
            number(gallery.length)
        );

        setText(
            "gallery-label",
            gallery[selectedIndex].label
        );

        progress.style.width =

            ((selectedIndex + 1) /
            gallery.length * 100) + "%";
    }


    // ========================================
    // ACTIVE THUMBNAIL
    // ========================================

    function updateActiveThumbnail() {

        buttons.forEach(function (button, index) {

            const active = index === selectedIndex;

            button.classList.toggle("active", active);

            button.setAttribute(
                "aria-pressed",
                String(active)
            );
        });

        const container = get("product-thumbnails");
        const active = buttons[selectedIndex];

        if (!active || container.hidden) {
            return;
        }

        const containerBounds =
            container.getBoundingClientRect();

        const buttonBounds =
            active.getBoundingClientRect();

        const position =
            container.scrollLeft +
            buttonBounds.left -
            containerBounds.left -
            (container.clientWidth -
            active.clientWidth) / 2;

        container.scrollTo({
            left: Math.max(0, position),
            behavior: reducedMotion.matches
                ? "auto"
                : "smooth"
        });
    }


    // ========================================
    // ARROWS, KEYBOARD AND MOBILE SWIPE
    // ========================================

    function initializeGalleryControls() {

        get("previous-image").addEventListener(
            "click",
            () => moveGallery(-1)
        );

        get("next-image").addEventListener(
            "click",
            () => moveGallery(1)
        );

        const stage = get("gallery-stage");

        stage.addEventListener("keydown", function (event) {

            if (event.target !== stage) {
                return;
            }

            if (event.key === "ArrowLeft") {

                event.preventDefault();
                moveGallery(-1);
            }

            if (event.key === "ArrowRight") {

                event.preventDefault();
                moveGallery(1);
            }
        });

        // Mobile swipe

        let startX = 0;
        let startY = 0;
        let activePointer = null;

        stage.addEventListener("pointerdown", function (event) {

            if (
                event.pointerType !== "touch" ||
                !event.isPrimary ||
                event.target.closest("button")
            ) {
                return;
            }

            activePointer = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;

            if (stage.setPointerCapture) {
                try {
                    stage.setPointerCapture(event.pointerId);
                } catch (error) {
                    console.debug(error);
                }
            }
        });

        stage.addEventListener("pointerup", function (event) {

            if (event.pointerId !== activePointer) {
                return;
            }

            const x = event.clientX - startX;
            const y = event.clientY - startY;

            activePointer = null;

            if (
                Math.abs(x) > 45 &&
                Math.abs(x) > Math.abs(y) * 1.3
            ) {
                moveGallery(x < 0 ? 1 : -1);
            }
        });

        stage.addEventListener("pointercancel", function () {
            activePointer = null;
        });
    }


    // ========================================
    // IMAGE ANIMATIONS
    // ========================================

    function animateGalleryImage() {

        if (reducedMotion.matches) {
            return;
        }

        const image = get("product-image");

        if (canAnimate()) {

            gsap.killTweensOf(image);

            gsap.fromTo(

                image,

                {
                    opacity: 0,
                    x: 18,
                    scale: 0.96
                },

                {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    duration: 0.55,
                    ease: "power3.out",
                    clearProps: "opacity,transform"
                }
            );

        } else if (typeof image.animate === "function") {

            image.getAnimations().forEach(
                animation => animation.cancel()
            );

            image.animate(
                [
                    {
                        opacity: 0,
                        transform: "translateX(12px) scale(0.97)"
                    },
                    {
                        opacity: 1,
                        transform: "translateX(0) scale(1)"
                    }
                ],
                {
                    duration: 450,
                    easing: "ease-out"
                }
            );
        }
    }

    function animateEntrance() {

        if (!canAnimate()) {
            return;
        }

        gsap.fromTo(
            ".product-information",
            {
                opacity: 0,
                y: 25
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: "power3.out",
                clearProps: "opacity,transform"
            }
        );
    }


    // ========================================
    // INTERACTIVE PARALLAX
    // ========================================

    function initializeParallax() {

        const stage = get("gallery-stage");
        const motion = get("product-motion");
        const showcase = get("product-showcase");

        function shouldMove(event) {

            return (
                event.pointerType === "mouse" &&
                desktopPointer.matches &&
                !reducedMotion.matches
            );
        }

        stage.addEventListener("pointermove", function (event) {

            if (!shouldMove(event)) {
                return;
            }

            const bounds = stage.getBoundingClientRect();

            const x =
                (event.clientX - bounds.left) /
                bounds.width - 0.5;

            const y =
                (event.clientY - bounds.top) /
                bounds.height - 0.5;

            if (canAnimate()) {

                gsap.to(motion, {
                    x: x * 24,
                    y: y * 18,
                    rotation: x * 4,
                    duration: 0.6,
                    ease: "power3.out",
                    overwrite: "auto"
                });

            } else {

                motion.style.transform =
                    "translate(" +
                    x * 24 + "px," +
                    y * 18 + "px) rotate(" +
                    x * 4 + "deg)";
            }
        });

        function resetPosition() {

            if (canAnimate()) {

                gsap.to(motion, {
                    x: 0,
                    y: 0,
                    rotation: 0,
                    duration: 0.6,
                    overwrite: "auto"
                });

            } else {

                if (gsap) {
                    gsap.killTweensOf(motion);
                    gsap.set(motion, {
                        clearProps: "transform"
                    });
                }

                motion.style.transform = "";
            }
        }

        stage.addEventListener(
            "pointerleave",
            resetPosition
        );

        showcase.addEventListener(
            "pointermove",
            function (event) {

                if (!shouldMove(event)) {
                    return;
                }

                const bounds =
                    showcase.getBoundingClientRect();

                const x =
                    (event.clientX - bounds.left) /
                    bounds.width - 0.5;

                const y =
                    (event.clientY - bounds.top) /
                    bounds.height - 0.5;

                showcase.style.setProperty(
                    "--light-x",
                    (35 + x * 35) + "%"
                );

                showcase.style.setProperty(
                    "--light-y",
                    (45 + y * 25) + "%"
                );
            }
        );

        function resetLighting() {

            showcase.style.setProperty("--light-x", "35%");
            showcase.style.setProperty("--light-y", "45%");
        }

        showcase.addEventListener(
            "pointerleave",
            resetLighting
        );

        reducedMotion.addEventListener("change", function () {
            resetPosition();
            resetLighting();
        });
    }


    // ========================================
    // IMAGE INSPECTOR AND ZOOM
    // ========================================

    function initializeInspector() {

        const dialog = get("image-inspector");

        const openButton = get("zoom-button");
        const closeButton = get("close-inspector");
        const zoomButton = get("inspector-zoom");

        const image = get("inspector-image");
        const viewport = get("inspector-viewport");

        openButton.addEventListener("click", function () {

            if (selectedIndex === -1) {
                return;
            }

            const item = gallery[selectedIndex];

            image.src = item.src;
            image.alt = currentSneaker.model + " - " + item.label;

            setText(
                "inspector-title",
                currentSneaker.model + " / " +
                currentSneaker.colorway
            );

            setText("inspector-label", item.label);

            viewport.classList.remove("is-zoomed");

            zoomButton.textContent = "Zoom 2x";
            zoomButton.setAttribute("aria-pressed", "false");

            if (typeof dialog.showModal !== "function") {

                window.open(item.src, "_blank", "noopener");

                return;
            }

            dialog.showModal();

            document.body.classList.add("inspector-open");

            viewport.scrollLeft = 0;
            viewport.scrollTop = 0;

            closeButton.focus();
        });

        closeButton.addEventListener("click", function () {
            dialog.close();
        });

        dialog.addEventListener("click", function (event) {

            if (event.target === dialog) {
                dialog.close();
            }
        });

        dialog.addEventListener("close", function () {

            document.body.classList.remove("inspector-open");

            openButton.focus();
        });

        zoomButton.addEventListener("click", function () {

            const zoomed =
                viewport.classList.toggle("is-zoomed");

            zoomButton.textContent =
                zoomed ? "Reset zoom" : "Zoom 2x";

            zoomButton.setAttribute(
                "aria-pressed",
                String(zoomed)
            );

            requestAnimationFrame(function () {

                viewport.scrollLeft = zoomed
                    ? (viewport.scrollWidth -
                       viewport.clientWidth) / 2
                    : 0;

                viewport.scrollTop = zoomed
                    ? (viewport.scrollHeight -
                       viewport.clientHeight) / 2
                    : 0;
            });
        });
    }


    // ========================================
    // RETAILERS AND AVAILABILITY
    // ========================================

    function displayRetailers(sneaker) {

        const list = get("retailer-list");

        list.replaceChildren();

        const retailers = sneaker.retailers || [];

        if (retailers.length === 0) {

            list.textContent =
                "No retailer information recorded yet.";

        } else {

            retailers.forEach(function (retailer) {

                const row = document.createElement("div");
                row.className = "retailer";

                const name = document.createElement("span");
                name.textContent = retailer.name;

                const price = document.createElement("span");
                price.textContent = formatPrice(retailer.price);

                const status = document.createElement("span");
                status.textContent =
                    retailer.status || "Not checked";

                row.append(name, price, status);

                list.appendChild(row);
            });
        }

        setText(
            "last-updated",
            sneaker.lastUpdated || "Not checked"
        );
    }


    // ========================================
    // NAVIGATION BETWEEN SNEAKERS
    // ========================================

    function configureProductNavigation(sneakers, index) {

        const previous = get("previous-product");
        const next = get("next-product");

        setText(
            "product-counter",
            number(index + 1) +
            " / " +
            number(sneakers.length)
        );

        previous.disabled = index === 0;
        next.disabled = index === sneakers.length - 1;

        previous.addEventListener("click", function () {

            if (index > 0) {
                navigateToProduct(sneakers[index - 1].id, -1);
            }
        });

        next.addEventListener("click", function () {

            if (index < sneakers.length - 1) {
                navigateToProduct(sneakers[index + 1].id, 1);
            }
        });
    }

    function navigateToProduct(id, direction) {

        if (navigationLocked) {
            return;
        }

        navigationLocked = true;

        const destination =
            "product.html?id=" + encodeURIComponent(id);

        if (canAnimate()) {

            gsap.to("#product-main", {

                opacity: 0,
                x: direction * -30,
                duration: 0.35,
                ease: "power2.in",

                onComplete: function () {
                    window.location.href = destination;
                }
            });

        } else {

            window.location.href = destination;
        }
    }

    window.addEventListener("pageshow", function (event) {

        navigationLocked = false;

        if (event.persisted && gsap) {

            gsap.killTweensOf("#product-main");

            gsap.set("#product-main", {
                clearProps: "opacity,transform"
            });
        }
    });


    // ========================================
    // START APPLICATION
    // ========================================

    initializeProduct();

})();

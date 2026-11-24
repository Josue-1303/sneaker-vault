
// ========================================
// SNEAKER VAULT
// V0.5.14 - DIRECTIONAL LIGHTING ENGINE
// ========================================

(function () {

    "use strict";

    const get = id => document.getElementById(id);

    const productGrid = get("product-grid");
    const collectionCount = get("collection-count");
    const statusFilter = get("status");
    const sortSelect = get("sort");
    const searchInput = get("archive-search-input");
    const emptyMessage = get("empty-message");
    const gridButton = get("archive-grid-view");
    const listButton = get("archive-list-view");

    const brandButtons = document.querySelectorAll(
        ".archive-brand-button"
    );

    if (!productGrid || !searchInput) return;


    // ========================================
    // ENGINE SETTINGS
    // ========================================

    const settings = {
    hitboxResolution: 512,
    alphaThreshold: 48,

    lightingResolution: 1500,

    upperBrightness: 1.10,
    lowerBrightness: 0.80,
    bounceLight: 0.055,

    warmRed: 1.025,
    warmGreen: 1.005,
    warmBlue: 0.965,

    projectedShadowOpacity: 0.38,
    projectedShadowBlur: 7,

    transitionDuration: 550
};


    // ========================================
    // APPLICATION STATE
    // ========================================

    let allSneakers = [];
    let selectedBrand = "all";
    let collectionReady = false;

    const archiveNumbers = new Map();
    const missingImages = new Set();

    const hitboxCache = new Map();
    const lightingCache = new Map();

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );


    // ========================================
    // ENGINE STYLES
    // ========================================

    function initializeEngineStyles() {

        if (get("archive-hitbox-styles")) return;

        const style = document.createElement("style");

        style.id = "archive-hitbox-styles";

        style.textContent = `

            /* Preserve silhouette-only interaction */

            .archive-card,
            .archive-card-stage,
            .archive-card-info,
            .archive-card-image {
                pointer-events: none;
            }

            .archive-card {
                cursor: default;
            }

            .archive-card-hitbox {
                position: absolute;
                z-index: 6;
                overflow: hidden;
                pointer-events: none;
                transform: none !important;
                filter: none !important;
            }

            .archive-card-hitbox path {
                fill: transparent;
                pointer-events: fill;
                cursor: pointer;
            }

            .archive-card-placeholder strong,
            .archive-card-placeholder span {
                pointer-events: auto;
                cursor: pointer;
            }

            .archive-card.has-hitbox-fallback
            .archive-card-info {
                pointer-events: auto;
                cursor: pointer;
            }


            /* Hide original image only after
               the lighting canvas is ready */

            .archive-card-stage.has-directional-light
            img.archive-card-image {
                visibility: hidden;
            }


            /* Canvas inherits the original
               shoe dimensions from your CSS */

            .archive-relight-canvas {
                display: block;
                z-index: 3;
                pointer-events: none;
                transform: none !important;
            }


            /* Independent projected shadow */

            .archive-projected-shadow {

                z-index: 2;

                pointer-events: none;

                opacity: calc(
                    var(--spot-opacity, 0) *
                    ${settings.projectedShadowOpacity}
                );

                filter: blur(
                    ${settings.projectedShadowBlur}px
                ) !important;

                transform: none !important;

                transition:
                    opacity
                    var(--light-transition, 0.55s)
                    ease;
            }


            /* A physical lamp stays fixed.
               Remove cursor-following glow
               from successfully relit shoes. */

            .archive-card-stage.has-directional-light
            .archive-card-light {
                opacity: 0 !important;
            }


            @media (prefers-reduced-motion: reduce) {

                .archive-projected-shadow {
                    transition: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }


    // ========================================
    // GENERAL HELPERS
    // ========================================

    function createElement(tag, className, content) {

        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (content !== undefined) {
            element.textContent = content;
        }

        return element;
    }


    function createCanvas(width, height) {

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        return canvas;
    }


    function setText(id, value) {

        const element = get(id);

        if (element) {
            element.textContent = value;
        }
    }


    function formatNumber(value) {

        return String(value).padStart(2, "0");
    }


    function normalize(value) {

        return String(value || "")
            .toLowerCase()
            .trim();
    }


    function normalizeStatus(status) {

        return normalize(status)
            .replace(/\s+/g, "-");
    }


    function hasPrice(price) {

        return (
            typeof price === "number" &&
            Number.isFinite(price) &&
            price >= 0
        );
    }


    function clamp(value, min, max) {

        return Math.max(min, Math.min(max, value));
    }


    function lerp(start, end, amount) {

        return start + (end - start) * amount;
    }


    function smoothstep(value) {

        const x = clamp(value, 0, 1);

        return x * x * (3 - 2 * x);
    }


    function getImageDimensions(image, resolution) {

        if (!image.naturalWidth || !image.naturalHeight) {
            throw new Error("Invalid image dimensions.");
        }

        const scale = Math.min(

            1,

            resolution / Math.max(
                image.naturalWidth,
                image.naturalHeight
            )
        );

        return {

            width: Math.max(
                1,
                Math.round(image.naturalWidth * scale)
            ),

            height: Math.max(
                1,
                Math.round(image.naturalHeight * scale)
            )
        };
    }


    // ========================================
    // ALPHA HITBOX GENERATOR
    // ========================================

    function generateHitbox(image) {

        const source = image.currentSrc || image.src;

        if (hitboxCache.has(source)) {
            return hitboxCache.get(source);
        }

        const { width, height } = getImageDimensions(
            image,
            settings.hitboxResolution
        );

        const canvas = createCanvas(width, height);

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Canvas unavailable.");
        }

        context.drawImage(image, 0, 0, width, height);

        const pixels = context.getImageData(
            0, 0, width, height
        ).data;

        const segments = [];

        for (let y = 0; y < height; y++) {

            let x = 0;

            while (x < width) {

                const index = (y * width + x) * 4;

                if (
                    pixels[index + 3] <
                    settings.alphaThreshold
                ) {
                    x++;
                    continue;
                }

                const startX = x;

                x++;

                while (x < width) {

                    const nextIndex =
                        (y * width + x) * 4;

                    if (
                        pixels[nextIndex + 3] <
                        settings.alphaThreshold
                    ) {
                        break;
                    }

                    x++;
                }

                const length = x - startX;

                segments.push(
                    `M${startX} ${y}h${length}v1h-${length}Z`
                );
            }
        }

        if (!segments.length) {
            throw new Error("No visible pixels.");
        }

        const hitbox = {
            width,
            height,
            path: segments.join(" ")
        };

        hitboxCache.set(source, hitbox);

        return hitbox;
    }


    function createHitboxElement(image) {

        const hitbox = generateHitbox(image);

        const namespace =
            "http://www.w3.org/2000/svg";

        const svg = document.createElementNS(
            namespace,
            "svg"
        );

        svg.setAttribute(
            "class",
            "archive-card-image archive-card-hitbox"
        );

        svg.setAttribute(
            "viewBox",
            `0 0 ${hitbox.width} ${hitbox.height}`
        );

        svg.setAttribute(
            "preserveAspectRatio",
            "xMidYMax meet"
        );

        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");

        const path = document.createElementNS(
            namespace,
            "path"
        );

        path.setAttribute("d", hitbox.path);
        path.setAttribute("fill", "transparent");
        path.setAttribute("pointer-events", "fill");

        svg.appendChild(path);

        return svg;
    }


    // ========================================
    // DIRECTIONAL LIGHTING MAP
    // ========================================

    function generateLightingMaps(image) {

        const source = image.currentSrc || image.src;

        if (lightingCache.has(source)) {
            return lightingCache.get(source);
        }

        const { width, height } = getImageDimensions(
            image,
            settings.lightingResolution
        );


        // Original photograph

        const original = createCanvas(width, height);

        const originalContext = original.getContext("2d");

        if (!originalContext) {
            throw new Error("Lighting canvas unavailable.");
        }

        originalContext.drawImage(
            image,
            0, 0, width, height
        );

        const imageData = originalContext.getImageData(
            0, 0, width, height
        );

        const pixels = imageData.data;


        // Detect the actual visible shoe bounds,
        // excluding transparent margins.

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;


        // Upper and lower silhouette per column

        const topEdges = new Int32Array(width);
        const bottomEdges = new Int32Array(width);

        topEdges.fill(height);
        bottomEdges.fill(-1);


        // Analyze alpha channel

        for (let y = 0; y < height; y++) {

            for (let x = 0; x < width; x++) {

                const index = (y * width + x) * 4;

                if (
                    pixels[index + 3] <
                    settings.alphaThreshold
                ) {
                    continue;
                }

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);

                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);

                topEdges[x] = Math.min(
                    topEdges[x],
                    y
                );

                bottomEdges[x] = Math.max(
                    bottomEdges[x],
                    y
                );
            }
        }

        if (maxX < minX || maxY < minY) {
            throw new Error("Empty lighting silhouette.");
        }

        const shoeWidth = maxX - minX + 1;
        const shoeHeight = maxY - minY + 1;


        // Smooth the silhouette edges to avoid
        // abrupt vertical lighting bands.

        const smoothTop = new Float32Array(width);
        const smoothBottom = new Float32Array(width);

        const smoothingRadius = 8;

        for (let x = 0; x < width; x++) {

            let topSum = 0;
            let bottomSum = 0;
            let count = 0;

            for (
                let offset = -smoothingRadius;
                offset <= smoothingRadius;
                offset++
            ) {

                const column = x + offset;

                if (
                    column < 0 ||
                    column >= width ||
                    bottomEdges[column] < 0
                ) {
                    continue;
                }

                topSum += topEdges[column];
                bottomSum += bottomEdges[column];
                count++;
            }

            smoothTop[x] = count
                ? topSum / count
                : minY;

            smoothBottom[x] = count
                ? bottomSum / count
                : maxY;
        }


        // ====================================
        // APPLY DIRECTIONAL LIGHT PER PIXEL
        // ====================================

        const illuminated = createCanvas(width, height);

        const illuminatedContext =
            illuminated.getContext("2d");

        if (!illuminatedContext) {
            throw new Error("Lighting context unavailable.");
        }

        const output = illuminatedContext.createImageData(
            width,
            height
        );

        output.data.set(pixels);

        for (let y = 0; y < height; y++) {

            for (let x = 0; x < width; x++) {

                const index = (y * width + x) * 4;

                const alpha = pixels[index + 3];

                if (alpha === 0) continue;


                // Global vertical position

                const globalDepth = clamp(

                    (y - minY) /
                    Math.max(1, shoeHeight - 1),

                    0,
                    1
                );


                // Local depth from silhouette top

                const localHeight = Math.max(

                    1,

                    smoothBottom[x] - smoothTop[x]
                );

                const localDepth = clamp(

                    (y - smoothTop[x]) / localHeight,

                    0,
                    1
                );


                // Blend local and global lighting

                const depth = smoothstep(

                    globalDepth * 0.72 +
                    localDepth * 0.28
                );


                // Stronger lighting from above

                let intensity = lerp(

                    settings.upperBrightness,

                    settings.lowerBrightness,

                    depth
                );


                // Soft reflected light near the sole

                const bounce =

                    settings.bounceLight *

                    Math.exp(

                        -Math.pow(
                            (globalDepth - 0.94) / 0.12,
                            2
                        )
                    );

                intensity += bounce;


                // Soft horizontal falloff

                const horizontalPosition = clamp(

                    (x - minX) /
                    Math.max(1, shoeWidth - 1),

                    0,
                    1
                );

                const horizontalFalloff =

                    1 - 0.07 *

                    Math.pow(
                        Math.abs(
                            horizontalPosition - 0.5
                        ) * 2,
                        2
                    );

                intensity *= horizontalFalloff;


                // Preserve the original color and
                // apply a subtle warm temperature

                output.data[index] = clamp(

                    pixels[index] *
                    intensity *
                    settings.warmRed,

                    0,
                    255
                );

                output.data[index + 1] = clamp(

                    pixels[index + 1] *
                    intensity *
                    settings.warmGreen,

                    0,
                    255
                );

                output.data[index + 2] = clamp(

                    pixels[index + 2] *
                    intensity *
                    settings.warmBlue,

                    0,
                    255
                );


                // Never alter the photograph's alpha

                output.data[index + 3] = alpha;
            }
        }

        illuminatedContext.putImageData(
            output,
            0,
            0
        );


        // ====================================
        // PROJECTED SHADOW MAP
        // ====================================

        const shadow = createCanvas(width, height);

        const shadowContext = shadow.getContext("2d");

        if (!shadowContext) {
            throw new Error("Shadow context unavailable.");
        }

        const shadowWidth = shoeWidth * 1.10;
        const shadowHeight = shoeHeight * 0.48;

        const shadowX =
            minX - (shadowWidth - shoeWidth) / 2;

        const shadowY =
            maxY - shadowHeight;


        // Project a compressed version of
        // the silhouette behind the shoe.

        shadowContext.drawImage(

            original,

            minX,
            minY,
            shoeWidth,
            shoeHeight,

            shadowX,
            shadowY,
            shadowWidth,
            shadowHeight
        );


        // Convert projected shape to black

        shadowContext.globalCompositeOperation =
            "source-in";

        shadowContext.fillStyle = "#0b0704";

        shadowContext.fillRect(
            0, 0, width, height
        );

        shadowContext.globalCompositeOperation =
            "source-over";


        const maps = {

            width,
            height,

            original,
            illuminated,
            shadow
        };

        lightingCache.set(source, maps);

        return maps;
    }


    // ========================================
    // RENDER AND ANIMATE LIGHTING
    // ========================================

    function initializeDirectionalLighting(

        card,
        stage,
        image

    ) {

        const maps = generateLightingMaps(image);


        // Visible product canvas

        const canvas = createCanvas(
            maps.width,
            maps.height
        );

        canvas.className =
            "archive-card-image archive-relight-canvas";

        canvas.setAttribute("aria-hidden", "true");

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Render canvas unavailable.");
        }


        // Independent shadow canvas

        const shadowCanvas = createCanvas(
            maps.width,
            maps.height
        );

        shadowCanvas.className =
            "archive-card-image archive-projected-shadow";

        shadowCanvas.setAttribute(
            "aria-hidden",
            "true"
        );

        const shadowContext =
            shadowCanvas.getContext("2d");

        if (!shadowContext) {
            throw new Error("Shadow render unavailable.");
        }

        shadowContext.drawImage(maps.shadow, 0, 0);


        // Lighting animation state

        let currentIntensity = 0;
        let targetIntensity = 0;
        let animationFrame = 0;


        // Render a frame by blending precomputed maps.

        function render(intensity) {

            context.globalAlpha = 1;

            context.globalCompositeOperation = "copy";

            context.drawImage(maps.original, 0, 0);

            if (intensity > 0) {

                // Keep the original alpha silhouette.

                context.globalCompositeOperation =
                    "source-atop";

                context.globalAlpha = intensity;

                context.drawImage(
                    maps.illuminated,
                    0,
                    0
                );
            }

            context.globalAlpha = 1;

            context.globalCompositeOperation =
                "source-over";
        }


        // Smooth transition, reversible at any time.

        function animateTo(value) {

            if (value === targetIntensity) {
                return;
            }

            targetIntensity = value;

            cancelAnimationFrame(animationFrame);

            if (reducedMotion.matches) {

                currentIntensity = targetIntensity;

                render(currentIntensity);

                return;
            }

            const start = currentIntensity;
            const end = targetIntensity;
            const startTime = performance.now();

            function frame(now) {

                if (!stage.isConnected) return;

                const progress = clamp(

                    (now - startTime) /
                    settings.transitionDuration,

                    0,
                    1
                );

                currentIntensity = lerp(

                    start,
                    end,
                    smoothstep(progress)
                );

                render(currentIntensity);

                if (progress < 1) {

                    animationFrame =
                        requestAnimationFrame(frame);
                }
            }

            animationFrame =
                requestAnimationFrame(frame);
        }


        // Follow the existing CSS spotlight state.
        // This preserves the hitbox, keyboard support
        // and mobile touch behavior.

        function synchronizeLighting() {

            requestAnimationFrame(function () {

                if (!stage.isConnected) return;

                const style = getComputedStyle(stage);

                const spotlight = parseFloat(

                    style.getPropertyValue(
                        "--spot-opacity"
                    )
                );

                const active =

                    Number.isFinite(spotlight) &&
                    spotlight > 0;

                animateTo(active ? 1 : 0);
            });
        }


        // Render the initial frame

        render(0);


        // Insert canvases without changing the layout.

        stage.append(
            shadowCanvas,
            canvas
        );


        // Hide the original only after successful
        // creation of both canvases.

        stage.classList.add(
            "has-directional-light"
        );


        // Mouse interaction

        stage.addEventListener(
            "pointerenter",
            synchronizeLighting
        );

        stage.addEventListener(
            "pointerleave",
            synchronizeLighting
        );


        // Touch interaction

        stage.addEventListener(
            "pointerdown",
            synchronizeLighting
        );

        stage.addEventListener(
            "pointerup",
            synchronizeLighting
        );

        stage.addEventListener(
            "pointercancel",
            synchronizeLighting
        );


        // Keyboard accessibility

        card.addEventListener(
            "focus",
            synchronizeLighting
        );

        card.addEventListener(
            "blur",
            synchronizeLighting
        );


        synchronizeLighting();
    }


    // ========================================
    // CREATE ARCHIVE CARD
    // ========================================

    function createArchiveCard(sneaker, index) {

        const card = createElement(
            "a",
            "archive-card"
        );

        card.href =
            "product.html?id=" +
            encodeURIComponent(sneaker.id);

        card.setAttribute(

            "aria-label",

            "Discover " +
            sneaker.brand + " " +
            sneaker.model + " " +
            sneaker.colorway
        );

        card.style.setProperty(
            "--card-theme",
            sneaker.theme || "#614536"
        );

        card.style.setProperty(
            "--card-delay",
            Math.min(index * 45, 240) + "ms"
        );


        // Exhibition stage

        const stage = createElement(
            "div",
            "archive-card-stage"
        );

        const watermark = createElement(

            "div",

            "archive-card-watermark",

            sneaker.model.toUpperCase()
        );

        watermark.setAttribute("aria-hidden", "true");


        const number = createElement(

            "span",

            "archive-card-number",

            "ARCHIVE / " +
            formatNumber(
                archiveNumbers.get(sneaker.id)
            )
        );

        const light = createElement(
            "div",
            "archive-card-light"
        );

        light.setAttribute("aria-hidden", "true");

        const arrow = createElement(

            "span",

            "archive-card-arrow",

            "↗"
        );

        arrow.setAttribute("aria-hidden", "true");


        // Missing image placeholder

        const placeholder = createElement(
            "div",
            "archive-card-placeholder"
        );

        placeholder.append(

            createElement(
                "strong",
                "",
                sneaker.model.toUpperCase()
            ),

            createElement(
                "span",
                "",
                "PHOTOGRAPHY COMING SOON"
            )
        );


        // Product photograph

        const image = createElement(
            "img",
            "archive-card-image"
        );

        image.alt =

            sneaker.brand + " " +
            sneaker.model + " " +
            sneaker.colorway;

        image.loading = "lazy";
        image.decoding = "async";
        image.draggable = false;
        image.hidden = true;


        // ====================================
        // INITIALIZE IMAGE SYSTEMS
        // ====================================

        image.addEventListener(

            "load",

            function () {

                placeholder.hidden = true;
                image.hidden = false;


                // Hitbox system

                try {

                    const hitbox =
                        createHitboxElement(image);

                    stage.appendChild(hitbox);

                } catch (error) {

                    card.classList.add(
                        "has-hitbox-fallback"
                    );

                    console.warn(

                        "Hitbox unavailable:",

                        sneaker.colorway,

                        error
                    );
                }


                // Directional lighting system

                try {

                    initializeDirectionalLighting(
                        card,
                        stage,
                        image
                    );

                    console.log(

                        "Directional lighting ready:",

                        sneaker.colorway
                    );

                } catch (error) {

                    // Keep original image and CSS
                    // lighting if Canvas fails.

                    console.warn(

                        "Using original CSS lighting:",

                        sneaker.colorway,

                        error
                    );
                }
            },

            { once: true }
        );


        image.addEventListener(

            "error",

            function () {

                missingImages.add(sneaker.image);

                image.hidden = true;
                placeholder.hidden = false;
            },

            { once: true }
        );


        stage.append(

            watermark,
            placeholder,
            image,
            light,
            number,
            arrow
        );


        if (
            sneaker.image &&
            !missingImages.has(sneaker.image)
        ) {

            placeholder.hidden = true;
            image.hidden = false;
            image.src = sneaker.image;
        }


        // Product information

        const info = createElement(
            "div",
            "archive-card-info"
        );

        const brand = createElement(
            "p",
            "archive-card-brand",
            sneaker.brand
        );

        const model = createElement(
            "h2",
            "",
            sneaker.model
        );

        const colorway = createElement(
            "p",
            "archive-card-colorway",
            sneaker.colorway
        );

        const details = createElement(
            "div",
            "archive-card-details"
        );


        const size = createElement(

            "span",

            "archive-card-size",

            sneaker.targetSize == null

                ? "EU --"

                : "EU " + sneaker.targetSize
        );


        const status = createElement(

            "span",

            "archive-card-status",

            sneaker.status || "Not checked"
        );

        status.dataset.status =
            normalizeStatus(sneaker.status);


        const price = createElement(

            "span",

            "archive-card-price",

            hasPrice(sneaker.price)

                ? formatPrice(sneaker.price)

                : "Not checked"
        );


        details.append(
            size,
            status,
            price
        );

        info.append(
            brand,
            model,
            colorway,
            details
        );

        card.append(
            stage,
            info
        );

        return card;
    }


    // ========================================
    // DISPLAY COLLECTION
    // ========================================

    function displayCollection(sneakers) {

        const fragment =
            document.createDocumentFragment();

        sneakers.forEach(function (sneaker, index) {

            fragment.appendChild(
                createArchiveCard(sneaker, index)
            );
        });

        productGrid.replaceChildren(fragment);

        collectionCount.textContent =

            formatNumber(sneakers.length) +

            " / " +

            formatNumber(allSneakers.length) +

            " SELECTED PAIRS";

        emptyMessage.hidden =
            sneakers.length !== 0;
    }


    // ========================================
    // FILTER AND SORT
    // ========================================

    function updateCollection() {

        if (!collectionReady) return;

        let filteredSneakers = [...allSneakers];


        // Brand filter

        if (selectedBrand !== "all") {

            filteredSneakers = filteredSneakers.filter(

                sneaker =>

                    normalize(sneaker.brand) ===
                    selectedBrand
            );
        }


        // Availability filter

        if (statusFilter.value !== "all") {

            filteredSneakers = filteredSneakers.filter(

                sneaker =>

                    normalizeStatus(sneaker.status) ===
                    statusFilter.value
            );
        }


        // Search

        const search = normalize(searchInput.value);

        if (search) {

            const words = search.split(/\s+/);

            filteredSneakers = filteredSneakers.filter(

                function (sneaker) {

                    const searchableText = normalize(

                        sneaker.brand + " " +
                        sneaker.model + " " +
                        sneaker.colorway
                    );

                    return words.every(

                        word =>

                            searchableText.includes(word)
                    );
                }
            );
        }


        // Price sorting

        if (
            sortSelect.value === "price-low" ||
            sortSelect.value === "price-high"
        ) {

            filteredSneakers.sort(function (a, b) {

                const aHasPrice = hasPrice(a.price);
                const bHasPrice = hasPrice(b.price);

                if (!aHasPrice && !bHasPrice) return 0;
                if (!aHasPrice) return 1;
                if (!bHasPrice) return -1;

                return sortSelect.value === "price-low"

                    ? a.price - b.price

                    : b.price - a.price;
            });
        }


        // Alphabetical sorting

        if (sortSelect.value === "name") {

            filteredSneakers.sort(function (a, b) {

                const nameA =

                    a.brand + " " +
                    a.model + " " +
                    a.colorway;

                const nameB =

                    b.brand + " " +
                    b.model + " " +
                    b.colorway;

                return nameA.localeCompare(nameB);
            });
        }

        displayCollection(filteredSneakers);
    }


    // ========================================
    // BRAND CONTROLS
    // ========================================

    function updateBrandButtons() {

        brandButtons.forEach(function (button) {

            const active =
                button.dataset.brand === selectedBrand;

            button.classList.toggle(
                "active",
                active
            );

            button.setAttribute(
                "aria-pressed",
                String(active)
            );
        });
    }


    brandButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            selectedBrand = button.dataset.brand;

            updateBrandButtons();
            updateCollection();
        });
    });


    // ========================================
    // GRID AND LIST VIEW
    // ========================================

    function setViewMode(mode) {

        const isList = mode === "list";

        productGrid.classList.toggle(
            "is-list",
            isList
        );

        gridButton.classList.toggle(
            "active",
            !isList
        );

        listButton.classList.toggle(
            "active",
            isList
        );

        gridButton.setAttribute(
            "aria-pressed",
            String(!isList)
        );

        listButton.setAttribute(
            "aria-pressed",
            String(isList)
        );
    }

    gridButton.addEventListener(
        "click",
        () => setViewMode("grid")
    );

    listButton.addEventListener(
        "click",
        () => setViewMode("list")
    );


    // ========================================
    // RESET FILTERS
    // ========================================

    function resetFilters() {

        selectedBrand = "all";

        searchInput.value = "";
        statusFilter.value = "all";
        sortSelect.value = "default";

        updateBrandButtons();
        updateCollection();
    }


    get("archive-reset").addEventListener(
        "click",
        resetFilters
    );

    get("archive-empty-reset").addEventListener(
        "click",
        resetFilters
    );

    searchInput.addEventListener(
        "input",
        updateCollection
    );

    statusFilter.addEventListener(
        "change",
        updateCollection
    );

    sortSelect.addEventListener(
        "change",
        updateCollection
    );


    // ========================================
    // COLLECTION STATISTICS
    // ========================================

    function updateStatistics() {

        const brands = new Set(

            allSneakers.map(
                sneaker => normalize(sneaker.brand)
            )
        );

        const nikeCount = allSneakers.filter(

            sneaker =>
                normalize(sneaker.brand) === "nike"

        ).length;

        const adidasCount = allSneakers.filter(

            sneaker =>
                normalize(sneaker.brand) === "adidas"

        ).length;

        setText(
            "archive-total",
            formatNumber(allSneakers.length)
        );

        setText(
            "archive-brands",
            formatNumber(brands.size)
        );

        setText(
            "brand-count-all",
            formatNumber(allSneakers.length)
        );

        setText(
            "brand-count-nike",
            formatNumber(nikeCount)
        );

        setText(
            "brand-count-adidas",
            formatNumber(adidasCount)
        );
    }


    // ========================================
    // INITIALIZE APPLICATION
    // ========================================

    async function initializeCollection() {

        try {

            initializeEngineStyles();

            allSneakers = await loadSneakers();

            if (!Array.isArray(allSneakers)) {
                throw new Error("Invalid collection data.");
            }

            allSneakers.forEach(

                function (sneaker, index) {

                    archiveNumbers.set(
                        sneaker.id,
                        index + 1
                    );
                }
            );

            collectionReady = true;

            updateStatistics();
            updateBrandButtons();
            setViewMode("grid");
            updateCollection();

            console.log(
                "Sneaker Vault V0.5.14 initialized."
            );

            console.log(
                "Directional Lighting Engine active."
            );

        } catch (error) {

            collectionCount.textContent =
                "Collection unavailable";

            productGrid.replaceChildren();

            emptyMessage.hidden = false;

            const heading =
                emptyMessage.querySelector("h2");

            if (heading) {

                heading.textContent =
                    "Unable to load the collection.";
            }

            setText(

                "archive-empty-description",

                "Please reload the page and try again."
            );

            get("archive-empty-reset").hidden = true;

            console.error(

                "Collection initialization failed:",

                error
            );
        }
    }

    initializeCollection();

})();

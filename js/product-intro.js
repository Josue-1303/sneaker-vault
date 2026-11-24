
// ========================================
// SNEAKER VAULT
// V0.4.5 - SYNCHRONIZED DYNAMIC LIGHTING
// ========================================

(function () {

    "use strict";

    const get = id => document.getElementById(id);

    const intro = get("product-intro");
    const art = get("intro-art");
    const stage = get("intro-stage");
    const message = get("intro-image-message");

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const desktopPointer = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
    );

    if (!intro || !art || !stage || !message) {
        return;
    }

    console.log("Sneaker Vault - Lighting V0.4.5");


    // ========================================
    // CONFIGURATION
    // ========================================

    const settings = {

        backgroundRadius: 380,
        backgroundIntensity: 0.32,

        shoeRadius: 150,
        shoeIntensity: 0.42,

        horizontalMovement: 8,
        verticalMovement: 5

    };

    const shoes = [];

    let cursorX = 0;
    let cursorY = 0;

    let cursorActive = false;
    let animationFrame = null;

    let backgroundSpotlight = null;


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

    function setLoading(visible, text) {

        message.hidden = !visible;

        message.style.display =
            visible ? "" : "none";

        if (text) {
            message.textContent = text;
        }
    }


    // ========================================
    // PRODUCT DESCRIPTION
    // ========================================

    function getDescription(sneaker) {

        if (sneaker.introDescription) {
            return sneaker.introDescription;
        }

        if (sneaker.description) {

            const sentence =
                sneaker.description.split(". ")[0];

            return sentence.endsWith(".")
                ? sentence
                : sentence + ".";
        }

        return "A distinctive silhouette, selected for its color, design and individual character.";
    }


    // ========================================
    // SELECT PRODUCT IMAGES
    // ========================================

    function selectImages(sneaker) {

        const gallery = Array.isArray(sneaker.gallery)
            ? sneaker.gallery
            : [];

        const alternative = gallery.find(
            item => item.label === "Alternative Profile"
        );

        const front =
            sneaker.introFrontImage ||
            sneaker.image;

        const back =
            sneaker.introBackImage ||
            (alternative ? alternative.src : null);

        return {

            front,

            back: back !== front ? back : null

        };
    }


    // ========================================
    // BACKGROUND LIGHT
    // ========================================

    function createBackgroundSpotlight() {

        const light = intro.querySelector(".intro-light");

        if (!light) {
            return;
        }

        backgroundSpotlight =
            document.createElement("div");

        Object.assign(backgroundSpotlight.style, {

            position: "absolute",
            inset: "0",

            pointerEvents: "none",

            opacity: "0",

            transition: "opacity 150ms ease",

            mixBlendMode: "screen"

        });

        light.appendChild(backgroundSpotlight);
    }


    // ========================================
    // CREATE PIXEL MAP
    // ========================================

    function createPixelMap(image) {

        try {

            const canvas =
                document.createElement("canvas");

            const scale = Math.min(
                1,
                512 / Math.max(
                    image.naturalWidth,
                    image.naturalHeight
                )
            );

            const width = Math.max(
                1,
                Math.round(image.naturalWidth * scale)
            );

            const height = Math.max(
                1,
                Math.round(image.naturalHeight * scale)
            );

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");

            context.drawImage(
                image,
                0,
                0,
                width,
                height
            );

            return {

                width,
                height,

                data: context.getImageData(
                    0,
                    0,
                    width,
                    height
                ).data

            };

        } catch (error) {

            console.warn(
                "Pixel map unavailable:",
                error
            );

            return null;
        }
    }


    // ========================================
    // CREATE SYNCHRONIZED LIGHTING CANVAS
    // ========================================

    function createShoeLighting(image, container) {

        const canvas =
            document.createElement("canvas");

        canvas.className = "shoe-lighting-canvas";

        canvas.setAttribute(
            "aria-hidden",
            "true"
        );

        Object.assign(canvas.style, {

            position: "absolute",

            display: "none",

            pointerEvents: "none",

            zIndex: "2",

            margin: "0",
            padding: "0",
            border: "0",

            maxWidth: "none",
            maxHeight: "none",

            mixBlendMode: "screen",

            animation: "none",
            transition: "none"

        });

        container.appendChild(canvas);

        const context = canvas.getContext("2d");

        if (!context) {

            canvas.remove();

            return;
        }

        shoes.push({

            image,
            container,
            canvas,
            context,

            pixelMap: createPixelMap(image)

        });
    }


    // ========================================
    // LOAD PRODUCT IMAGE
    // ========================================

    function loadImage(imageId, containerId, source) {

        return new Promise(function (resolve) {

            const image = get(imageId);
            const container = get(containerId);

            if (!image || !container || !source) {

                if (container) {

                    container.hidden = true;
                    container.style.display = "none";
                }

                resolve(false);
                return;
            }

            container.hidden = true;

            image.onload = function () {

                container.hidden = false;
                container.style.display = "";

                try {

                    createShoeLighting(
                        image,
                        container
                    );

                } catch (error) {

                    console.warn(
                        "Lighting initialization error:",
                        error
                    );
                }

                resolve(true);
            };

            image.onerror = function () {

                container.hidden = true;
                container.style.display = "none";

                console.warn(
                    "Image unavailable:",
                    source
                );

                resolve(false);
            };

            image.src = source;
        });
    }


    // ========================================
    // DISPLAY FLOATING SHOES
    // ========================================

    async function displayImages(sneaker) {

        const images = selectImages(sneaker);

        art.classList.remove("is-pair");

        setLoading(true, "LOADING PRODUCT");

        const results = await Promise.all([

            loadImage(
                "intro-image-front",
                "intro-shoe-front",
                images.front
            ),

            loadImage(
                "intro-image-back",
                "intro-shoe-back",
                images.back
            )

        ]);

        const frontLoaded = results[0];
        const backLoaded = results[1];

        art.classList.toggle(

            "is-pair",

            frontLoaded && backLoaded

        );

        if (!frontLoaded && !backLoaded) {

            setLoading(true, "IMAGE COMING SOON");

            return;
        }

        setLoading(false);

        get("intro-image-front").alt =

            sneaker.brand + " " +
            sneaker.model + " " +
            sneaker.colorway;

        if (backLoaded) {

            get("intro-image-back").alt =
                sneaker.model + " alternative profile";
        }

        animateEntrance();
    }


    // ========================================
    // CINEMATIC ENTRANCE
    // ========================================

    function animateEntrance() {

        if (reducedMotion.matches) {
            return;
        }

        if (typeof art.animate === "function") {

            art.animate(

                [
                    { opacity: 0 },
                    { opacity: 1 }
                ],

                {
                    duration: 1200,
                    easing: "ease-out"
                }
            );
        }
    }


    // ========================================
    // CALCULATE IMAGE DIMENSIONS
    // ========================================

    function getImageGeometry(image) {

        const style = getComputedStyle(image);

        const width =
            parseFloat(style.width) || image.clientWidth;

        const height =
            parseFloat(style.height) || image.clientHeight;

        if (!width || !height) {
            return null;
        }

        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;

        let renderedWidth = width;
        let renderedHeight = height;

        const fit = style.objectFit;

        if (

            fit === "contain" ||
            fit === "cover" ||
            fit === "scale-down" ||
            fit === "none"

        ) {

            let scale = fit === "cover"

                ? Math.max(
                    width / naturalWidth,
                    height / naturalHeight
                )

                : Math.min(
                    width / naturalWidth,
                    height / naturalHeight
                );

            if (fit === "scale-down") {
                scale = Math.min(1, scale);
            }

            if (fit === "none") {
                scale = 1;
            }

            renderedWidth = naturalWidth * scale;
            renderedHeight = naturalHeight * scale;
        }

        return {

            width,
            height,

            renderedWidth,
            renderedHeight,

            offsetX: (width - renderedWidth) / 2,

            offsetY: (height - renderedHeight) / 2,

            style

        };
    }


    // ========================================
    // GET REAL IMAGE TRANSFORMATION
    // ========================================

    function getImageMatrix(image) {

        let matrix = new DOMMatrix();

        let element = image;

        while (element) {

            const style =
                getComputedStyle(element);

            let local = new DOMMatrix();

            if (
                style.rotate &&
                style.rotate !== "none"
            ) {

                const rotation =
                    parseFloat(style.rotate);

                if (Number.isFinite(rotation)) {
                    local = local.rotate(rotation);
                }
            }

            if (
                style.scale &&
                style.scale !== "none"
            ) {

                const values =
                    style.scale.split(" ").map(Number);

                const sx = values[0];
                const sy = values[1] ?? sx;

                if (
                    Number.isFinite(sx) &&
                    Number.isFinite(sy)
                ) {

                    local = local.scale(sx, sy);
                }
            }

            if (style.transform !== "none") {

                local = local.multiply(
                    new DOMMatrix(style.transform)
                );
            }

            matrix = local.multiply(matrix);

            element = element.parentElement;
        }

        return new DOMMatrix([

            matrix.a,
            matrix.b,
            matrix.c,
            matrix.d,
            0,
            0

        ]);
    }


    // ========================================
    // CONVERT CURSOR TO IMAGE COORDINATES
    // ========================================

    function getLocalCursor(image, geometry) {

        const bounds = image.getBoundingClientRect();

        if (

            cursorX < bounds.left ||
            cursorX > bounds.right ||
            cursorY < bounds.top ||
            cursorY > bounds.bottom

        ) {

            return null;
        }

        let inverse;

        try {

            inverse =
                getImageMatrix(image).inverse();

        } catch (error) {

            return null;
        }

        const centerX =
            bounds.left + bounds.width / 2;

        const centerY =
            bounds.top + bounds.height / 2;

        const point = new DOMPoint(

            cursorX - centerX,

            cursorY - centerY

        ).matrixTransform(inverse);

        const x =
            point.x + geometry.width / 2;

        const y =
            point.y + geometry.height / 2;

        if (

            !Number.isFinite(x) ||
            !Number.isFinite(y) ||

            x < 0 ||
            x >= geometry.width ||

            y < 0 ||
            y >= geometry.height

        ) {

            return null;
        }

        return { x, y };
    }


    // ========================================
    // DETECT REAL SHOE SILHOUETTE
    // ========================================

    function detectShoe(shoe) {

        if (shoe.container.hidden) {
            return null;
        }

        const geometry =
            getImageGeometry(shoe.image);

        if (!geometry) {
            return null;
        }

        const point =
            getLocalCursor(shoe.image, geometry);

        if (!point) {
            return null;
        }

        const normalizedX =

            (point.x - geometry.offsetX) /
            geometry.renderedWidth;

        const normalizedY =

            (point.y - geometry.offsetY) /
            geometry.renderedHeight;

        if (

            normalizedX < 0 ||
            normalizedX >= 1 ||

            normalizedY < 0 ||
            normalizedY >= 1

        ) {

            return null;
        }

        if (shoe.pixelMap) {

            const map = shoe.pixelMap;

            const x = Math.floor(
                normalizedX * map.width
            );

            const y = Math.floor(
                normalizedY * map.height
            );

            const index =

                (y * map.width + x) * 4;

            const alpha =
                map.data[index + 3];

            if (alpha < 40) {

                return null;
            }
        }

        return {

            shoe,
            geometry,

            x: point.x,
            y: point.y

        };
    }


    // ========================================
    // SYNCHRONIZE CANVAS WITH ORIGINAL IMAGE
    // ========================================

    function synchronizeCanvas(shoe, geometry) {

        const image = shoe.image;
        const canvas = shoe.canvas;
        const style = geometry.style;

        // The canvas copies the CURRENT transform,
        // including the floating animation.

        Object.assign(canvas.style, {

            left: image.offsetLeft + "px",
            top: image.offsetTop + "px",

            width: geometry.width + "px",
            height: geometry.height + "px",

            transform: style.transform,

            transformOrigin: style.transformOrigin,

            translate: style.translate || "none",

            rotate: style.rotate || "none",

            scale: style.scale || "none",

            display: "block"

        });


        // Match display resolution.

        const ratio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        const pixelWidth = Math.max(
            1,
            Math.round(geometry.width * ratio)
        );

        const pixelHeight = Math.max(
            1,
            Math.round(geometry.height * ratio)
        );

        if (canvas.width !== pixelWidth) {

            canvas.width = pixelWidth;
        }

        if (canvas.height !== pixelHeight) {

            canvas.height = pixelHeight;
        }

        shoe.context.setTransform(

            pixelWidth / geometry.width,

            0,
            0,

            pixelHeight / geometry.height,

            0,
            0

        );
    }


    // ========================================
    // DRAW LIGHT INSIDE REAL IMAGE
    // ========================================

    function illuminateShoe(hit) {

        const shoe = hit.shoe;
        const geometry = hit.geometry;

        synchronizeCanvas(shoe, geometry);

        const context = shoe.context;

        context.clearRect(

            0,
            0,

            geometry.width,
            geometry.height

        );


        // Draw the original sneaker.

        context.globalCompositeOperation =
            "source-over";

        context.drawImage(

            shoe.image,

            geometry.offsetX,
            geometry.offsetY,

            geometry.renderedWidth,
            geometry.renderedHeight

        );


        // Keep only the light inside the
        // non-transparent pixels of the image.

        context.globalCompositeOperation =
            "source-in";

        const light = context.createRadialGradient(

            hit.x,
            hit.y,
            0,

            hit.x,
            hit.y,

            settings.shoeRadius

        );

        light.addColorStop(

            0,

            `rgba(255, 242, 220, ${settings.shoeIntensity})`

        );

        light.addColorStop(

            0.45,

            "rgba(255, 225, 185, 0.14)"

        );

        light.addColorStop(

            1,

            "rgba(255, 225, 185, 0)"

        );

        context.fillStyle = light;

        context.fillRect(

            0,
            0,

            geometry.width,
            geometry.height

        );

        context.globalCompositeOperation =
            "source-over";
    }


    // ========================================
    // DRAW BACKGROUND LIGHT
    // ========================================

    function illuminateBackground() {

        if (!backgroundSpotlight) {
            return;
        }

        const bounds =
            backgroundSpotlight.getBoundingClientRect();

        const x = cursorX - bounds.left;
        const y = cursorY - bounds.top;

        backgroundSpotlight.style.opacity = "1";

        backgroundSpotlight.style.background =

            `radial-gradient(

                circle ${settings.backgroundRadius}px

                at ${x}px ${y}px,

                rgba(255, 220, 175,
                    ${settings.backgroundIntensity}) 0%,

                rgba(220, 170, 120, 0.12) 45%,

                transparent 100%

            )`;
    }


    // ========================================
    // REAL-TIME LIGHTING LOOP
    // ========================================

    function updateLighting() {

        if (!cursorActive) {

            animationFrame = null;

            return;
        }

        const bounds =
            intro.getBoundingClientRect();

        if (

            cursorX < bounds.left ||
            cursorX > bounds.right ||

            cursorY < bounds.top ||
            cursorY > bounds.bottom

        ) {

            resetLighting();

            return;
        }

        let activeShoe = null;


        // Detect the front shoe before the rear shoe.

        const orderedShoes = [...shoes].sort(

            (a, b) =>

                Number(b.container.id === "intro-shoe-front") -

                Number(a.container.id === "intro-shoe-front")

        );

        for (const shoe of orderedShoes) {

            const hit = detectShoe(shoe);

            if (hit) {

                activeShoe = hit;

                break;
            }
        }


        // Hide all inactive lighting layers immediately.

        shoes.forEach(function (shoe) {

            if (
                !activeShoe ||
                activeShoe.shoe !== shoe
            ) {

                shoe.canvas.style.display = "none";
            }
        });


        // Transfer light between background and shoe.

        if (activeShoe) {

            if (backgroundSpotlight) {

                backgroundSpotlight.style.opacity = "0";
            }

            illuminateShoe(activeShoe);

        } else {

            illuminateBackground();
        }


        // Synchronize with every animation frame.

        animationFrame =
            requestAnimationFrame(updateLighting);
    }


    // ========================================
    // CURSOR MOVEMENT
    // ========================================

    function initializeMovement() {

        createBackgroundSpotlight();

        intro.addEventListener(

            "pointermove",

            function (event) {

                if (

                    event.pointerType !== "mouse" ||

                    !desktopPointer.matches ||

                    reducedMotion.matches

                ) {

                    return;
                }

                cursorX = event.clientX;
                cursorY = event.clientY;

                cursorActive = true;

                const bounds =
                    intro.getBoundingClientRect();

                const x =

                    (cursorX - bounds.left) /

                    bounds.width - 0.5;

                const y =

                    (cursorY - bounds.top) /

                    bounds.height - 0.5;


                // Subtle parallax.

                intro.style.setProperty(

                    "--intro-x",

                    (x * settings.horizontalMovement) +
                    "px"

                );

                intro.style.setProperty(

                    "--intro-y",

                    (y * settings.verticalMovement) +
                    "px"

                );


                if (animationFrame === null) {

                    animationFrame =
                        requestAnimationFrame(
                            updateLighting
                        );
                }
            }
        );

        intro.addEventListener(
            "pointerleave",
            resetLighting
        );

        reducedMotion.addEventListener(
            "change",
            resetLighting
        );

        desktopPointer.addEventListener(
            "change",
            resetLighting
        );

        window.addEventListener(
            "blur",
            resetLighting
        );

        document.addEventListener(

            "visibilitychange",

            function () {

                if (document.hidden) {

                    resetLighting();
                }
            }
        );
    }


    // ========================================
    // RESET LIGHTING
    // ========================================

    function resetLighting() {

        cursorActive = false;

        if (animationFrame !== null) {

            cancelAnimationFrame(animationFrame);

            animationFrame = null;
        }

        if (backgroundSpotlight) {

            backgroundSpotlight.style.opacity = "0";
        }

        shoes.forEach(function (shoe) {

            shoe.canvas.style.display = "none";
        });

        intro.style.setProperty(
            "--intro-x",
            "0px"
        );

        intro.style.setProperty(
            "--intro-y",
            "0px"
        );
    }


    // ========================================
    // INITIALIZE PRODUCT
    // ========================================

    async function initializeIntro() {

        try {

            const parameters =
                new URLSearchParams(
                    window.location.search
                );

            const selectedId =
                parameters.get("id");

            let sneakers;

            if (typeof loadSneakers === "function") {

                sneakers = await loadSneakers();

            } else {

                const response = await fetch(
                    "data/sneakers.json"
                );

                if (!response.ok) {

                    throw new Error(
                        "Unable to load sneaker database"
                    );
                }

                sneakers = await response.json();
            }

            const index = sneakers.findIndex(
                sneaker => sneaker.id === selectedId
            );

            if (index === -1) {

                setText(
                    "intro-colorway",
                    "Product not found."
                );

                setText(
                    "intro-description",
                    "Select a sneaker from the collection."
                );

                setLoading(
                    true,
                    "NO PRODUCT SELECTED"
                );

                return;
            }

            const sneaker = sneakers[index];

            setText(

                "intro-brand",

                sneaker.brand.toUpperCase() +
                " / ARCHIVE " +
                number(index + 1)

            );

            setText(
                "intro-model",
                sneaker.model
            );

            setText(
                "intro-colorway",
                sneaker.colorway + "."
            );

            setText(
                "intro-background-text",
                sneaker.model.toUpperCase()
            );

            setText(
                "intro-description",
                getDescription(sneaker)
            );

            setText(

                "archive-reference",

                "ARCHIVE / " + number(index + 1)

            );

            setText(

                "intro-counter",

                number(index + 1) +
                " / " +
                number(sneakers.length)

            );

            intro.style.setProperty(

                "--intro-color",

                sneaker.theme || "#614536"

            );

            initializeMovement();

            await displayImages(sneaker);

            console.log(

                "Synchronized Lighting V0.4.5 ready:",

                sneaker.colorway

            );

        } catch (error) {

            console.error(

                "Product intro error:",

                error

            );

            setText(

                "intro-colorway",

                "Unable to load product."

            );

            setLoading(

                true,

                "PRODUCT COULD NOT BE LOADED"

            );
        }
    }


    // ========================================
    // START
    // ========================================

    initializeIntro();

})();

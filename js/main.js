
// =========================
// SNEAKER VAULT
// Main JavaScript
// V0.4.6 - Mobile Navigation Fix
// =========================


// Mobile Navigation

const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {

    // Control menu state

    function setMenuState(isOpen) {

        navLinks.classList.toggle("open", isOpen);

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation" : "Open navigation"
        );

        menuToggle.textContent = isOpen ? "Close" : "Menu";
    }


    // Initial state

    setMenuState(false);


    // Open or close using the menu button

    menuToggle.addEventListener("click", function () {

        const isOpen = navLinks.classList.contains("open");

        setMenuState(!isOpen);
    });


    // Close when selecting a navigation link

    navLinks.querySelectorAll("a").forEach(function (link) {

        link.addEventListener("click", function () {

            setMenuState(false);
        });
    });


    // Close when clicking outside the menu

    document.addEventListener("click", function (event) {

        if (!navLinks.classList.contains("open")) {
            return;
        }

        const clickedInsideMenu =
            navLinks.contains(event.target);

        const clickedMenuButton =
            menuToggle.contains(event.target);

        if (!clickedInsideMenu && !clickedMenuButton) {

            setMenuState(false);
        }
    });


    // Close when pressing Escape

    document.addEventListener("keydown", function (event) {

        if (
            event.key === "Escape" &&
            navLinks.classList.contains("open")
        ) {

            setMenuState(false);

            menuToggle.focus();
        }
    });


    // Close when switching to desktop navigation

    const navigationObserver = new ResizeObserver(function () {

        if (getComputedStyle(menuToggle).display === "none") {

            setMenuState(false);
        }
    });

    navigationObserver.observe(document.documentElement);
}


// Load Sneakers

let sneakersPromise;

function loadSneakers() {

    if (!sneakersPromise) {

        sneakersPromise = fetch("data/sneakers.json")
            .then(function (response) {

                if (!response.ok) {
                    throw new Error("Could not load sneakers.");
                }

                return response.json();
            });
    }

    return sneakersPromise;
}


// Price Formatting

function formatPrice(price) {

    if (price === null || price === undefined) {
        return "Not checked";
    }

    return new Intl.NumberFormat("en-FI", {
        style: "currency",
        currency: "EUR"
    }).format(price);
}


// Handle Missing Images

function handleImage(image, container) {

    function showPlaceholder() {
        image.hidden = true;
        container.classList.add("image-missing");
    }

    image.addEventListener("error", showPlaceholder);

    image.addEventListener("load", function () {
        image.hidden = false;
        container.classList.remove("image-missing");
    });

    if (image.complete && image.naturalWidth === 0 && image.src) {
        showPlaceholder();
    }
}


// Create Product Card

function createProductCard(sneaker) {

    const card = document.createElement("a");

    card.className = "product-card";

    card.href = "product.html?id=" +
        encodeURIComponent(sneaker.id);

    const imageContainer = document.createElement("div");
    imageContainer.className = "product-card-image";

    imageContainer.style.background =
        "radial-gradient(ellipse, " +
        sneaker.theme + ", #1b1b1b 85%)";

    const image = document.createElement("img");

    image.alt = sneaker.brand + " " +
        sneaker.model + " " + sneaker.colorway;

    image.loading = "lazy";

    handleImage(image, imageContainer);

    image.src = sneaker.image;

    imageContainer.appendChild(image);

    const info = document.createElement("div");
    info.className = "product-card-info";

    const brand = document.createElement("span");
    brand.className = "product-card-brand";
    brand.textContent = sneaker.brand;

    const name = document.createElement("h3");
    name.textContent = sneaker.model;

    const colorway = document.createElement("p");
    colorway.textContent = sneaker.colorway;

    const bottom = document.createElement("div");
    bottom.className = "product-card-bottom";

    const size = document.createElement("span");
    size.textContent = "EU " + sneaker.targetSize;

    const status = document.createElement("span");
    status.textContent = sneaker.status;

    const price = document.createElement("span");
    price.textContent = formatPrice(sneaker.price);

    bottom.append(size, status, price);

    info.append(brand, name, colorway, bottom);

    card.append(imageContainer, info);

    return card;
}


// Home Page Featured Products

async function loadFeaturedProducts() {

    const featuredGrid = document.getElementById("featured-grid");

    if (!featuredGrid) {
        return;
    }

    try {

        const sneakers = await loadSneakers();

        const featuredIds = [
            "nike-baroque-brown",
            "nike-gorge-green",
            "adidas-night-indigo"
        ];

        featuredIds.forEach(function (id) {

            const sneaker = sneakers.find(function (item) {
                return item.id === id;
            });

            if (sneaker) {
                featuredGrid.appendChild(
                    createProductCard(sneaker)
                );
            }
        });

    } catch (error) {

        featuredGrid.textContent =
            "The collection could not be loaded.";

        console.error(error);
    }
}


// Home Hero Image

const heroImage = document.querySelector(".hero-image");
const heroProduct = document.querySelector(".hero-product");

if (heroImage && heroProduct) {
    handleImage(heroImage, heroProduct);
}


// Initialize

loadFeaturedProducts();

// Global cart variables
let cart = [];
let appliedCoupon = null;

// --- Main function to load config first ---
document.addEventListener("DOMContentLoaded", async () => {
    
    let config;
    try {
        // Fetch the config file (add cache-buster)
        const response = await fetch('config.json?v=23'); // Match v=23
        config = await response.json();
    } catch (error) {
        console.error("Failed to load config.json", error);
        // If config fails, use empty defaults
        config = { promoPopup: {}, coupons: [], whatsappNumber: "", featuredCouponCode: "" };
    }

    // --- 1. Sticky Header Scroll Padding ---
    const header = document.querySelector('header');
    function updateScrollPadding() {
        if (header) {
            const headerHeight = header.offsetHeight;
            document.documentElement.style.setProperty('scroll-padding-top', `${headerHeight}px`);
        }
    }
    updateScrollPadding();
    window.addEventListener('resize', updateScrollPadding);

    // --- 2. Nav Scroller ---
    const navLinksContainer = document.getElementById('nav-links-container');
    const scrollLeftBtn = document.getElementById('scroll-left-btn');
    const scrollRightBtn = document.getElementById('scroll-right-btn');
    if (navLinksContainer && scrollLeftBtn && scrollRightBtn) {
        const scrollAmount = 150;
        const updateArrowVisibility = () => {
            const maxScroll = navLinksContainer.scrollWidth - navLinksContainer.clientWidth;
            scrollRightBtn.classList.toggle('hidden', navLinksContainer.scrollLeft >= maxScroll - 1);
            scrollLeftBtn.classList.toggle('hidden', navLinksContainer.scrollLeft <= 0);
        };
        scrollLeftBtn.addEventListener('click', () => navLinksContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
        scrollRightBtn.addEventListener('click', () => navLinksContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
        navLinksContainer.addEventListener('scroll', updateArrowVisibility);
        window.addEventListener('resize', updateArrowVisibility);
        if (typeof ResizeObserver === 'function') {
            new ResizeObserver(updateArrowVisibility).observe(navLinksContainer);
        }
        setTimeout(updateArrowVisibility, 100);
    }

    // --- 3. DYNAMIC Promotional Popup & Marquee ---
    const promo = config.promoPopup;
    const promoPopup = document.getElementById('popup-overlay');
    const closePromoBtn = document.getElementById('close-popup');
    const marqueeContainer = document.getElementById('marquee-container');
    const marqueeText = document.getElementById('marquee-text');

    function isPromoActive() {
        if (!promo || !promo.startDate || !promo.endDate) return false;
        try {
            const today = new Date();
            const [startYear, startMonth, startDay] = promo.startDate.split('-').map(Number);
            const [endYear, endMonth, endDay] = promo.endDate.split('-').map(Number);
            const startDate = new Date(startYear, startMonth - 1, startDay);
            const endDate = new Date(endYear, endMonth - 1, endDay);
            endDate.setHours(23, 59, 59, 999);
            return (today >= startDate && today <= endDate);
        } catch (e) {
            console.error("Error with promo dates:", e);
            return false;
        }
    }

    function showMarquee() {
        // Use the marqueeLines from config.json
        if (marqueeText && marqueeContainer && config.marqueeLines && config.marqueeLines.length > 0) {
            marqueeText.innerText = config.marqueeLines.join(" --- "); // Join with separators
            marqueeContainer.classList.remove('hidden');
        }
    }
    
    if (marqueeContainer) {
        marqueeContainer.addEventListener('mouseover', () => {
            marqueeText.classList.add('paused');
        });
        marqueeContainer.addEventListener('mouseout', () => {
            marqueeText.classList.remove('paused');
        });
        marqueeContainer.addEventListener('touchstart', () => {
            marqueeText.classList.add('paused');
        }, { passive: true });
        marqueeContainer.addEventListener('touchend', () => {
            marqueeText.classList.remove('paused');
        });
    }

    if (promoPopup && closePromoBtn) {
        const lastShown = localStorage.getItem('promoLastShown');
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const now = new Date().getTime();

        if (isPromoActive() && (!lastShown || (now - lastShown > twentyFourHours))) {
            document.getElementById('promo-line-1').innerText = promo.line1;
            document.getElementById('promo-line-2').innerText = promo.line2;
            setTimeout(() => {
                promoPopup.classList.remove('hidden');
                localStorage.setItem('promoLastShown', now.toString());
            }, 10000);
            showMarquee(); // Also show the main marquee
        } else {
            showMarquee(); // Just show the main marquee
        }

        closePromoBtn.addEventListener('click', () => {
            promoPopup.classList.add('hidden');
            // No need to call showMarquee(), it's already running
        });
    }

    // --- 4. Shopping Cart Logic ---
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const addButtons = document.querySelectorAll('.add-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartItemCountEl = document.getElementById('cart-item-count');

    const subtotalAmountEl = document.getElementById('subtotal-amount');
    const discountAmountEl = document.getElementById('discount-amount');
    const totalAmountEl = document.getElementById('total-amount');
    const summaryDiscountEl = document.getElementById('summary-discount');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponCodeInput = document.getElementById('coupon-code');
    const couponMessageEl = document.getElementById('coupon-message');
    const cartContentEl = document.getElementById('cart-content');
    const orderConfirmationEl = document.getElementById('order-confirmation');
    const confirmationSummaryEl = document.getElementById('confirmation-summary');
    const confirmationCloseBtn = document.getElementById('confirmation-close-btn');
    
    // --- THIS IS THE MISSING CODE ---
    const couponHintEl = document.getElementById('coupon-hint');
    if (config.featuredCouponCode && couponHintEl) {
        const featuredCoupon = config.coupons.find(c => c.code === config.featuredCouponCode);
        if (featuredCoupon) {
            let hintText = `Use code ${featuredCoupon.code} for ${featuredCoupon.value * 100}% off`;
            if (featuredCoupon.discountType === 'fixed') {
                hintText = `Use code ${featuredCoupon.code} for ${featuredCoupon.value.toFixed(2)}€ off`;
            }
            if (featuredCoupon.minValue > 0) {
                hintText += ` on orders over ${featuredCoupon.minValue.toFixed(2)}€!`;
            }
            couponHintEl.innerText = hintText;
            couponHintEl.classList.remove('hidden');
        }
    }
    // --- END OF MISSING CODE ---

    const consentCheckbox = document.getElementById('privacy-consent');
    const orderForm = document.getElementById('order-form');
    const emailSubmitBtn = orderForm.querySelector('.checkout-email');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    
    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (confirmationCloseBtn) confirmationCloseBtn.addEventListener('click', closeCart);
    
    function openCart() {
        cartContentEl.classList.remove('hidden');
        orderConfirmationEl.classList.add('hidden');
        cartOverlay.classList.remove('hidden');
        updateCart();
        toggleCheckoutButtons();
    }
    function closeCart() { cartOverlay.classList.add('hidden'); }

    function toggleCheckoutButtons() {
        const isChecked = consentCheckbox.checked;
        emailSubmitBtn.disabled = !isChecked;
        whatsappBtn.disabled = !isChecked;
    }
    consentCheckbox.addEventListener('change', toggleCheckoutButtons);

    addButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const name = button.dataset.name;
            const price = parseFloat(button.dataset.price);
            const category = button.dataset.category;
            addToCart(id, name, price, category);
        });
    });

    function addToCart(id, name, price, category) {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ id, name, price, category, quantity: 1 });
        }
        updateCart();
    }

    function updateCart() {
        cartItemsContainer.innerHTML = "";
        let subtotal = 0;
        let itemCount = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
            appliedCoupon = null;
        }

        cart.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.classList.add('cart-item');
            itemEl.innerHTML = `
                <span class="cart-item-name">${item.name}</span>
                <div class="cart-item-controls">
                    <button class="cart-btn-minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="cart-btn-plus" data-id="${item.id}">+</button>
                </div>
                <span class="cart-item-price">${(item.price * item.quantity).toFixed(2)} €</span>
            `;
            cartItemsContainer.appendChild(itemEl);
            subtotal += item.price * item.quantity;
            itemCount += item.quantity;
        });

        let discountAmount = 0;
        let discountText = "Discount:";

        if (appliedCoupon) {
            let isValid = true;
            let validationMessage = `Code "${appliedCoupon.code}" applied!`;
            let validationClass = 'success';

            const minValue = appliedCoupon.minValue || 0;
            if (subtotal < minValue) {
                isValid = false;
                validationMessage = `Your total is now below ${minValue.toFixed(2)} €. Coupon removed.`;
                validationClass = 'error';
            }

            if (isValid) {
                const category = appliedCoupon.appliesToCategory.toLowerCase();
                if (category !== "all") {
                    const hasMatchingItem = cart.some(item => item.category.toLowerCase() === category);
                    if (!hasMatchingItem) {
                        isValid = false;
                        validationMessage = `Coupon removed (no matching items in cart).`;
                        validationClass = 'error';
                    }
                }
            }

            if (isValid) {
                couponMessageEl.innerText = validationMessage;
                couponMessageEl.className = validationClass;
                
                let discountableSubtotal = 0;
                const category = appliedCoupon.appliesToCategory.toLowerCase();

                if (category === "all") {
                    discountableSubtotal = subtotal;
                } else {
                    cart.forEach(item => {
                        if (item.category.toLowerCase() === category) {
                            discountableSubtotal += item.price * item.quantity;
                        }
                    });
                }

                if (appliedCoupon.discountType === 'fixed') {
                     let applicableItems = 0;
                    cart.forEach(item => {
                        if (item.category.toLowerCase() === category) {
                            applicableItems += item.quantity;
                        }
                    });
                    discountAmount = appliedCoupon.value * applicableItems;
                    discountText = `Discount (${appliedCoupon.code})`;
                } 
                else if (appliedCoupon.discountType === 'percent') {
                    discountAmount = discountableSubtotal * appliedCoupon.value;
                    discountText = `Discount (${(appliedCoupon.value * 100).toFixed(0)}%)`;
                }
                
                discountAmount = Math.min(subtotal, discountAmount);
            } else {
                appliedCoupon = null;
                couponMessageEl.innerText = validationMessage;
                couponMessageEl.className = validationClass;
            }
        }
        
        if (discountAmount > 0) {
            summaryDiscountEl.classList.remove('hidden');
            summaryDiscountEl.querySelector('span').innerText = discountText;
            discountAmountEl.innerText = `-${discountAmount.toFixed(2)} €`;
        } else {
            summaryDiscountEl.classList.add('hidden');
            if (couponMessageEl.className === "success") {
                 couponMessageEl.innerText = "";
                 couponCodeInput.value = "";
            }
        }
        
        let total = subtotal - discountAmount;

        subtotalAmountEl.innerText = `${subtotal.toFixed(2)} €`;
        totalAmountEl.innerText = `${total.toFixed(2)} €`;
        cartItemCountEl.innerText = itemCount;
        
        cartToggleBtn.classList.toggle('hidden', itemCount === 0);
        addCartItemControls();
    }

    function addCartItemControls() {
        document.querySelectorAll('.cart-btn-plus').forEach(btn => {
            btn.addEventListener('click', () => adjustQuantity(btn.dataset.id, 1));
        });
        document.querySelectorAll('.cart-btn-minus').forEach(btn => {
            btn.addEventListener('click', () => adjustQuantity(btn.dataset.id, -1));
        });
    }

    function adjustQuantity(id, amount) {
        const item = cart.find(item => item.id === id);
        if (!item) return;
        item.quantity += amount;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== id);
        }
        updateCart();
    }

    // --- 5. Coupon Logic ---
    applyCouponBtn.addEventListener('click', () => {
        const code = couponCodeInput.value.trim().toUpperCase();
        const coupon = config.coupons.find(c => c.code.toUpperCase() === code);

        appliedCoupon = null;
        couponMessageEl.innerText = "";
        couponMessageEl.className = "";

        if (coupon) {
            let currentSubtotal = 0;
            cart.forEach(item => {
                currentSubtotal += item.price * item.quantity;
            });
            const minValue = coupon.minValue || 0;
            if (currentSubtotal < minValue) {
                couponMessageEl.innerText = `You must spend at least ${minValue.toFixed(2)} € to use this code.`;
                couponMessageEl.className = 'error';
                updateCart();
                return;
            }
            
            const category = coupon.appliesToCategory.toLowerCase();
            if (category !== "all") {
                const hasMatchingItem = cart.some(item => item.category.toLowerCase() === category);
                if (!hasMatchingItem) {
                    couponMessageEl.innerText = `You need a '${category}' item to use this code.`;
                    couponMessageEl.className = 'error';
                    updateCart();
                    return;
                }
            }

            appliedCoupon = coupon;
            couponMessageEl.innerText = `Code "${coupon.code}" applied!`;
            couponMessageEl.className = 'success';
        } else {
            couponMessageEl.innerText = "Invalid code.";
            couponMessageEl.className = 'error';
        }
        updateCart();
    });

    // --- 6. Checkout Logic (AJAX submission) ---
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const { summaryText, total, discountText } = generateOrderSummary();
        const customerName = document.getElementById('customer-name').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerNotes = document.getElementById('customer-notes').value;

        document.getElementById('order-details-input').value = `${summaryText}\n${discountText}`;
        document.getElementById('order-total-input').value = `${total.toFixed(2)} €`;

        const formData = new FormData(orderForm);
        emailSubmitBtn.innerText = "Sending...";
        emailSubmitBtn.disabled = true;

        fetch(orderForm.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        }).then(response => {
            if (response.ok) {
                let finalSummary = `Customer: ${customerName}\nPhone: ${customerPhone}\n\n${summaryText}\n${discountText}Total: ${total.toFixed(2)} €`;
                if (customerNotes) {
                    finalSummary += `\n\nNotes:\n${customerNotes}`;
                }
                
                confirmationSummaryEl.innerText = finalSummary;
                cartContentEl.classList.add('hidden');
                orderConfirmationEl.classList.remove('hidden');
                cart = [];
                appliedCoupon = null;
                orderForm.reset();
                consentCheckbox.checked = false;
                updateCart();
            } else {
                response.json().then(data => {
                    if (Object.hasOwn(data, 'errors')) {
                        alert(data["errors"].map(error => error["message"]).join(", "));
                    } else {
                        alert("Error sending order. Please try again later.");
                    }
                });
            }
        }).catch(error => {
            alert("Error sending order. Please check your internet connection.");
        }).finally(() => {
            emailSubmitBtn.innerText = "Send via Email";
            toggleCheckoutButtons();
        });
    });

    // WhatsApp Submit
    whatsappBtn.addEventListener('click', () => {
        const name = document.getElementById('customer-name').value;
        const phone = document.getElementById('customer-phone').value;
        const notes = document.getElementById('customer-notes').value;
        
        if (!name || !phone) {
            alert("Please enter your name and phone number.");
            return;
        }
        const { summaryText, total, discountText } = generateOrderSummary();
        
        const WHATSAPP_NUMBER = config.whatsappNumber;
        if (!WHATSAPP_NUMBER) {
            alert("WhatsApp number is not configured.");
            return;
        }

        let whatsappMessage = `*New Pickup Order*\n\n*Customer:* ${name}\n*Phone:* ${phone}\n\n*Order:*\n${summaryText}\n${discountText}*Total: ${total.toFixed(2)} €*`;
        
        if (notes) {
            whatsappMessage += `\n\n*Notes:*\n${notes}`;
        }

        let encodedMessage = encodeURIComponent(whatsappMessage);
        let whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
        window.open(whatsappURL, '_blank');
    });

    function generateOrderSummary() {
        let summaryText = "";
        let subtotal = 0;
        cart.forEach(item => {
            summaryText += `${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} €)\n`;
            subtotal += item.price * item.quantity;
        });

        let discountAmount = 0;
        let discountText = "";
        if (appliedCoupon) {
            let discountableSubtotal = 0;
            const category = appliedCoupon.appliesToCategory.toLowerCase();

            if (category === "all") {
                discountableSubtotal = subtotal;
            } else {
                cart.forEach(item => {
                    if (item.category.toLowerCase() === category) {
                        discountableSubtotal += item.price * item.quantity;
                    }
                });
            }

            if (appliedCoupon.discountType === 'fixed') {
                 let applicableItems = 0;
                cart.forEach(item => {
                    if (item.category.toLowerCase() === category) {
                        applicableItems += item.quantity;
                    }
                });
                discountAmount = appliedCoupon.value * applicableItems;
            } 
            else if (appliedCoupon.discountType === 'percent') {
                discountAmount = discountableSubtotal * appliedCoupon.value;
            }
            discountAmount = Math.min(subtotal, discountAmount);
            
            if(discountAmount > 0) {
                 discountText = `Discount (${appliedCoupon.code}): -${discountAmount.toFixed(2)} €\n`;
            }
        }
        
        let total = subtotal - discountAmount;
        return { summaryText, subtotal, discountText, total };
    }
    
    // Initial check on page load
    toggleCheckoutButtons();
});

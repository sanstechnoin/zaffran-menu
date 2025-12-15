// --- 1. ZAFFRAN FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyAVh2kVIuFcrt8Dg88emuEd9CQlqjJxDrA",
  authDomain: "zaffran-delight.firebaseapp.com",
  projectId: "zaffran-delight",
  storageBucket: "zaffran-delight.firebasestorage.app",
  messagingSenderId: "1022960860126",
  appId: "1:1022960860126:web:1e06693dea1d0247a0bb4f"
};

// --- 2. Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let cart = [];

document.addEventListener("DOMContentLoaded", async () => {
    let config = { marqueeLines: [], whatsappNumber: "" };
    try {
        const response = await fetch('config.json?v=24'); 
        config = await response.json();
    } catch (e) { console.warn("Config load failed", e); }

    const marqueeContainer = document.getElementById('marquee-container');
    const marqueeText = document.getElementById('marquee-text');
    if (marqueeText && marqueeContainer && config.marqueeLines && config.marqueeLines.length > 0) {
        marqueeText.innerText = config.marqueeLines.join(" --- ");
        marqueeContainer.classList.remove('hidden');
    }

    const header = document.querySelector('header');
    function updateScrollPadding() {
        if (header) {
            document.documentElement.style.setProperty('scroll-padding-top', `${header.offsetHeight}px`);
        }
    }
    updateScrollPadding();
    window.addEventListener('resize', updateScrollPadding);
    
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartItemCountEl = document.getElementById('cart-item-count');
    const totalAmountEl = document.getElementById('total-amount');
    const cartContentEl = document.getElementById('cart-content');
    const orderConfirmationEl = document.getElementById('order-confirmation');
    const confirmationSummaryEl = document.getElementById('confirmation-summary');
    const confirmationCloseBtn = document.getElementById('confirmation-close-btn');
    const orderForm = document.getElementById('order-form');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const firebaseBtn = document.getElementById('firebase-btn');
    const consentCheckbox = document.getElementById('privacy-consent');

    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (confirmationCloseBtn) confirmationCloseBtn.addEventListener('click', closeCart);
    
    function openCart() {
        cartContentEl.style.display = 'block'; 
        orderConfirmationEl.style.display = 'none'; 
        cartOverlay.classList.remove('hidden');
        updateCart();
        toggleCheckoutButtons();
    }
    function closeCart() { 
        cartOverlay.classList.add('hidden'); 
        setTimeout(() => {
            cartContentEl.style.display = 'block';
            orderConfirmationEl.style.display = 'none';
        }, 500);
    }

    function toggleCheckoutButtons() {
        if (consentCheckbox) {
            const isChecked = consentCheckbox.checked;
            if (whatsappBtn) whatsappBtn.disabled = !isChecked;
            if (firebaseBtn) firebaseBtn.disabled = !isChecked; 
        }
    }
    if (consentCheckbox) consentCheckbox.addEventListener('change', toggleCheckoutButtons);
    toggleCheckoutButtons(); 

    function initItemControls() {
        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.removeEventListener('click', handleAddToCartClick);
            btn.addEventListener('click', handleAddToCartClick);
        });
        document.querySelectorAll('.menu-btn-minus').forEach(btn => {
            btn.removeEventListener('click', handleRemoveFromCartClick);
            btn.addEventListener('click', handleRemoveFromCartClick);
        });
    }
    function handleAddToCartClick() {
        addToCart(this.dataset.id, this.dataset.name, parseFloat(this.dataset.price));
    }
    function handleRemoveFromCartClick() {
        adjustQuantity(this.dataset.id, -1);
    }
    initItemControls(); 
    
    function addToCart(id, name, price) {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) existingItem.quantity++;
        else cart.push({ id, name, price, quantity: 1 });
        updateCart();
    }

    function updateCart() {
        cartItemsContainer.innerHTML = "";
        let subtotal = 0;
        let itemCount = 0;

        document.querySelectorAll('.item-qty').forEach(qtyEl => {
            const item = cart.find(i => i.id === qtyEl.dataset.id);
            const controlsDiv = qtyEl.closest('.quantity-controls');
            if (item) {
                qtyEl.innerText = item.quantity;
                controlsDiv.classList.remove('hidden');
            } else {
                qtyEl.innerText = '1'; 
                controlsDiv.classList.add('hidden');
            }
        });

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p>Ihre Bestellung ist leer.</p>";
        } else {
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                itemCount += item.quantity;
                const itemEl = document.createElement('div');
                itemEl.classList.add('cart-item');
                itemEl.innerHTML = `
                    <span class="cart-item-name">${item.name}</span>
                    <div class="cart-item-controls">
                        <button class="cart-btn-minus" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="cart-btn-plus" data-id="${item.id}">+</button>
                    </div>
                    <span class="cart-item-price">${itemTotal.toFixed(2)} €</span>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }
        totalAmountEl.innerText = `${subtotal.toFixed(2)} €`;
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
        if (item.quantity <= 0) cart = cart.filter(item => item.id !== id);
        updateCart();
    }
    
    // --- 7. Helper function to show confirmation (TEXT BASED) ---
    function showConfirmationScreen(summary) {
        let finalSummary = `Kunde: ${summary.customerName}\nTelefon: ${summary.customerPhone}\n\n${summary.summaryText}\nTotal: ${summary.total.toFixed(2)} €`;
        if (summary.customerNotes) {
            finalSummary += `\n\nAnmerkungen:\n${summary.customerNotes}`;
        }
        
        confirmationSummaryEl.innerText = finalSummary;
        cartContentEl.style.display = 'none'; 
        orderConfirmationEl.style.display = 'block'; 
        cart = [];
        orderForm.reset();
        if (consentCheckbox) consentCheckbox.checked = false;
        updateCart();
    }

    function generateOrderSummary() {
        let summaryText = "";
        let itemsOnly = [];
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            summaryText += `${item.quantity}x ${item.name} (${itemTotal.toFixed(2)} €)\n`;
            total += itemTotal;
            
            itemsOnly.push({
                quantity: item.quantity,
                name: item.name,
                price: item.price
            });
        });
        return { summaryText, total, itemsOnly };
    }

    if(firebaseBtn) {
        firebaseBtn.addEventListener('click', async () => {
            const customerName = document.getElementById('customer-name').value;
            const customerPhone = document.getElementById('customer-phone').value;
            const customerNotes = document.getElementById('customer-notes').value;
            
            if (!customerName || !customerPhone) {
                alert("Bitte geben Sie Namen und Telefonnummer ein.");
                return; 
            }

            const { summaryText, total, itemsOnly } = generateOrderSummary();

            const orderId = `pickup-${new Date().getTime()}`;
            const billingIdentifier = `${customerName} (${customerPhone})`; 
            
            const orderData = {
                id: orderId,
                table: billingIdentifier,
                customerName: customerName,
                customerPhone: customerPhone, 
                notes: customerNotes || null, 
                items: itemsOnly,
                total: total,
                status: "new",
                orderType: "pickup", 
                createdAt: new Date()
            };

            const summary = { summaryText, total, customerName, customerPhone, customerNotes, itemsOnly };

            firebaseBtn.innerText = "Senden...";
            firebaseBtn.disabled = true;

            try {
                await db.collection("orders").doc(orderId).set(orderData);
                showConfirmationScreen(summary);
            } catch (error) {
                console.error("Error sending order: ", error);
                alert("Fehler beim Senden. Bitte erneut versuchen.");
            } finally {
                firebaseBtn.innerText = "An Küche senden (Live)";
                toggleCheckoutButtons();
            }
        });
    }

    if(whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const customerName = document.getElementById('customer-name').value;
            const customerPhone = document.getElementById('customer-phone').value;
            const customerNotes = document.getElementById('customer-notes').value;
            
            if (!customerName || !customerPhone) { alert("Bitte geben Sie Namen und Telefonnummer ein."); return; }

            const { summaryText, total, itemsOnly } = generateOrderSummary();

            const orderId = `pickup-${new Date().getTime()}`;
            const orderData = {
                id: orderId,
                table: `${customerName} (${customerPhone})`,
                customerName, customerPhone, notes: customerNotes,
                items: itemsOnly, total, status: "new", orderType: "pickup", createdAt: new Date()
            };
            db.collection("orders").doc(orderId).set(orderData).catch(e => console.error("Firebase err", e));
            
            const WHATSAPP_NUMBER = config.whatsappNumber;
            if (!WHATSAPP_NUMBER) { alert("WhatsApp-Nummer fehlt."); return; }

            let whatsappMessage = `*Neue Abholbestellung*\n\n*Kunde:* ${customerName}\n*Telefon:* ${customerPhone}\n\n*Bestellung:*\n${summaryText}\n*Total: ${total.toFixed(2)} €*`;
            if (customerNotes) whatsappMessage += `\n\n*Anmerkungen:*\n${customerNotes}`;

            let encodedMessage = encodeURIComponent(whatsappMessage);
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
        });
    }
});

// --- 1. ZAFFRAN FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyAVh2kVIuFcrt8Dg88emuEd9CQlqjJxDrA",
  authDomain: "zaffran-delight.firebaseapp.com",
  projectId: "zaffran-delight",
  storageBucket: "zaffran-delight.firebasestorage.app",
  messagingSenderId: "1022960860126",
  appId: "1:1022960860126:web:1e06693dea1d0247a0bb4f"
};
// --- END OF FIREBASE CONFIG ---

// --- 2. Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let cart = [];

document.addEventListener("DOMContentLoaded", async () => {
    
    let config;
    try {
        const response = await fetch('config.json?v=23'); 
        config = await response.json();
    } catch (error) {
        config = { whatsappNumber: "" };
    }

    // --- 1. Sticky Header Scroll Padding ---
    const header = document.querySelector('header');
    const headerNav = document.querySelector('header nav');
    function updateScrollPadding() {
        if (header) {
            const headerHeight = header.offsetHeight;
            document.documentElement.style.setProperty('scroll-padding-top', `${headerHeight}px`);
            if (headerNav) {
                const navHeight = headerNav.offsetHeight;
                const topPartHeight = headerHeight - navHeight;
                headerNav.style.top = `${topPartHeight}px`;
            }
        }
    }
    updateScrollPadding();
    window.addEventListener('resize', updateScrollPadding);
    
    // --- 4. Shopping Cart Logic ---
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

    const consentCheckbox = document.getElementById('privacy-consent');
    const orderForm = document.getElementById('order-form');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const firebaseBtn = document.getElementById('firebase-btn'); 
    
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
        } else {
            if (whatsappBtn) whatsappBtn.disabled = false;
            if (firebaseBtn) firebaseBtn.disabled = false;
        }
    }
    
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', toggleCheckoutButtons);
    }
    toggleCheckoutButtons(); 

    function initItemControls() {
        document.querySelectorAll('.add-btn').forEach(button => {
            button.removeEventListener('click', handleAddToCartClick);
            button.addEventListener('click', handleAddToCartClick);
        });
        document.querySelectorAll('.menu-btn-minus').forEach(button => {
            button.removeEventListener('click', handleRemoveFromCartClick);
            button.addEventListener('click', handleRemoveFromCartClick);
        });
    }

    function handleAddToCartClick() {
        const button = this; 
        const id = button.dataset.id;
        const name = button.dataset.name;
        const price = parseFloat(button.dataset.price);
        const category = button.dataset.category;
        addToCart(id, name, price, category);
    }
    function handleRemoveFromCartClick() {
        adjustQuantity(this.dataset.id, -1);
    }
    initItemControls(); 
    
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

        document.querySelectorAll('.item-qty').forEach(qtyEl => {
            const id = qtyEl.dataset.id;
            const item = cart.find(i => i.id === id);
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
        
        let total = subtotal;
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
    
    function getOrderData() {
        const { total, itemsOnly } = generateOrderSummary();
        const customerName = document.getElementById('customer-name').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerNotes = document.getElementById('customer-notes').value;
        
        if (!customerName || !customerPhone) {
            alert("Bitte geben Sie Ihren Namen und Ihre Telefonnummer ein.");
            return null; 
        }

        const orderId = `pickup-${new Date().getTime()}`;
        const billingIdentifier = `${customerName} (${customerPhone})`; 
        
        const orderData = {
            id: orderId,
            table: billingIdentifier,
            customerName: customerName,
            customerPhone: customerPhone, 
            notes: customerNotes || null, 
            items: itemsOnly,
            status: "new",
            orderType: "pickup", 
            createdAt: new Date()
        };
        
        // Pass objects for HTML generation
        const summary = {
            itemsOnly,
            total,
            customerName,
            customerPhone,
            customerNotes
        };
        
        return { orderData, summary };
    }
    
    // --- UPDATED CONFIRMATION FOR PICKUP ---
    function showConfirmationScreen(summary) {
        // Build Structured HTML
        let itemsHtml = summary.itemsOnly.map(item => `
            <div class="conf-item">
                <span class="conf-item-qty">${item.quantity}x</span>
                <span class="conf-item-name">${item.name}</span>
                <span class="conf-item-price">${(item.price * item.quantity).toFixed(2)} €</span>
            </div>
        `).join('');

        let html = `
            <div class="conf-header">
                Name: ${summary.customerName}<br>
                Phone: ${summary.customerPhone}
            </div>
            <div class="conf-items-list">
                ${itemsHtml}
            </div>
            <div class="conf-row conf-total-row">
                <span>Total:</span>
                <span>${summary.total.toFixed(2)} €</span>
            </div>
        `;

        if (summary.customerNotes && summary.customerNotes.trim() !== "") {
            html += `
                <div class="conf-notes-section">
                    <span class="conf-notes-label">Notes:</span>
                    <span class="conf-notes-text">${summary.customerNotes}</span>
                </div>
            `;
        }
        
        confirmationSummaryEl.innerHTML = html;
        
        cartContentEl.style.display = 'none'; 
        orderConfirmationEl.style.display = 'block'; 
        cart = [];
        orderForm.reset();
        if (consentCheckbox) {
            consentCheckbox.checked = false;
        }
        updateCart();
    }

    if(firebaseBtn) {
        firebaseBtn.addEventListener('click', async () => {
            const orderPayload = getOrderData();
            if (!orderPayload) return; 
            
            const { orderData, summary } = orderPayload;

            firebaseBtn.innerText = "Senden...";
            firebaseBtn.disabled = true;

            try {
                await db.collection("orders").doc(orderData.id).set(orderData);
                showConfirmationScreen(summary);
            } catch (error) {
                console.error("Error sending order to Firebase: ", error);
                alert("Fehler beim Senden der Bestellung. Bitte versuchen Sie es erneut.");
            } finally {
                firebaseBtn.innerText = "An Küche senden (Live)";
                toggleCheckoutButtons();
            }
        });
    }

    if(whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const orderPayload = getOrderData();
            if (!orderPayload) return;
            
            const { orderData, summary } = orderPayload;
            
            db.collection("orders").doc(orderData.id).set(orderData)
                .catch(e => console.error("Could not save order to Firebase KDS", e));
            
            const WHATSAPP_NUMBER = config.whatsappNumber;
            if (!WHATSAPP_NUMBER) {
                alert("WhatsApp-Nummer ist nicht konfiguriert.");
                return;
            }

            // WhatsApp stays strictly text-based
            let summaryText = "";
            summary.itemsOnly.forEach(item => {
                summaryText += `${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} €)\n`;
            });

            let whatsappMessage = `*Neue Abholbestellung*\n\n*Kunde:* ${summary.customerName}\n*Telefon:* ${summary.customerPhone}\n\n*Bestellung:*\n${summaryText}\n*Total: ${summary.total.toFixed(2)} €*`;
            
            if (summary.customerNotes) {
                whatsappMessage += `\n\n*Anmerkungen:*\n${summary.customerNotes}`;
            }

            let encodedMessage = encodeURIComponent(whatsappMessage);
            let whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
            window.open(whatsappURL, '_blank');
        });
    }

    function generateOrderSummary() {
        let itemsOnly = [];
        let total = 0;
        
        cart.forEach(item => {
            total += item.price * item.quantity;
            itemsOnly.push({
                quantity: item.quantity,
                name: item.name,
                price: item.price
            });
        });
        return { total, itemsOnly };
    }
    
    toggleCheckoutButtons();
});

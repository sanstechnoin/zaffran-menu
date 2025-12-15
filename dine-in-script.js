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

// --- Global variables ---
let cart = [];
let tableNumber = 'Unknown'; 
let lastOrderId = null; 

document.addEventListener("DOMContentLoaded", async () => {
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const table = urlParams.get('table');
        if (table) tableNumber = table;
    } catch (e) { console.error("Error getting table number", e); }
    
    const formboldTableTitleEl = document.getElementById('formbold-table-title');
    if(formboldTableTitleEl) formboldTableTitleEl.innerText = `Table ${tableNumber} Order`;
    const cartTitleEl = document.getElementById('cart-title');
    if(cartTitleEl) cartTitleEl.innerText = `Your Order (Table ${tableNumber})`;
    const tableNumberInput = document.getElementById('table-number-input');
    if (tableNumberInput) tableNumberInput.value = tableNumber;

    let config = { marqueeLines: [] };
    try {
        const response = await fetch('config.json?v=24'); 
        config = await response.json();
    } catch (e) { console.warn("Config not loaded", e); }

    const marqueeContainer = document.getElementById('marquee-container');
    const marqueeText = document.getElementById('marquee-text');
    if (marqueeText && marqueeContainer && config.marqueeLines && config.marqueeLines.length > 0) {
        marqueeText.innerText = config.marqueeLines.join(" --- ");
        marqueeContainer.classList.remove('hidden');
    }

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
    
    const navLinksContainer = document.getElementById('nav-links-container');
    const scrollLeftBtn = document.getElementById('scroll-left-btn');
    const scrollRightBtn = document.getElementById('scroll-right-btn');
    if (navLinksContainer) {
        const checkScroll = () => {
            const maxScroll = navLinksContainer.scrollWidth - navLinksContainer.clientWidth;
            if(scrollLeftBtn) scrollLeftBtn.classList.toggle('hidden', navLinksContainer.scrollLeft <= 0);
            if(scrollRightBtn) scrollRightBtn.classList.toggle('hidden', navLinksContainer.scrollLeft >= maxScroll - 1);
        };
        navLinksContainer.addEventListener('scroll', checkScroll);
        checkScroll();
        if(scrollLeftBtn) scrollLeftBtn.addEventListener('click', () => navLinksContainer.scrollBy({ left: -200, behavior: 'smooth' }));
        if(scrollRightBtn) scrollRightBtn.addEventListener('click', () => navLinksContainer.scrollBy({ left: 200, behavior: 'smooth' }));
    }

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
    const firebaseBtn = document.getElementById('firebase-btn');
    
    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (confirmationCloseBtn) confirmationCloseBtn.addEventListener('click', closeCart);
    
    function openCart() {
        cartContentEl.style.display = 'block';
        orderConfirmationEl.style.display = 'none';
        cartOverlay.classList.remove('hidden');
        updateCart();
    }
    function closeCart() { 
        cartOverlay.classList.add('hidden'); 
        setTimeout(() => {
            cartContentEl.style.display = 'block';
            orderConfirmationEl.style.display = 'none';
        }, 500);
    }

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
        addToCart(this.dataset.id, this.dataset.name, parseFloat(this.dataset.price), this.dataset.category);
    }
    function handleRemoveFromCartClick() {
        adjustQuantity(this.dataset.id, -1);
    }
    initItemControls(); 

    function addToCart(id, name, price, category) {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) existingItem.quantity++;
        else cart.push({ id, name, price, category, quantity: 1 });
        updateCart();
    }

    function updateCart() {
        cartItemsContainer.innerHTML = "";
        let total = 0;
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
            cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
        } else {
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
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
        
        totalAmountEl.innerText = `${total.toFixed(2)} €`;
        cartItemCountEl.innerText = itemCount;
        cartToggleBtn.classList.toggle('hidden', itemCount === 0);
        addCartItemControls(); 
    }

    function addCartItemControls() {
        document.querySelectorAll('#cart-items-container .cart-btn-plus').forEach(btn => {
            btn.addEventListener('click', () => adjustQuantity(btn.dataset.id, 1));
        });
        document.querySelectorAll('#cart-items-container .cart-btn-minus').forEach(btn => {
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

    function generateOrderData() {
        let itemsOnly = []; 
        let summaryText = ""; // NEW: build the text string here
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            // Build the text summary line
            summaryText += `${item.quantity}x ${item.name} (${itemTotal.toFixed(2)} €)\n`;
            
            itemsOnly.push({
                quantity: item.quantity,
                name: item.name,
                price: item.price
            });
        });
        return { total, itemsOnly, summaryText };
    }
    
    // --- SEND TO KITCHEN ---
    firebaseBtn.addEventListener('click', async (e) => {
        e.preventDefault(); 
        
        firebaseBtn.innerText = "Senden...";
        firebaseBtn.disabled = true;

        const { itemsOnly, total, summaryText } = generateOrderData();
        const orderId = `${tableNumber}-${new Date().getTime()}`;
        lastOrderId = orderId; 
        
        const customerNotes = document.getElementById('dine-in-notes').value;

        const orderData = {
            id: orderId,
            table: tableNumber,
            items: itemsOnly,
            total: total,
            status: "new",
            createdAt: new Date(),
            orderType: "dine-in",
            notes: customerNotes || null 
        };

        try {
            await db.collection("orders").doc(orderId).set(orderData);
            showConfirmationScreen(summaryText, total, customerNotes);
        } catch (error) {
            console.error("Error sending order to Firebase: ", error);
            alert("Error sending order. Please try again or call a waiter.");
        } finally {
            firebaseBtn.innerText = "An Küche senden (Live)";
            firebaseBtn.disabled = false;
        }
    });

    // --- UPDATED CONFIRMATION SCREEN (TEXT BASED) ---
    function showConfirmationScreen(summaryText, total, notes) {
        // Construct the full text block with newlines
        let finalSummary = `Table: ${tableNumber}\n\n${summaryText}\nTotal: ${total.toFixed(2)} €`;
        
        if (notes && notes.trim() !== "") {
            finalSummary += `\n\nNotes: ${notes}`;
        }
        
        // Use innerText so \n becomes a line break (handled by pre-wrap CSS)
        confirmationSummaryEl.innerText = finalSummary;
        
        cartContentEl.style.display = 'none';
        orderConfirmationEl.style.display = 'block';

        const cancelBtn = document.getElementById('cancel-order-btn');
        const cancelText = document.getElementById('cancel-timer-text');
        
        if (cancelBtn && cancelText) {
            cancelBtn.style.display = 'block';
            cancelText.style.display = 'block';
            let secondsLeft = 30;
            if (window.cancelTimer) clearInterval(window.cancelTimer);

            cancelText.innerText = `You can cancel this order within ${secondsLeft} seconds.`;

            window.cancelTimer = setInterval(() => {
                secondsLeft--;
                cancelText.innerText = `You can cancel this order within ${secondsLeft} seconds.`;
                if (secondsLeft <= 0) {
                    clearInterval(window.cancelTimer);
                    cancelBtn.style.display = 'none';
                    cancelText.style.display = 'none';
                }
            }, 1000);

            cancelBtn.disabled = false;
            cancelBtn.innerText = "Bestellung stornieren"; 
            cancelBtn.onclick = async () => {
                if (lastOrderId) {
                    cancelBtn.disabled = true;
                    cancelBtn.innerText = "Stornieren...";
                    try {
                        await db.collection("orders").doc(lastOrderId).delete();
                        clearInterval(window.cancelTimer); 
                        confirmationSummaryEl.innerText = `Order ${lastOrderId} has been CANCELLED.`;
                        cancelBtn.style.display = 'none';
                        cancelText.style.display = 'none';
                    } catch (e) {
                        console.error("Error cancelling order:", e);
                        cancelBtn.innerText = "Error!";
                        cancelBtn.disabled = false;
                    }
                }
            };
        }

        cart = [];
        orderForm.reset();
        if(document.getElementById('dine-in-notes')) document.getElementById('dine-in-notes').value = ''; 
        updateCart();
    }
});

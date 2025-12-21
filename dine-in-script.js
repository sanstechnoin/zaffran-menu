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
    
    // --- 3. FETCH CONFIG & MARQUEE (ADDED) ---
    try {
        const response = await fetch('config.json?v=24'); 
        const config = await response.json();
        
        const marqueeContainer = document.getElementById('marquee-container');
        const marqueeText = document.getElementById('marquee-text');
        
        if (marqueeText && marqueeContainer && config.marqueeLines && config.marqueeLines.length > 0) {
            marqueeText.innerText = config.marqueeLines.join(" --- ");
            marqueeContainer.classList.remove('hidden');
        }
    } catch (e) { 
        console.warn("Config/Marquee load failed", e); 
    }
    
    // --- Table & Order Logic ---
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const table = urlParams.get('table');
        if (table) tableNumber = table;
    } catch (e) { console.error("Error getting table number", e); }
    
    const formboldTableTitleEl = document.getElementById('formbold-table-title');
    if(formboldTableTitleEl) formboldTableTitleEl.innerText = `Table ${tableNumber} Order`;
    const cartTitleEl = document.getElementById('cart-title');
    if(cartTitleEl) cartTitleEl.innerText = `Your Order (Table ${tableNumber})`;

    // --- Header Scroll Logic ---
    const header = document.querySelector('header');
    function updateScrollPadding() {
        if (header) {
            document.documentElement.style.setProperty('scroll-padding-top', `${header.offsetHeight}px`);
        }
    }
    updateScrollPadding();
    window.addEventListener('resize', updateScrollPadding);
    
    // --- Cart DOM Elements ---
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
    
    // --- Cart Event Listeners ---
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
    }

    // --- Add/Remove Buttons in Menu ---
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
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ id, name, price, quantity: 1 });
        }
        updateCart();
    }

    function updateCart() {
        cartItemsContainer.innerHTML = "";
        let subtotal = 0;
        let itemCount = 0;

        // Update quantity display on menu items
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
            cartItemsContainer.innerHTML = "<p>Your order is empty.</p>";
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
        
        if (cartToggleBtn) {
            if (itemCount > 0) cartToggleBtn.classList.remove('hidden');
            else cartToggleBtn.classList.add('hidden');
        }
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

    // --- Submit to Firebase (Dine-In) ---
    if(firebaseBtn) {
        firebaseBtn.addEventListener('click', async () => {
            const customerNotes = document.getElementById('dine-in-notes').value;
            
            if (cart.length === 0) {
                alert("Your cart is empty.");
                return;
            }

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

            // Use simple short ID for order
            const orderId = `order-${tableNumber}-${new Date().getTime().toString().slice(-6)}`;
            
            const orderData = {
                id: orderId,
                table: `Table ${tableNumber}`,
                customerName: `Guest (Table ${tableNumber})`, // Placeholder for kitchen view
                notes: customerNotes || "Dine-In",
                items: itemsOnly,
                total: total,
                status: "new",
                orderType: "dine-in",
                createdAt: new Date()
            };

            firebaseBtn.innerText = "Sending...";
            firebaseBtn.disabled = true;

            try {
                await db.collection("orders").doc(orderId).set(orderData);
                
                // Show confirmation
                lastOrderId = orderId; 
                cartContentEl.style.display = 'none';
                orderConfirmationEl.style.display = 'block';
                confirmationSummaryEl.innerText = summaryText + `\nTotal: ${total.toFixed(2)} €\n\nNotes: ${customerNotes}`;
                
                startCancelTimer(); 

            } catch (error) {
                console.error("Error sending order: ", error);
                alert("Error sending order. Please try again.");
                firebaseBtn.innerText = "An Küche senden (Live)";
                firebaseBtn.disabled = false;
            }
        });
        
        // --- Cancel Logic (Optional 30s timer) ---
        function startCancelTimer() {
            const cancelBtn = document.getElementById('cancel-order-btn');
            const cancelText = document.getElementById('cancel-timer-text');
            if(!cancelBtn) return;

            cancelBtn.style.display = 'inline-block';
            cancelText.style.display = 'block';
            
            let secondsLeft = 30;
            cancelText.innerText = `You can cancel this order within ${secondsLeft} seconds.`;
            
            if(window.cancelTimer) clearInterval(window.cancelTimer);
            
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

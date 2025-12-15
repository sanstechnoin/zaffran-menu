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

// --- Global variables ---
let cart = [];
let tableNumber = 'Unknown'; 
let lastOrderId = null; 

document.addEventListener("DOMContentLoaded", async () => {
    
    // --- Get Table Number from URL ---
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const table = urlParams.get('table');
        if (table) {
            tableNumber = table;
        }
    } catch (e) {
        console.error("Error getting table number", e);
    }
    
    // Update UI Texts
    const formboldTableTitleEl = document.getElementById('formbold-table-title');
    if(formboldTableTitleEl) formboldTableTitleEl.innerText = `Table ${tableNumber} Order`;
    
    const cartTitleEl = document.getElementById('cart-title');
    if(cartTitleEl) cartTitleEl.innerText = `Your Order (Table ${tableNumber})`;
    
    const tableNumberInput = document.getElementById('table-number-input');
    if (tableNumberInput) tableNumberInput.value = tableNumber;

    // --- Navigation & Header Logic (Keep existing) ---
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
        scrollLeftBtn.addEventListener('click', () => navLinksContainer.scrollBy({ left: -200, behavior: 'smooth' }));
        scrollRightBtn.addEventListener('click', () => navLinksContainer.scrollBy({ left: 200, behavior: 'smooth' }));
    }

    // --- Cart Logic ---
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

    // Item Controls (Plus/Minus)
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
        const id = this.dataset.id;
        const name = this.dataset.name;
        const price = parseFloat(this.dataset.price);
        const category = this.dataset.category;
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
        let total = 0;
        let itemCount = 0;
        
        // Update counts on main menu
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
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== id);
        }
        updateCart();
    }

    // --- CRITICAL: GENERATE DATA FOR CONFIRMATION ---
    function generateOrderData() {
        let itemsOnly = []; 
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            itemsOnly.push({
                quantity: item.quantity,
                name: item.name,
                price: item.price
            });
        });
        return { total, itemsOnly };
    }
    
    // --- SEND TO KITCHEN ---
    firebaseBtn.addEventListener('click', async (e) => {
        e.preventDefault(); 
        
        firebaseBtn.innerText = "Senden...";
        firebaseBtn.disabled = true;

        const { itemsOnly, total } = generateOrderData();
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
            showConfirmationScreen(itemsOnly, total, customerNotes);
        } catch (error) {
            console.error("Error sending order to Firebase: ", error);
            alert("Error sending order. Please try again or call a waiter.");
        } finally {
            firebaseBtn.innerText = "An Küche senden (Live)";
            firebaseBtn.disabled = false;
        }
    });

    // --- UPDATED SHOW CONFIRMATION (Uses HTML) ---
    function showConfirmationScreen(items, total, notes) {
        // 1. Build the Items HTML list
        let itemsHtml = items.map(item => `
            <div class="conf-item">
                <span class="conf-item-qty">${item.quantity}x</span>
                <span class="conf-item-name">${item.name}</span>
                <span class="conf-item-price">${(item.price * item.quantity).toFixed(2)} €</span>
            </div>
        `).join('');

        // 2. Build the Notes HTML (if any)
        let notesHtml = '';
        if (notes && notes.trim() !== "") {
            notesHtml = `
                <div class="conf-notes-section">
                    <span class="conf-notes-label">Notes:</span>
                    <span class="conf-notes-text">${notes}</span>
                </div>
            `;
        }

        // 3. Construct Full Receipt HTML
        let html = `
            <div class="conf-header">
                Table: ${tableNumber}
            </div>
            <div class="conf-items-list">
                ${itemsHtml}
            </div>
            <div class="conf-total-row">
                <span>Total:</span>
                <span>${total.toFixed(2)} €</span>
            </div>
            ${notesHtml}
        `;

        // 4. Inject into the DOM
        confirmationSummaryEl.innerHTML = html;
        
        // 5. Toggle Screens
        cartContentEl.style.display = 'none';
        orderConfirmationEl.style.display = 'block';

        // 6. Handle Cancellation Logic
        const cancelBtn = document.getElementById('cancel-order-btn');
        const cancelText = document.getElementById('cancel-timer-text');
        
        if (cancelBtn && cancelText) {
            cancelBtn.style.display = 'block';
            cancelText.style.display = 'block';
            let secondsLeft = 30;
            
            // Clear any existing intervals to prevent double-counting
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
                        
                        // Update the HTML to show cancelled status
                        confirmationSummaryEl.innerHTML = `
                            <div style="text-align:center; padding:20px;">
                                <h3 style="color:#e04040;">Order Cancelled</h3>
                                <p>Order ID: ${lastOrderId} has been removed.</p>
                            </div>
                        `;
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

        // 7. Clear Cart Logic
        cart = [];
        orderForm.reset();
        if(document.getElementById('dine-in-notes')) document.getElementById('dine-in-notes').value = ''; 
        updateCart();
    }
});

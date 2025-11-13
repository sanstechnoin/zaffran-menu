// --- 1. ZAFFRAN FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyAVh2kVIuFcrt8Dg88emuEd9CQlqjJxDrA",
  authDomain: "zaffran-delight.firebaseapp.com",
  projectId: "zaffran-delight",
  storageBucket: "zaffran-delight.firebasestorage.app",
  messagingSenderId: "1022960860126",
  appId: "1:102296POST_YOUR_CHOSEN_CODE_HERE_TO_VERIFY_THE_FIX"
};
// --- END OF FIREBASE CONFIG ---

// --- 2. Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Global variables ---
let cart = [];
let tableNumber = 'Unknown'; // Default table number
let lastOrderId = null; // For the 30-second cancel feature

// --- Main function ---
document.addEventListener("DOMContentLoaded", async () => {
    
    // --- Get Table Number from URL ---
    // (This part is not active for Zaffran, but we keep the logic)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const table = urlParams.get('table');
        if (table) {
            tableNumber = table;
        }
    } catch (e) {
        console.error("Could not get table number from URL", e);
    }
    
    // --- Update Titles in Cart ---
    const formboldTableTitleEl = document.getElementById('formbold-table-title');
    if(formboldTableTitleEl) {
        formboldTableTitleEl.innerText = `Table ${tableNumber} Order`;
    }
    const cartTitleEl = document.getElementById('cart-title');
    if(cartTitleEl) {
        cartTitleEl.innerText = `Your Order (Table ${tableNumber})`;
    }
    const tableNumberInput = document.getElementById('table-number-input');
    if (tableNumberInput) {
        tableNumberInput.value = tableNumber;
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
    
    // --- 2. Nav Scroller (with arrows) ---
    const navLinksContainer = document.getElementById('nav-links-container');
    const scrollLeftBtn = document.getElementById('scroll-left-btn');
    const scrollRightBtn = document.getElementById('scroll-right-btn');

    function checkScroll() {
        if (!navLinksContainer) return;
        const maxScroll = navLinksContainer.scrollWidth - navLinksContainer.clientWidth;
        scrollLeftBtn.classList.toggle('hidden', navLinksContainer.scrollLeft <= 0);
        scrollRightBtn.classList.toggle('hidden', navLinksContainer.scrollLeft >= maxScroll - 1);
    }
    
    if (navLinksContainer) {
        scrollLeftBtn.addEventListener('click', () => {
            navLinksContainer.scrollBy({ left: -200, behavior: 'smooth' });
        });
        scrollRightBtn.addEventListener('click', () => {
            navLinksContainer.scrollBy({ left: 200, behavior: 'smooth' });
        });
        navLinksContainer.addEventListener('scroll', checkScroll);
        // Check on load/resize
        checkScroll();
        window.addEventListener('resize', checkScroll);
    }


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
    initItemControls(); // <-- Initial call to add listeners

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
            total += item.price * item.quantity;
            itemCount += item.quantity;
        });
        totalAmountEl.innerText = `${total.toFixed(2)} €`;
        cartItemCountEl.innerText = itemCount;
        cartToggleBtn.classList.toggle('hidden', itemCount === 0);
        
        addCartItemControls(); // This adds listeners inside the cart modal
        
        // --- THIS IS THE FIX ---
        // This re-adds listeners to the main menu buttons after they are updated.
        initItemControls();    
        // --- END OF FIX ---
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
    function generateOrderSummary() {
        let summaryText = "";
        let total = 0;
        let itemsOnly = []; 
        cart.forEach(item => {
            summaryText += `${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} €)\n`;
            total += item.price * item.quantity;
            itemsOnly.push({
                quantity: item.quantity,
                name: item.name,
                price: item.price // Send price to Firebase
            });
        });
        return { summaryText, total, itemsOnly };
    }
    
    // --- 6. CHECKOUT LOGIC ---

    // Send to Kitchen Button
    firebaseBtn.addEventListener('click', async (e) => {
        e.preventDefault(); 
        
        firebaseBtn.innerText = "Senden...";
        firebaseBtn.disabled = true;

        const { itemsOnly } = generateOrderSummary();
        const orderId = `${tableNumber}-${new Date().getTime()}`;
        lastOrderId = orderId; // Save for cancellation
        
        // Get notes from the textarea
        const customerNotes = document.getElementById('dine-in-notes').value;

        const orderData = {
            id: orderId,
            table: tableNumber,
            items: itemsOnly,
            status: "new",
            createdAt: new Date(),
            orderType: "dine-in", // Specify order type
            notes: customerNotes || null // Add notes
        };

        try {
            await db.collection("orders").doc(orderId).set(orderData);
            showConfirmationScreen();
        } catch (error) {
            console.error("Error sending order to Firebase: ", error);
            alert("Error sending order. Please try again or call a waiter.");
        } finally {
            firebaseBtn.innerText = "An Küche senden (Live)";
            firebaseBtn.disabled = false;
        }
    });


    // --- Helper function to show confirmation ---
    function showConfirmationScreen() {
        const { summaryText, total } = generateOrderSummary();
        let finalSummary = `Table: ${tableNumber}\n\n${summaryText}\nTotal: ${total.toFixed(2)} €`;
        
        const customerNotes = document.getElementById('dine-in-notes').value;
        if (customerNotes) {
            finalSummary += `\n\nNotes: ${customerNotes}`;
        }
        
        confirmationSummaryEl.innerText = finalSummary;
        cartContentEl.style.display = 'none';
        orderConfirmationEl.style.display = 'block';

        // --- 30-Second Cancel Logic ---
        const cancelBtn = document.getElementById('cancel-order-btn');
        const cancelText = document.getElementById('cancel-timer-text');
        if (cancelBtn && cancelText) {
            cancelBtn.style.display = 'block';
            cancelText.style.display = 'block';
            let secondsLeft = 30;
            cancelText.innerText = `You can cancel this order within ${secondsLeft} seconds.`;

            const timerInterval = setInterval(() => {
                secondsLeft--;
                cancelText.innerText = `You can cancel this order within ${secondsLeft} seconds.`;
                
                if (secondsLeft <= 0) {
                    clearInterval(timerInterval);
                    cancelBtn.style.display = 'none';
                    cancelText.style.display = 'none';
                }
            }, 1000);

            cancelBtn.disabled = false;
            cancelBtn.innerText = "Bestellung stornieren"; // Reset button text
            cancelBtn.onclick = async () => {
                if (lastOrderId) {
                    cancelBtn.disabled = true;
                    cancelBtn.innerText = "Stornieren...";
                    try {
                        await db.collection("orders").doc(lastOrderId).delete();
                        clearInterval(timerInterval); 
                        
                        confirmationSummaryEl.innerText = `Order ${lastOrderId} has been successfully cancelled.`;
                        cancelBtn.style.display = 'none';
                        cancelText.style.display = 'none';
                        
                    } catch (e) {
                        console.error("Error cancelling order:", e);
                        cancelBtn.innerText = "Error!";
                    }
                }
            };
        }
        // --- END OF CANCEL LOGIC ---

        cart = [];
        orderForm.reset();
        document.getElementById('dine-in-notes').value = ''; // Clear notes
        updateCart();
    }
});

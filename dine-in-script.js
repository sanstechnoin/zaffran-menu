// Global cart variable
let cart = [];
let tableNumber = "Unknown";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Get Table Number from URL ---
    const params = new URLSearchParams(window.location.search);
    tableNumber = params.get('table') || "Unknown";
    
    // NEW: Find the new heading element and set its text
    const formboldTableTitleEl = document.getElementById('formbold-table-title');
    if(formboldTableTitleEl) {
        formboldTableTitleEl.innerText = `Table ${tableNumber} Order`;
    }

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

    // --- 3. Shopping Cart Logic ---
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const addButtons = document.querySelectorAll('.add-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartItemCountEl = document.getElementById('cart-item-count');
    const totalAmountEl = document.getElementById('total-amount');
    
    const cartContentEl = document.getElementById('cart-content');
    const orderConfirmationEl = document.getElementById('order-confirmation');
    const confirmationSummaryEl = document.getElementById('confirmation-summary');
    const confirmationCloseBtn = document.getElementById('confirmation-close-btn');

    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (confirmationCloseBtn) confirmationCloseBtn.addEventListener('click', closeCart);
    
    function openCart() {
        cartContentEl.classList.remove('hidden');
        orderConfirmationEl.classList.add('hidden');
        cartOverlay.classList.remove('hidden');
    }
    function closeCart() { cartOverlay.classList.add('hidden'); }

    addButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const name = button.dataset.name;
            const price = parseFloat(button.dataset.price);
            addToCart(id, name, price);
        });
    });

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
        let total = 0;
        let itemCount = 0;

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

    // --- 4. Checkout Logic ---
    const orderForm = document.getElementById('order-form');
    
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const { summaryText, total } = generateOrderSummary();
        
        // Populate hidden fields
        document.getElementById('table-number-input').value = tableNumber;
        document.getElementById('order-details-input').value = summaryText;
        document.getElementById('order-total-input').value = `${total.toFixed(2)} €`;

        const formData = new FormData(orderForm);
        const submitButton = orderForm.querySelector('.checkout-email');
        submitButton.innerText = "Sending...";
        submitButton.disabled = true;

        fetch(orderForm.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        }).then(response => {
            if (response.ok) {
                const finalSummary = `Table: ${tableNumber}\n\n${summaryText}\nTotal: ${total.toFixed(2)} €`;
                confirmationSummaryEl.innerText = finalSummary;
                
                cartContentEl.classList.add('hidden');
                orderConfirmationEl.classList.remove('hidden');
                
                cart = [];
                orderForm.reset();
                updateCart();
            } else {
                alert("Error sending order. Please try again.");
            }
        }).catch(error => {
            alert("Order failed. Please check your internet connection.");
        }).finally(() => {
            submitButton.innerText = "Order Now";
            submitButton.disabled = false;
        });
    });

    function generateOrderSummary() {
        let summaryText = "";
        let total = 0;
        cart.forEach(item => {
            summaryText += `${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} €)\n`;
            total += item.price * item.quantity;
        });
        return { summaryText, total };
    }
});

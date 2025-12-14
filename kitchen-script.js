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

// --- 3. Global State and DOM Elements ---
// THIS FIXES THE "STUCK LOGIN" BUG by waiting for the page to load
document.addEventListener("DOMContentLoaded", () => {

    const connectionIconEl = document.getElementById('connection-icon'); 
    const newOrderPopup = document.getElementById('new-order-popup-overlay');
    const popupOrderDetails = document.getElementById('popup-order-details');
    const acceptOrderBtn = document.getElementById('accept-order-btn');

    // KDS Login
    const loginOverlay = document.getElementById('kitchen-login-overlay');
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('kitchen-password');
    const loginError = document.getElementById('login-error');
    const kdsContentWrapper = document.getElementById('kds-content-wrapper');

    // KDS Grid Elements
    const dineInGrid = document.getElementById('dine-in-grid');
    const pickupGrid = document.getElementById('pickup-grid');

    let orderQueue = []; // For stacking popups
    let currentPopupOrder = null; // The order currently in the popup
    let allOrders = {}; // Holds all active orders, keyed by order.id
    let notificationAudio = new Audio('notification.mp3'); 

    const KITCHEN_PASSWORD = "zafran"; // <-- NEW PASSWORD
    const TOTAL_DINE_IN_TABLES = 12; // We'll use 12 tables for Zaffran too

    // --- 4. KDS Login Logic ---
    loginButton.addEventListener('click', () => {
        if (passwordInput.value === KITCHEN_PASSWORD) {
            loginOverlay.classList.add('hidden');
            kdsContentWrapper.style.opacity = '1';
            initializeKDS(); 
        } else {
            loginError.style.display = 'block';
        }
    });
    passwordInput.addEventListener('keyup', (e) => e.key === 'Enter' && loginButton.click());


    // --- 5. Main KDS Functions ---

    /**
     * Creates the 12 empty dine-in tables on page load.
     */
    function createDineInTables() {
        dineInGrid.innerHTML = ''; // Clear grid
        for (let i = 1; i <= TOTAL_DINE_IN_TABLES; i++) {
            const tableBox = document.createElement('div');
            tableBox.className = 'table-box';
            tableBox.id = `table-${i}`; // e.g., table-1
            tableBox.innerHTML = `
                <div class="table-header">
                    <h2>Table ${i}</h2>
                </div>
                <ul class="order-list" data-table-id="${i}">
                    </ul>
                <p class="order-list-empty" data-table-id="${i}">Waiting for order...</p>
                <button class="clear-table-btn" data-table-id="${i}">Mark Ready</button>
            `;
            dineInGrid.appendChild(tableBox);
        }
    }

    /**
     * Initializes the main Firestore listener.
     */
    function initializeKDS() {
        // 1. Create the empty tables first
        createDineInTables();

        // 2. Add listeners for all "Clear" buttons (Dine-In)
        dineInGrid.querySelectorAll('.clear-table-btn').forEach(btn => {
            btn.addEventListener('click', () => handleClearOrder(btn.dataset.tableId, 'dine-in', btn));
        });

        // 3. Start the main listener
        db.collection("orders")
          .where("status", "in", ["new", "seen"]) 
          .onSnapshot(
            (snapshot) => {
                connectionIconEl.textContent = '✅'; 
                
                let changedTables = new Set(); 
                let changedPickupCustomers = new Set(); 

                snapshot.docChanges().forEach((change) => {
                    const orderData = change.doc.data();
                    
                    if(orderData.orderType === 'pickup') {
                        changedPickupCustomers.add(orderData.table); // 'table' holds the "Name (Phone)"
                    } else {
                        changedTables.add(orderData.table); 
                    }
                    
                    if (change.type === "added") {
                        console.log("New order received:", orderData.id);
                        allOrders[orderData.id] = orderData;
                        
                        orderQueue.push(orderData);
                        if (orderQueue.length === 1 && newOrderPopup.classList.contains('hidden')) {
                            showNextOrderInQueue();
                        }
                    }
                    
                    if (change.type === "removed") {
                        console.log("Order removed:", orderData.id);
                        if (allOrders[orderData.id]) {
                            delete allOrders[orderData.id];
                        }
                    }
                    
                    if (change.type === "modified") {
                        console.log("Order modified (seen):", orderData.id);
                        allOrders[orderData.id] = orderData;
                    }
                });
                
                renderPickupGrid(); 

                changedTables.forEach(tableIdentifier => {
                    if (!isNaN(parseInt(tableIdentifier))) { 
                        renderDineInTable(tableIdentifier);
                    }
                });

            },
            (error) => {
                console.error("Error connecting to Firestore: ", error);
                connectionIconEl.textContent = '❌'; 
            }
        );
    } // End of initializeKDS()


    /**
     * Re-renders a single Dine-In table box
     */
    function renderDineInTable(tableId) {
        const tableBox = document.getElementById(`table-${tableId}`);
        if (!tableBox) return; 
        
        const orderList = tableBox.querySelector('.order-list');
        const emptyMsg = tableBox.querySelector('.order-list-empty');
        const clearBtn = tableBox.querySelector('.clear-table-btn'); 

        const ordersForThisTable = Object.values(allOrders).filter(o => o.table === tableId && o.orderType !== 'pickup');
        
        orderList.innerHTML = ""; 
        
        if (ordersForThisTable.length === 0) {
            orderList.style.display = 'none';
            
            // --- FIX for "Clearing..." text bug ---
            emptyMsg.textContent = "Waiting for order..."; 
            emptyMsg.style.display = 'block';
            
            // --- FIX for "Greyed out" button bug ---
            clearBtn.disabled = false;
            clearBtn.textContent = `Mark Ready`;
            // --- END OF FIXES ---

        } else {
            orderList.style.display = 'block';
            emptyMsg.style.display = 'none';
            
            ordersForThisTable.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
            
            ordersForThisTable.forEach(order => {
                const orderTimestamp = order.createdAt.toDate().toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let itemsHtml = order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
                
                // --- ADDED NOTES ---
                let notesHtml = '';
                if (order.notes && order.notes.trim() !== '') {
                    notesHtml = `<p class="order-notes">⚠️ Notes: ${order.notes}</p>`;
                }

                const orderGroupHtml = `
                    <div class="order-group" id="${order.id}">
                        <h4>Order @ ${orderTimestamp}</h4>
                        <ul>
                            ${itemsHtml}
                        </ul>
                        ${notesHtml} 
                    </div>
                `;
                orderList.innerHTML += orderGroupHtml;
            });

            tableBox.classList.add('new-order-flash');
            setTimeout(() => tableBox.classList.remove('new-order-flash'), 1500);
        }
    }

    /**
     * Re-renders the entire Pickup Order grid
     */
    function renderPickupGrid() {
        pickupGrid.innerHTML = ''; // Clear grid
        
        const pickupOrders = Object.values(allOrders).filter(o => o.orderType === 'pickup');
        pickupOrders.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

        if (pickupOrders.length === 0) {
            pickupGrid.innerHTML = `
                <div class="pickup-box-empty">
                    <p>Waiting for pickup orders...</p>
                </div>`;
            return;
        }

        pickupOrders.forEach(order => {
            const orderTimestamp = order.createdAt.toDate().toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            let itemsHtml = order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');

            // --- ADDED NOTES ---
            let notesHtml = '';
            if (order.notes && order.notes.trim() !== '') {
                notesHtml = `<p class="order-notes">⚠️ Notes: ${order.notes}</p>`;
            }

            const pickupBox = document.createElement('div');
            pickupBox.className = 'pickup-box';
            pickupBox.id = `pickup-${order.id}`;
            pickupBox.innerHTML = `
                <div class="table-header">
                    <h2>🛍️ ${order.table}</h2> <span class="order-time">@ ${orderTimestamp}</span>
                </div>
                <ul class="order-list">
                    ${itemsHtml}
                </ul>
                ${notesHtml} 
                <button class="clear-pickup-btn" data-order-id="${order.id}">Mark Ready</button>
            `;
            pickupGrid.appendChild(pickupBox);

            // Add listener for this new button
            const clearBtn = pickupBox.querySelector('.clear-pickup-btn');
            clearBtn.addEventListener('click', () => {
                handleClearOrder(order.id, 'pickup', clearBtn);
            });
        });
    }


    /**
     * Handles "Mark Ready" or "Order Complete" button clicks
     */
    async function handleClearOrder(identifier, type, buttonElement) {
        let ordersToClear = [];
        // --- FIX for "Clearing..." text bug ---
        // Only select the button element, not the text
        let buttonsToDisable = [buttonElement]; 

        if (type === 'dine-in') {
            ordersToClear = Object.values(allOrders).filter(o => o.table === identifier && o.orderType !== 'pickup');
            buttonsToDisable = document.querySelectorAll(`button[data-table-id="${identifier}"]`);
        } else {
            // 'identifier' is the unique order.id
            const orderToClear = allOrders[identifier];
            if (orderToClear) {
                ordersToClear = [orderToClear];
            }
        }

        if (ordersToClear.length === 0) {
            console.log(`No orders to clear for ${identifier}.`);
            return;
        }

        buttonsToDisable.forEach(btn => {
            btn.disabled = true;
            btn.textContent = "Updating...";
        });

        const batch = db.batch();
        ordersToClear.forEach(order => {
            const docRef = db.collection("orders").doc(order.id);
            // CHANGE: Set status to 'ready' instead of 'cooked'
            batch.update(docRef, { status: "ready" }); 
        });

        try {
            await batch.commit();
            console.log(`Successfully marked all orders 'ready' for ${identifier}.`);
            // onSnapshot will handle the UI update
        } catch (e) {
            console.error(`Error clearing ${identifier}: `, e);
            buttonsToDisable.forEach(btn => {
                btn.disabled = false;
                btn.textContent = `Mark Ready`;
            });
        }
    }

    // --- 6. Popup Queue Functions ---

    function showNextOrderInQueue() {
        if (orderQueue.length === 0) {
            currentPopupOrder = null;
            return; 
        }
        
        currentPopupOrder = orderQueue.shift(); 
        
        let itemsHtml = currentPopupOrder.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
        
        let title = '';
        if (currentPopupOrder.orderType === 'pickup') {
            title = `🛍️ Pickup for ${currentPopupOrder.table}`; // 'table' holds "Name (Phone)"
        } else {
            title = `🔔 Table ${currentPopupOrder.table}`;
        }

        // --- ADDED NOTES ---
        let notesHtml = '';
        if (currentPopupOrder.notes && currentPopupOrder.notes.trim() !== '') {
            notesHtml = `<p class="popup-notes">⚠️ Notes: ${currentPopupOrder.notes}</p>`;
        }

        popupOrderDetails.innerHTML = `
            <h4>${title}</h4>
            <ul>${itemsHtml}</ul>
            ${notesHtml} 
        `;
        
        newOrderPopup.classList.remove('hidden');
        notificationAudio.play().catch(e => console.warn("Could not play audio:", e));
    }

    function hideNewOrderPopup() {
        newOrderPopup.classList.add('hidden');
        currentPopupOrder = null;
    }

    // --- 7. Event Listener for Popup Button ---

    acceptOrderBtn.addEventListener('click', () => {
        const acceptedOrder = currentPopupOrder; 
        
        hideNewOrderPopup();
        showNextOrderInQueue();
        
        if (acceptedOrder) {
             db.collection("orders").doc(acceptedOrder.id).update({
                 status: "seen"
             }).catch(e => console.error("Error updating doc status:", e));
        }
    });

}); // --- END OF DOMContentLoaded WRAPPER ---

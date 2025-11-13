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
document.addEventListener("DOMContentLoaded", () => {
    const connectionIconEl = document.getElementById('connection-icon');
    const loginOverlay = document.getElementById('records-login-overlay');
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('records-password');
    const loginError = document.getElementById('login-error');
    const contentWrapper = document.getElementById('records-content-wrapper');

    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const filterBtn = document.getElementById('filter-btn');
    const printBtn = document.getElementById('print-btn');

    const totalRevenueEl = document.getElementById('total-revenue');
    const totalOrdersEl = document.getElementById('total-orders');
    const recordsListEl = document.getElementById('records-list');

    const RECORDS_PASSWORD = "zafran"; // <-- NEW PASSWORD
    let allFetchedRecords = []; 

    // --- 4. Login Logic ---
    loginButton.addEventListener('click', () => {
        if (passwordInput.value === RECORDS_PASSWORD) {
            loginOverlay.classList.add('hidden');
            contentWrapper.style.opacity = '1'; 
            initializeRecordsPage(); 
        } else {
            loginError.style.display = 'block';
        }
    });
    passwordInput.addEventListener('keyup', (e) => e.key === 'Enter' && loginButton.click());

    function initializeRecordsPage() {
        connectionIconEl.textContent = '✅'; 
        
        const today = new Date().toISOString().split('T')[0];
        startDateInput.value = today;
        endDateInput.value = today;

        filterBtn.addEventListener('click', fetchRecords);
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    async function fetchRecords() {
        let startDate = new Date(startDateInput.value + 'T00:00:00');
        let endDate = new Date(endDateInput.value + 'T23:59:59');

        if (isNaN(startDate) || isNaN(endDate)) {
            alert("Please select valid start and end dates.");
            return;
        }

        if (endDate < startDate) {
            alert("End date must be after the start date.");
            return;
        }

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        oneYearAgo.setHours(0, 0, 0, 0); 

        if (startDate < oneYearAgo) {
            alert("Cannot fetch data older than 1 year. Setting start date to 1 year ago.");
            startDate = oneYearAgo;
            startDateInput.value = oneYearAgo.toISOString().split('T')[0];
        }

        filterBtn.disabled = true;
        filterBtn.textContent = "Loading...";
        recordsListEl.innerHTML = "<p>Loading records...</p>";

        try {
            // --- THIS IS THE FIX ---
            // Query must order by "asc" (ascending) to work with the index
            const query = db.collection("archived_orders")
                .where("closedAt", ">=", firebase.firestore.Timestamp.fromDate(startDate))
                .where("closedAt", "<=", firebase.firestore.Timestamp.fromDate(endDate))
                .orderBy("closedAt", "asc"); 
            // --- END OF FIX ---

            const snapshot = await query.get();
            
            // --- THIS IS THE FIX (Part 2) ---
            // We get the records in oldest-first ("asc"), then reverse them
            // so they appear newest-first on the page.
            const records = snapshot.docs.map(doc => doc.data());
            allFetchedRecords = records.reverse(); 
            // --- END OF FIX ---
            
            renderRecords(allFetchedRecords);
            calculateSummary(allFetchedRecords);

        } catch (error) {
            console.error("Error fetching records: ", error);
            recordsListEl.innerHTML = `<p style="color: red;">Error: ${error.message}. You may need to create a Firestore Index. See console (F12) for details.</p>`;
        } finally {
            filterBtn.disabled = false;
            filterBtn.textContent = "Filter Records";
        }
    }

    function renderRecords(records) {
        recordsListEl.innerHTML = ""; 

        if (records.length === 0) {
            recordsListEl.innerHTML = "<p>No records found for this date range.</p>";
            return;
        }

        records.forEach(record => {
            const recordDate = record.closedAt.toDate().toLocaleString('de-DE', {
                dateStyle: 'short',
                timeStyle: 'short'
            });
            
            const details = document.createElement('details');
            details.className = 'record-item';

            const summary = document.createElement('summary');
            summary.className = 'record-summary';
            
            // Check if it was a pickup order (it has '(' in the name)
            const isPickup = record.table.includes('(');
            const tableDisplay = isPickup ? `🛍️ ${record.table}` : `Table ${record.table}`;
            
            summary.innerHTML = `
                <span class="record-date">${recordDate}</span>
                <span class="record-table">${tableDisplay}</span>
                <span class="record-total">${record.total.toFixed(2)} €</span>
            `;

            const itemsList = document.createElement('div');
            itemsList.className = 'record-item-details';
            
            let itemsHtml = '<ul>';
            record.items.forEach(item => {
                const price = item.price || 0;
                itemsHtml += `<li>${item.quantity}x ${item.name} (${price.toFixed(2)} €)</li>`;
            });
            itemsHtml += '</ul>';
            itemsList.innerHTML = itemsHtml;

            details.appendChild(summary);
            details.appendChild(itemsList);
            recordsListEl.appendChild(details);
        });
    }

    function calculateSummary(records) {
        let totalRevenue = 0;
        records.forEach(record => {
            totalRevenue += (record.total || 0);
        });

        totalRevenueEl.textContent = `${totalRevenue.toFixed(2)} €`;
        totalOrdersEl.textContent = records.length;
    }
}); // --- END OF DOMContentLoaded WRAPPER ---

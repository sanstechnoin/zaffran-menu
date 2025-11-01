// Wait for the full page to load before running the script
document.addEventListener("DOMContentLoaded", function() {

    // Get the popup elements from the HTML
    const popupOverlay = document.getElementById("popup-overlay");
    const closeButton = document.getElementById("close-popup");

    // --- Function to show the popup ---
    function showPopup() {
        if (popupOverlay) {
            popupOverlay.classList.remove("hidden");
        }
    }

    // --- Function to hide the popup ---
    function hidePopup() {
        if (popupOverlay) {
            popupOverlay.classList.add("hidden");
        }
    }

    // --- Event Listener ---
    // When the user clicks the "Close" button, hide the popup
    if (closeButton) {
        closeButton.addEventListener("click", hidePopup);
    }
    
    // Also hide the popup if the user clicks on the dark background overlay
    if (popupOverlay) {
        popupOverlay.addEventListener("click", function(event) {
            // Only hide if they click the overlay itself, not the white box
            if (event.target === popupOverlay) {
                hidePopup();
            }
        });
    }

    // --- Timer ---
    // This is the "time to time" logic.
    // It will show the popup 10 seconds after the page loads.
    setTimeout(showPopup, 10000); // 10000 milliseconds = 10 seconds

    // If you want it to appear REPEATEDLY (e.g., every 2 minutes),
    // you would use this line INSTEAD of the setTimeout line:
    // setInterval(showPopup, 120000); // 120000 ms = 2 minutes
    
    // For now, it will just show once, 10 seconds after the user opens the menu.
});
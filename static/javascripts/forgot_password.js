document.getElementById("forgot-password").addEventListener("click", function() {
    // Prompt the user for their username
    var username = prompt("Please enter your username:");

    // Check if the username is not null and not an empty string
    if (username && username.trim() !== "") {
        // Send an AJAX request to the backend to retrieve the password
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/forgot_password");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function() {
            if (xhr.status === 200) {
                // Display an alert with the retrieved password
                alert("Your password is: " + xhr.responseText);
            } else {
                alert("Failed to retrieve password. Please try again later.");
            }
        };
        xhr.send(JSON.stringify({ username: username }));
    }
});
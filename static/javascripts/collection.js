$(document).ready(function () {
    let isPlaying = false; // Variable to track if speech synthesis is playing
    let pausedAt = 0; // Variable to track the position where speech synthesis was paused

    // Function to append messages to the chat interface
    function appendMessage(role, message, isCollectionMessage = false) {
        let colorClass = role === "user" ? "user-message" : "assistant-message";
        let imageSrc = role === "user" ? "static/images/profile-user.png" : "static/images/bot.png";
        let imageAlt = role === "user" ? "User Image" : "Assistant Image";

        let messageElement;
        if (typeof message === "string") {
            // If the message is a string, create a text message element
            messageElement = $(
                '<div class="chat-message ' +
                colorClass +
                '">' +
                '<img src="' +
                imageSrc +
                '" alt="' +
                imageAlt +
                '" class="user-image">' +
                '<div class="message-text">' +
                message +
                "</div>" +
                "</div>"
            );
        } else {
            // If the message is an object, create an image message element
            messageElement = $(
                '<div class="chat-message ' +
                colorClass +
                '">' +
                '<img src="' +
                imageSrc +
                '" alt="' +
                imageAlt +
                '" class="user-image">' +
                '<img src="' +
                message.src +
                '" alt="Image" class="chat-image">' +
                '<div class="message-text">' +
                message.text +
                "</div>" +
                "</div>"
            );
        }

        // If it's a collection message and the role is assistant, append a speaker icon
        if (isCollectionMessage && role === "assistant") {
            let speakerIcon = $('<i class="fas fa-volume-up speaker-icon"></i>'); // Create the speaker icon
            let iconContainer = $('<div class="icon-container"></div>'); // Container for the icon

            speakerIcon.click(function() {
                // Toggle read functionality when the icon is clicked
                let read = typeof message === "string" ? message : message.text;
                toggleRead(read);
                // Replace the speaker icon with the pause icon when clicked
                $(this).toggleClass('fa-volume-up fa-pause');
            });

            iconContainer.append(speakerIcon); // Append icon to container
            messageElement.append(iconContainer); // Append container to message element
        }

        $('#chat-messages').append(messageElement); // Append the message element to the chat interface
    }

    // Click event handler for collection names
    $('a.collection-link').click(function(e) {
        e.preventDefault();
        var collectionName = $(this).text(); // Get the clicked collection name
        console.log(collectionName)

        // Fetch collection content and display it
        $.ajax({
            url: '/collection/' + collectionName,
            type: 'GET',
            success: function(data) {
                $('#chat-messages').empty(); // Clear previous content
                data.forEach(function(document) {
                    // Append user and assistant fields to the chat interface
                    appendMessage("user", document.user);
                    const md = new markdownit();
                    let content = md.render(document.assistant)
                    appendMessage("assistant", content, true); // Indicate that it's a collection message
                });
            },
            error: function(xhr, status, error) {
                console.error('Error fetching collection:', error);
            }
        });
    });

    // Initialize a new SpeechSynthesisUtterance object
    let utterance = new SpeechSynthesisUtterance();
    utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google UK English Female');

    // Function to toggle speech synthesis
function toggleRead(message) {
    let textContent = $(message).text(); // Extract text content, ignoring HTML tags
    if (speechSynthesis.speaking && isPlaying) {
        // If currently playing, pause speech synthesis
        speechSynthesis.pause();
        pausedAt = speechSynthesis.pausedAt;
        isPlaying = false;
    } else {
        // If not playing or paused, start/resume speech synthesis
        utterance.text = textContent; // Set the text content for the utterance
        utterance.onend = function() {
            isPlaying = false; // Reset the playing state
            $('.fa-pause').removeClass('fa-pause').addClass('fa-volume-up');
        };
        if (pausedAt > 0) {
            // If paused, resume from the paused position
            utterance = new SpeechSynthesisUtterance(textContent); // Create a new utterance
            speechSynthesis.speak(utterance); // Start synthesis again
            isPlaying = true;
            pausedAt = 0; // Reset pausedAt
        } else {
            // If not paused, start from the beginning
            speechSynthesis.cancel(); // Cancel any ongoing synthesis
            speechSynthesis.speak(utterance);
            isPlaying = true;
        }
    }
}
 // Store messages in localStorage when the page is unloaded
 $(window).on('unload', function() {
    localStorage.setItem('chatMessages', $('#chat-messages').html());
});
});

// timer for creating new collection
$(document).ready(function () {
    let timerRunning = false; // Variable to track if the timer is running

    $('#new').click(function() {
        if (!timerRunning) { // Check if the timer is not already running
            // Calculate remaining seconds in the current minute
            let currentTime = new Date();
            let secondsElapsed = currentTime.getSeconds();
            let remainingSeconds = 60 - secondsElapsed;

            // Start countdown timer only if remainingSeconds is greater than 0
            if (remainingSeconds > 0) {
                startCountdownTimer(remainingSeconds);
            }

            // Make AJAX request after calculating remaining seconds
            $.ajax({
                url: '/create_collection',
                type: 'POST',
                success: function(data) {
                    if (data.collection_name) {
                        displayMessageWithTimer(`New collection created: ${data.collection_name}`, remainingSeconds); // Display message with the calculated remaining time
                    } else if (data.error) {
                        displayMessageWithTimer(data.error, remainingSeconds); // Display error message with the calculated remaining time
                    } else {
                        displayMessageWithTimer('Wait for the 60 seconds', remainingSeconds); // Display generic error message with the calculated remaining time
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error creating collection:', error);
                    displayMessageWithTimer('An error occurred while creating the collection. Please try again later.', remainingSeconds); // Display generic error message with the calculated remaining time
                }
            });
        }
    });

    function startCountdownTimer(seconds) {
        timerRunning = true; // Set the timerRunning flag to true
        let interval = setInterval(function() {
            if (seconds > 0) {
                $('#collection-message').text(`Please wait for ${seconds} seconds before creating a new collection.`); // Update timer message
                seconds--;
            } else {
                clearInterval(interval); // Clear the interval when the timer reaches 0
                $('#collection-message').text(""); // Clear the message after the timer expires
                timerRunning = false; // Reset the timerRunning flag
            }
        }, 1000); // Update timer every second
    }

    function displayMessageWithTimer(message, seconds) {
        $('#collection-message').text(message); // Display the message
        // Start countdown timer only if seconds is greater than 0
        if (seconds > 0) {
            startCountdownTimer(seconds);
        }
    }
});


 // Add event listener to delete icon
 $('.delete-icon').click(function() {
    let collectionName = $(this).data('collection');
    deleteCollection(collectionName);
});

// Function to delete a collection
function deleteCollection(collectionName) {
    $.ajax({
        url: '/delete_collection',
        type: 'POST',
        data: { collection_name: collectionName },
        success: function(data) {
            // Remove the collection from the UI if deletion is successful
            if (data.success) {
                $(`[data-collection="${collectionName}"]`).closest('li').remove();
            } else {
                console.error('Error deleting collection:', data.error);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error deleting collection:', error);
        }
    });
}





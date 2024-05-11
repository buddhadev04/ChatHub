// Initialize a new SpeechSynthesisUtterance object
let utterance = new SpeechSynthesisUtterance();
utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google UK English Female');

// Listen for the beforeunload event to stop speech synthesis before page refresh
window.addEventListener('beforeunload', function() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
});

// Function to extract text content from HTML
function extractText(html) {
  // Create a temporary div element
  let tempDiv = document.createElement('div');
  
  // Set the innerHTML of the temporary div to the provided HTML
  tempDiv.innerHTML = html;
  
  // Extract text content from the temporary div
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Return the extracted text
  return text.trim();
}




$(document).ready(function () {
  function appendMessage(role, message, callback) {
    let colorClass = role === "user" ? "user-message" : "assistant-message";
    let imageSrc =
      role === "user" ? "static/profile-user.png" : "static/bot.png";
    let imageAlt = role === "user" ? "User Image" : "Assistant Image";

    let messageElement;
    if (typeof message === "string") {
      // If the message is a string, it's a text message
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
      // If the message is an object, it's an image message
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

    let isPlaying = false; // Variable to track if speech synthesis is playing
    let pausedAt = 0; // Variable to track the position where speech synthesis was paused

    // Function to toggle speech synthesis
function toggleRead(message) {
  utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google UK English Female');
  if (speechSynthesis.speaking && isPlaying) {
      // If currently playing, pause speech synthesis
      speechSynthesis.pause();
      pausedAt = speechSynthesis.pausedAt;
      isPlaying = false;
  } else {
      // If not playing or paused, start/resume speech synthesis
      utterance.text = message; // Set the text for the utterance
      utterance.onend = function() {
          isPlaying = false; // Reset the playing state
          $('.fa-pause').removeClass('fa-pause').addClass('fa-volume-up');
      };
      if (pausedAt > 0) {
          // If paused, resume from the paused position
          utterance = new SpeechSynthesisUtterance(message); // Create a new utterance
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


    // Append speaker icon to assistant's message
    if (role === "assistant") {
        let speakerIcon = $('<i class="fas fa-volume-up speaker-icon"></i>'); // Remove "right" class
        let iconContainer = $('<div class="icon-container"></div>'); // Container for the icon
        
        speakerIcon.click(function() {
            // Toggle read functionality when the icon is clicked
            let read = extractText(message)
            console.log(read)
            toggleRead(read);
            // Replace speaker icon with pause icon when clicked
            $(this).toggleClass('fa-volume-up fa-pause');
        });

        iconContainer.append(speakerIcon); // Append icon to container
        messageElement.append(iconContainer); // Append container to message element
        
    }

    $('#chat-messages').append(messageElement);

    // Listen for the end of speech event
    utterance.onend = function() {
        // Change the icon back to the speaker icon
        $('.fa-pause').removeClass('fa-pause').addClass('fa-volume-up');
        isPlaying = false; // Reset the playing state
    };
}

  $("#chat-form").submit(function (event) {
    event.preventDefault();

    let inputMessage = $("#chat-input").val();
    let inputImage = $("#file-upload")[0].files[0]; // Get the selected image file

    if (inputImage) {
      // Display the selected image in the chat interface
      let reader = new FileReader();
      reader.onload = function (e) {
        let imageSrc = e.target.result;
        appendMessage("user", { text: inputMessage, src: imageSrc });
      };
      reader.readAsDataURL(inputImage);
    } else {
      // Append user's text message to the chat interface
      appendMessage("user", inputMessage);
    }

    // Create a FormData object and append both message and image data
    let formData = new FormData();
    formData.append("prompt", inputMessage);
    formData.append("file", inputImage);

    // Send message to Flask backend
    $.ajax({
      url: "/send_message",
      type: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (data) {
        // Handle response
        if (data.is_image) {
          // If the response is an image, display it
          appendMessage("assistant", { src: data.response });
        } else {
          // Otherwise, display the text response
          const md = new markdownit();
          let content = md.render(data.response);
          appendMessage("assistant", content);
        }
      },
      error: function (xhr, status, error) {
        console.error(xhr.responseText);
      },
    });

    // Clear input fields after submission
    $("#chat-input").val("");
    $("#file-upload").val("");
  });
   // Store messages in localStorage when the page is unloaded
   $(window).on('unload', function() {
    localStorage.setItem('chatMessages', $('#chat-messages').html());
});
});



$(document).ready(function () {
    let isPlaying = false;
    let pausedAt = 0;
    let utterance = new SpeechSynthesisUtterance();
    utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google UK English Female');

    function appendMessage(role, message, isCollectionMessage = false) {
        let colorClass = role === "user" ? "user-message" : "assistant-message";
        let imageSrc = role === "user" ? "static/images/profile-user.png" : "static/images/bot.png";
        let imageAlt = role === "user" ? "User Image" : "Assistant Image";
        
        let messageElement = $('<div class="chat-message ' + colorClass + '">'
            + '<img src="' + imageSrc + '" alt="' + imageAlt + '" class="user-image">');

        if (typeof message === "string") {
            messageElement.append('<div class="message-text">' + message + '</div>');
        } else {
            messageElement.append('<img src="' + message.src + '" alt="Image" class="chat-image">'
                + '<div class="message-text">' + message.text + '</div>');
        }

        if (isCollectionMessage && role === "assistant") {
            let speakerIcon = $('<i class="fas fa-volume-up speaker-icon"></i>');
            let iconContainer = $('<div class="icon-container"></div>').append(speakerIcon);

            speakerIcon.click(function () {
                let read = typeof message === "string" ? message : message.text;
                toggleRead(read);
                $(this).toggleClass('fa-volume-up fa-pause');
            });

            messageElement.append(iconContainer);
        }

        $('#chat-messages').append(messageElement);
    }

    function toggleRead(message) {
        let textContent = $(message).text();
        if (speechSynthesis.speaking && isPlaying) {
            speechSynthesis.pause();
            pausedAt = speechSynthesis.pausedAt;
            isPlaying = false;
        } else {
            utterance.text = textContent;
            utterance.onend = function () {
                isPlaying = false;
                $('.fa-pause').removeClass('fa-pause').addClass('fa-volume-up');
            };
            if (pausedAt > 0) {
                utterance = new SpeechSynthesisUtterance(textContent);
                speechSynthesis.speak(utterance);
                isPlaying = true;
                pausedAt = 0;
            } else {
                speechSynthesis.cancel();
                speechSynthesis.speak(utterance);
                isPlaying = true;
            }
        }
    }

    $('body').on('click', 'a.collection-link', function (e) {
        e.preventDefault();
        let collectionName = $(this).text();
        console.log(collectionName);

        $('a.collection-link').removeClass('active');
        $(this).addClass('active');

        $.ajax({
            url: '/collection/' + collectionName,
            type: 'GET',
            success: function (data) {
                $('#chat-messages').empty();
                data.forEach(function (document) {
                    appendMessage("user", document.user);
                    const md = new markdownit();
                    let content = md.render(document.assistant);
                    appendMessage("assistant", content, true);
                });
            },
            error: function (xhr, status, error) {
                console.error('Error fetching collection:', error);
            }
        });
    });

    $(window).on('unload', function () {
        localStorage.setItem('chatMessages', $('#chat-messages').html());
    });

    function createTemporaryListItem() {
        let temporaryLi = $('<li class="temp-li">Creating...</li>');
        $('.history ul').prepend(temporaryLi);
    }

    function updateListItem(collectionName) {
        let tempLi = $('.history ul li.temp-li');
        if (collectionName !== null) {
            tempLi.text(collectionName).removeClass('temp-li');
        } else {
            tempLi.remove();
        }
    }

    $('#new').click(function () {
        createTemporaryListItem();

        $.ajax({
            url: '/create_new_collection',
            type: 'POST',
            success: function (data) {
                if (data.success) {
                    console.log('Default collection removed successfully.');
                    updateListItem(data.collectionName);
                } else {
                    console.error('Error removing default collection:', data.error);
                    updateListItem(null);
                }
            },
            error: function () {
                console.error('Error creating new collection.');
                updateListItem(null);
            }
        });
    });

    function deleteCollection(collectionName) {
        $.ajax({
            url: '/delete_collection',
            type: 'POST',
            data: { collection_name: collectionName },
            success: function (data) {
                if (data.success) {
                    $(`[data-collection="${collectionName}"]`).closest('li').remove();
                } else {
                    console.error('Error deleting collection:', data.error);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error deleting collection:', error);
            }
        });
    }

    $('body').on('click', '.delete-icon', function () {
        let collectionName = $(this).data('collection');
        deleteCollection(collectionName);
    });
});

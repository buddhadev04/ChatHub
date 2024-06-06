$(document).ready(function() {
    $('#file-upload').change(function() {
        var input = this;
        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                $('#image-preview').attr('src', e.target.result);
                $('#remove-image').show(); // Show the remove button
            };
            reader.readAsDataURL(input.files[0]);
        }
    });

    $('#remove-image').click(function() {
        $('#image-preview').attr('src', 'static/images/image.png'); // Reset image source
        $('#file-upload').val(''); // Clear file input
        $(this).hide(); // Hide the remove button
    });

    $('#chat-form').submit(function(event) {
        // Clear image preview and input on form submission
        $('#image-preview').attr('src', 'static/images/image.png'); // Reset image source
        $('#file-upload').val(''); // Clear file input
        $('#remove-image').hide(); // Hide the remove button

    });
});

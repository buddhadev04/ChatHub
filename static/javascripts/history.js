// Modify the createCollection function to set the default collection name if it's a new collection
function createCollection() {
    $.ajax({
        url: '/create_collection',
        type: 'POST',
        success: function(data) {
            console.log('New collection created:', data);
            // Set the default collection name in the session if it's a new collection
            if (!sessionStorage.getItem('defaultCollection')) {
                sessionStorage.setItem('defaultCollection', data.collection_name);
                console.log('Default collection set:', data.collection_name);
            }
            // Set the newly created collection name in the session
            sessionStorage.setItem('newCollection', data.collection_name);
            console.log('Newly created collection set:', data.collection_name);
            // Reload the page to display the new collection
            location.reload();
        },
        error: function(xhr, status, error) {
            console.error('Error creating new collection:', error);
        }
    });
}

// Attach click event handler to the "new" div
$('#new').click(function() {
    createCollection();
});


document.addEventListener("DOMContentLoaded", function() {
    let collectionLinks = document.querySelectorAll('.collection-link');
    
    collectionLinks.forEach(function(link) {
        link.addEventListener('click', function(event) {
            // Remove 'active' class from all collection links
            collectionLinks.forEach(function(link) {
                link.classList.remove('active');
            });
            
            // Add 'active' class to clicked collection link
            event.target.classList.add('active');
        });
    });
});

const temp_div = document.querySelector(".temp_div")
const prompt = document.querySelector("#chat-input")
const submit = document.querySelector(".submit");
const reload = document.querySelector("h2");

reload.addEventListener("click", () => {
    window.location.href = "conversation"
})

function chatMode(){
    if (prompt.value){
        temp_div.style.display = 'none';
        console.log("working")
    }
}

submit.addEventListener("click", function () {
    chatMode();
    // Hide the div when the send button is clicked
    temp_div.style.display = 'none';
});
    
submit.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        chatMode();
    }
});

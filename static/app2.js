const home = document.querySelector("h2")
const submit = document.querySelector(".submit");
const chatContainer = document.querySelector(".chat-container");
const response = document.querySelector(".response");
const prompt = document.querySelector("#chat-input")
const vanish = document.querySelector(".vanish")


// home page
home.addEventListener("click", () => {
    window.location.href = "home"
})

function chatMode(){
    if (prompt.value.toLowerCase() == "start"){
        response.classList.add("chat-box-mode-on")
        window.location.href = "/conversation";
    }
    vanish.classList.add("off")
}

submit.addEventListener("click", chatMode)
    
submit.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        chatMode();
    }
});

const newCollection = document.querySelector("#new");
const list = document.querySelector(".past");
const tempDiv = document.querySelector(".temp_div");

function openNav() {
  document.getElementById("mySidebar").style.width = "270px";
  document.getElementById("user").style.display = "flex";
  if(window.innerWidth >= 992){
    document.getElementById("main").style.marginLeft = "200px";
    document.querySelector("main").style.marginLeft = "270px";
    
  }
  

}
/* Set the width of the sidebar to 0
        and the left margin of the page content to 0 */
function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
  document.querySelector("main").style.marginLeft = "0";
  document.getElementById("user").style.display = "none"; // Hide user div

}

// Automatically open the sidebar when the page loads
window.addEventListener("DOMContentLoaded", (event) => {
  console.log("Window width on DOMContentLoaded:", window.innerWidth);
  if (window.innerWidth <= 992) {
      closeNav(); // Close the sidebar if window width is exactly 429px
      
      list.addEventListener("click", function () {
        closeNav();
        tempDiv.innerHTML = "";
      });
      newCollection.addEventListener("click", function () {
        closeNav();
      });
  } else {
      openNav(); // Open the sidebar for other window widths
      list.addEventListener("click", function () {
        tempDiv.innerHTML = "";
      });
  }
});

const params = new URLSearchParams(window.location.search);
const error = params.get("error");
const message = params.get("message");
const errorBox = document.getElementById("error-message");
const successBox = document.getElementById("success-message");
if (errorBox && error) errorBox.textContent = error;
if (successBox && message) successBox.textContent = message;

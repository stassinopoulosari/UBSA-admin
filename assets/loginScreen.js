(function() {
  var $username = document.getElementById("inputEmail"),
    $password = document.getElementById("inputPassword"),
    $form = document.getElementsByTagName("form")[0],
    $failAlert = document.getElementById("loginFailAlert"),
    $succeededAlert = document.getElementById("loginSuccessAlert");

  $failAlert.style.display = "none";
  $succeededAlert.style.display = "none";

  $form.onsubmit = function(e) {
    e.preventDefault();
    var succeeded = true;
    firebase.auth().signInWithEmailAndPassword($username.value, $password.value).catch(() => {
      succeeded = false;
       $failAlert.style.display = "block";
    }).then(() => {
      if (succeeded) {
        $succeededAlert.style.display = "block";
        location.assign("panel");
      }
    });
  }
})();

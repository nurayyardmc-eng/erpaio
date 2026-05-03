(function(){
  var m = document.cookie.match(/erpaio_lang=([a-z]+)/);
  var lang = (m && m[1]) || "en";
  document.querySelectorAll(".lang-opt").forEach(function(a){
    if (a.dataset.lang === lang) {
      a.style.background = "#0A0A0A";
      a.style.color = "#FAFAF8";
    }
  });
})();

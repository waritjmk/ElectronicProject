(function () {
  // YouTube: show a thumbnail first, load the player only when pressed (keeps the page fast)
  document.querySelectorAll("a[data-yt]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + a.dataset.yt + "?autoplay=1&rel=0";
      f.title = "YouTube video player";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      f.className = a.className;
      a.replaceWith(f);
      f.focus();
    });
  });
  // Copy code
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    var label = b.textContent;
    b.addEventListener("click", function () {
      var code = b.closest(".codebox").querySelector("code").textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () {
        b.textContent = "คัดลอกแล้ว";
      }, function () {
        b.textContent = "คัดลอกไม่ได้ เลือกโค้ดแล้วกด Ctrl+C";
      }).then(function () { setTimeout(function () { b.textContent = label; }, 2000); });
    });
  });
})();

var onReady = function() {
  /*
  * canvas resize
  */
  var container = document.getElementsByClassName('site-wrapper-inner')[0];
  var davisContainer = document.getElementById('davisContainer');
  var canvasSize = 50;
  var canvasSizePercent = (100 / 1000) * canvasSize;
  var canvasResize = function() {
    var desiredSize = (container.offsetWidth / 100) * canvasSizePercent;
    var scalefactor = (1 / canvasSize) * desiredSize;
    //davisContainer.setAttribute('style','-webkit-transform: translate(-50%, -50%) scale('+scalefactor+'); transform: translate(-50%, -50%) scale('+scalefactor+');');
  };
  window.davisvisualization.init('#davisContainer');
  window.onresize = canvasResize;
  canvasResize();
};

if (document.readyState === 'complete') {
  onReady();
} else {
  window.addEventListener('load', onReady, false);
}

import * as Ui from './ui.js'

let canvasElement = Ui.canvasBg();
let canvasContext = canvasElement.getContext('2d') // World entities
let view = {
  width: 960,
  height: 540,
  aspectRatio: 960/540, // Hardcoded in HTML Canvas element
  scale: undefined, // Based on DOM element size
  x: 0,
  y: 0
}

let drawStyle = {
  color: 'black', // Default color

  // lineWidth: 4,
  _lineWidth: 4,
  set lineWidth(val) { this._lineWidth = val; },
  get lineWidth() { return this._lineWidth * view.scale; },

  setColor: function(color) {
    this.color = color
    canvasContext.fillStyle = this.color
    canvasContext.strokeStyle = this.color
    Ui.sliderLineWidth.elementFill.style.backgroundColor = this.color
  }
}

/**
 * Reads the size of the HTML element to inform the size of the canvas context.
 */
function syncCanvasSize() {
  // Only need to read with or height since aspect ratio is locked
  view.scale = canvasElement.offsetWidth / view.width;

  // Reset line width at new resolution
  canvasContext.lineWidth = drawStyle.lineWidth;
  canvasContext.lineCap = "round";
}
window.addEventListener('resize', syncCanvasSize);

function initUi() {
  // Set background
  canvasContext.fillStyle = 'white';
  canvasContext.fillRect(0, 0, view.width, view.height)

  canvasElement.addEventListener('mousedown', e => {
    e.preventDefault();
    var rectDown = canvasElement.getBoundingClientRect()
    let brushXDown = Math.floor(e.clientX - rectDown.left) / view.scale
    let brushYDown = (e.clientY - rectDown.top) / view.scale
    canvasContext.beginPath();
    canvasContext.arc(brushXDown, brushYDown, drawStyle.lineWidth / 2, 0, 2 * Math.PI);
    canvasContext.fill();

    canvasContext.beginPath();
    canvasContext.moveTo(brushXDown, brushYDown);

    let prevFrame = { brushX: brushXDown, brushY: brushYDown }

    const moveBrush = e => {
      e.preventDefault();
      var rect = canvasElement.getBoundingClientRect()
      let brushX = Math.floor(e.clientX - rect.left) / view.scale
      let brushY = (e.clientY - rect.top) / view.scale

      canvasContext.lineTo(brushX, brushY);
      canvasContext.stroke();

      // Reset
      canvasContext.beginPath();
      canvasContext.moveTo(brushX, brushY);

      prevFrame = { brushX, brushY }
    }

    const releaseBrush = _ => {
      // Brush mouse-down released, cleanup post-mousedown listeners
      document.removeEventListener('mousemove', moveBrush);
      document.removeEventListener('mouseleave', releaseBrush);
      document.removeEventListener('mouseup', releaseBrush);
    };

    // Brush mouse-down held, add listeners. These all need to be removed on release
    document.addEventListener('mousemove', moveBrush);
    document.addEventListener('mouseleave', releaseBrush);
    document.addEventListener('mouseup', releaseBrush);
  })

  Ui.sliderLineWidth.notifyValueChange = val => {
    let floorVal = Math.floor(parseInt(val));
    Ui.sliderLabelLineWidth.innerHTML = `Line Width: ${floorVal}`;
    drawStyle.lineWidth = floorVal;
    canvasContext.lineWidth = floorVal;
  }
  Ui.sliderLabelLineWidth.innerHTML = `Line Width: ${Math.floor(parseInt(drawStyle.lineWidth))}`;
  Ui.sliderLineWidth.setValue(drawStyle.lineWidth)

  Ui.buttonClear.onclick = _ => {
    canvasContext.fillStyle = 'white';
    canvasContext.fillRect(0, 0, view.width, view.height)
    canvasContext.fillStyle = drawStyle.color;
  }

  Array.from(Ui.colorPalette.children).forEach(child => {
    child.addEventListener('click', e => {
      Array.from(Ui.colorPalette.children).forEach(other => other.classList.remove('selected'));
      e.target.classList.toggle('selected');
      drawStyle.setColor(e.target.style.backgroundColor)
    })
  })

  // Initialize default styles
  drawStyle.setColor(drawStyle.color)
  canvasContext.fillStyle = drawStyle.color;
  canvasContext.strokeStyle = drawStyle.color;
}

(function init() {
  syncCanvasSize()
  initUi()
})()

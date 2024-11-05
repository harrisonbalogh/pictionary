import * as Ui from './ui.js'

let canvasOverlayElement = Ui.canvasFg();
let canvasElement = Ui.canvasBg();
let canvasOverlayContext = canvasOverlayElement.getContext('2d') // World entities
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

  lineWidth: 4,

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
  canvasOverlayContext.lineWidth = drawStyle.lineWidth;
  canvasOverlayContext.lineCap = "round";
}
window.addEventListener('resize', syncCanvasSize);

function clearBrushIndicator() {
  // Clear old circle
  canvasOverlayContext.clearRect(0, 0, view.width, view.height)
}
function drawBrushIndicator(brushX, brushY) {
  // Maintain the same stroke scale through resolution changes
  let lineWidth = Math.max(1 / view.scale, 1);
  canvasOverlayContext.lineWidth = lineWidth;

  clearBrushIndicator();

  // Outer white highlight for better standout
  canvasOverlayContext.strokeStyle = drawStyle.color == 'white' ? 'black' : 'white'
  canvasOverlayContext.beginPath();
  canvasOverlayContext.arc(brushX, brushY, drawStyle.lineWidth / 2, 0, 2 * Math.PI);
  canvasOverlayContext.stroke();

  // Matching brush color indicator
  canvasOverlayContext.strokeStyle = drawStyle.color
  canvasOverlayContext.beginPath();
  // - Inset arc by width of stroke line to only indicate where the inclusive boundary of the fill() would be
  canvasOverlayContext.arc(brushX, brushY, Math.max(drawStyle.lineWidth / 2 - lineWidth, 0.5), 0, 2 * Math.PI);
  canvasOverlayContext.stroke();
}

function initUi() {
  // Set background
  canvasContext.fillStyle = 'white';
  canvasContext.fillRect(0, 0, view.width, view.height)

  function canvasMouse(e) {
    var rect = canvasOverlayElement.getBoundingClientRect()
    let brushX = Math.floor(e.clientX - rect.left) / view.scale
    let brushY = (e.clientY - rect.top) / view.scale
    return { brushX, brushY }
  }

  function hoverBrush(e) {
    e.preventDefault();
    const { brushX, brushY } = canvasMouse(e);

    drawBrushIndicator(brushX, brushY);
  }

  // Brush size indicator while mouse is up
  canvasOverlayElement.addEventListener('mousemove', hoverBrush);
  canvasOverlayElement.addEventListener('mouseleave', clearBrushIndicator);

  canvasOverlayElement.addEventListener('mousedown', e => {
    e.preventDefault();
    const { brushX, brushY } = canvasMouse(e);
    // Initial paint from brush down
    canvasContext.beginPath();
    canvasContext.arc(brushX, brushY, drawStyle.lineWidth / 2, 0, 2 * Math.PI);
    canvasContext.fill();
    // Set first point for brush movement
    canvasContext.beginPath();
    canvasContext.moveTo(brushX, brushY);

    const moveBrush = e => {
      e.preventDefault();
      const { brushX, brushY } = canvasMouse(e);

      drawBrushIndicator(brushX, brushY);

      canvasContext.lineTo(brushX, brushY);
      canvasContext.stroke();

      // Reset first point
      canvasContext.beginPath();
      canvasContext.moveTo(brushX, brushY);
    }

    const releaseBrush = e => {
      // Brush mouse-down released, cleanup post-mousedown listeners
      document.removeEventListener('mousemove', moveBrush);
      document.removeEventListener('mouseleave', releaseBrush);
      document.removeEventListener('mouseup', releaseBrush);
      canvasOverlayElement.addEventListener('mousemove', hoverBrush);
      canvasOverlayElement.addEventListener('mouseleave', clearBrushIndicator);

      const { brushX, brushY } = canvasMouse(e);
      if (brushY < 0 || brushY > view.height || brushX < 0 || brushX > view.width) {
        // Released mouse offscreen, clear indicator
        clearBrushIndicator();
      }
    };

    // Brush mouse-down held, add listeners. These all need to be removed on release
    document.addEventListener('mousemove', moveBrush);
    document.addEventListener('mouseleave', releaseBrush);
    document.addEventListener('mouseup', releaseBrush);
    canvasOverlayElement.removeEventListener('mousemove', hoverBrush);
    canvasOverlayElement.removeEventListener('mouseleave', clearBrushIndicator);
  })

  Ui.sliderLineWidth.notifyValueChange = val => {
    let floorVal = Math.floor(parseInt(val));
    Ui.sliderLabelLineWidth.innerHTML = `Line Width: ${floorVal}`;
    drawStyle.lineWidth = floorVal;
    canvasContext.lineWidth = floorVal;
    drawBrushIndicator(view.width / 2, view.height / 2)
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

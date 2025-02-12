import * as Ui from './ui.js'
import * as PainterServiceClient from '/node_modules/@harxer/painter-lib/PainterServiceClient.js'
import Config from './config.js'

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

let lastNetworkedStrokePosition = {
  x: undefined,
  y: undefined
}
// Network cache
let iAmPainter = false;
let iAmOwner = false;
let countdown = 0;
let countdownInterval = undefined;
const setCountdown = function(timeRemaining) {
  Ui.labelGameTimer.innerHTML = `${timeRemaining / 1000}s`;
  Ui.labelGameTimer.classList.toggle('hidden', false);
  clearInterval(countdownInterval);
  countdown = timeRemaining / 1000;
  countdownInterval = setInterval(_ => {
    if (countdown <= 0) {
      clearCountdown();
      return;
    }
    countdown -= 1;
    Ui.labelGameTimer.innerHTML = `<b>${countdown}</b>s`;
  }, 1000);
}
const clearCountdown = _ => {
  countdown = 0;
  Ui.labelGameTimer.classList.toggle('hidden', true);
  clearInterval(countdownInterval);
}
let gameStart = false;

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

/** Get the mouse position on the canvas. @returns {{brushX: int, brushX: int}} */
function mouseCanvasPosition(e) {
  var rect = canvasOverlayElement.getBoundingClientRect()
  let brushX = Math.floor(e.clientX - rect.left) / view.scale
  let brushY = (e.clientY - rect.top) / view.scale
  return { brushX, brushY }
}

function handleMouseMove(e) {
  if (!iAmPainter) return;

  e.preventDefault();
  const { brushX, brushY } = mouseCanvasPosition(e);

  drawBrushIndicator(brushX, brushY);
}

const handleBrushMove = e => {
  e.preventDefault();
  const { brushX, brushY } = mouseCanvasPosition(e);

  drawBrushIndicator(brushX, brushY);

  // Networked strokes
  PainterServiceClient.message.stroke(brushX, brushY);

  canvasContext.lineTo(brushX, brushY);
  canvasContext.stroke();

  // Reset first point
  canvasContext.beginPath();
  canvasContext.moveTo(brushX, brushY);
}

const releaseBrush = e => {
  // Brush mouse-down released, cleanup post-mousedown listeners
  document.removeEventListener('mousemove', handleBrushMove);
  document.removeEventListener('mouseleave', releaseBrush);
  document.removeEventListener('mouseup', releaseBrush);
  canvasOverlayElement.addEventListener('mousemove', handleMouseMove);
  canvasOverlayElement.addEventListener('mouseleave', clearBrushIndicator);

  if (e === undefined) {
    // releaseBrush forceably called. Not event triggered
    clearBrushIndicator();
    return;
  }

  const { brushX, brushY } = mouseCanvasPosition(e);
  if (brushY < 0 || brushY > view.height || brushX < 0 || brushX > view.width) {
    // Released mouse offscreen, clear indicator
    clearBrushIndicator();
  }

  // Networked
  PainterServiceClient.message.stroke_end()
};

function initUi() {
  // Set background
  canvasContext.fillStyle = 'white';
  canvasContext.fillRect(0, 0, view.width, view.height)

  // Brush size indicator while mouse is up
  canvasOverlayElement.addEventListener('mousemove', handleMouseMove);
  canvasOverlayElement.addEventListener('mouseleave', clearBrushIndicator);

  canvasOverlayElement.addEventListener('mousedown', e => {
    if (!iAmPainter) return;

    e.preventDefault();
    const { brushX, brushY } = mouseCanvasPosition(e);
    // Initial paint from brush down
    canvasContext.beginPath();
    canvasContext.arc(brushX, brushY, drawStyle.lineWidth / 2, 0, 2 * Math.PI);
    canvasContext.fill();
    // Set first point for brush movement
    canvasContext.beginPath();
    canvasContext.moveTo(brushX, brushY);

    // Brush mouse-down held, add listeners. These all need to be removed on release
    document.addEventListener('mousemove', handleBrushMove);
    document.addEventListener('mouseleave', releaseBrush);
    document.addEventListener('mouseup', releaseBrush);
    canvasOverlayElement.removeEventListener('mousemove', handleMouseMove);
    canvasOverlayElement.removeEventListener('mouseleave', clearBrushIndicator);
  })

  Ui.sliderLineWidth.notifyValueChange = val => {
    let floorVal = Math.floor(parseInt(val));
    Ui.sliderLabelLineWidth.innerHTML = `Line Width: ${floorVal}`;
    drawStyle.lineWidth = floorVal;
    canvasContext.lineWidth = floorVal;
    drawBrushIndicator(view.width / 2, view.height / 2)
  }
  Ui.sliderLineWidth.notifyChangeEnd = val => {
    // Networked
    PainterServiceClient.message.stroke_settings(drawStyle.color, Math.floor(parseInt(val)))
  }
  Ui.sliderLabelLineWidth.innerHTML = `Line Width: ${Math.floor(parseInt(drawStyle.lineWidth))}`;
  Ui.sliderLineWidth.setValue(drawStyle.lineWidth)

  Ui.buttonClear.onclick = _ => {
    canvasContext.fillStyle = 'white';
    canvasContext.fillRect(0, 0, view.width, view.height)
    canvasContext.fillStyle = drawStyle.color;

    // Networked
    PainterServiceClient.message.stroke_clear()
  }

  Ui.buttonConnect.onclick = _ => {
    connect(Ui.inputDisplayName.value);
  }
  Ui.buttonDisconnect.onclick = _ => {
    PainterServiceClient.disconnect()
  }
  Ui.buttonGameStart.onclick = _ => {
    PainterServiceClient.message.game_start()
  }
  Ui.buttonGameSend.onclick = _ => {
    let word = Ui.inputGameWord.value;
    PainterServiceClient.message.game_guess_word(word)
  }

  Ui.buttonLobbyCreate.onclick = _ => {
    PainterServiceClient.message.lobby_create();
  }
  Ui.buttonLobbyJoin.onclick = _ => {
    PainterServiceClient.message.lobby_join(Ui.inputLobbyJoin.value);
  }
  Ui.buttonLobbyExit.onclick = _ => {
    PainterServiceClient.message.lobby_exit();
  }

  Array.from(Ui.colorPalette.children).forEach(child => {
    child.addEventListener('click', e => {
      Array.from(Ui.colorPalette.children).forEach(other => other.classList.remove('selected'));
      e.target.classList.toggle('selected');
      drawStyle.setColor(e.target.style.backgroundColor)

      // Networked
      PainterServiceClient.message.stroke_settings(e.target.style.backgroundColor, drawStyle.lineWidth)
    })
  })

  // Initialize default styles
  drawStyle.setColor(drawStyle.color)
  canvasContext.fillStyle = drawStyle.color;
  canvasContext.strokeStyle = drawStyle.color;
}

/** Connect to painter service. */
function connect(name) {
  PainterServiceClient.connect(Config.url.painter, name, (displayName) => {
    Ui.labelUserId.innerHTML = displayName;
    // Connect elements
    Ui.inputDisplayName.classList.toggle('hidden', true);
    Ui.buttonConnect.classList.toggle('hidden', true);
    Ui.buttonDisconnect.classList.toggle('hidden', false);
    // Lobby elements
    Ui.inputLobbyJoin.classList.toggle('hidden', false);
    Ui.buttonLobbyJoin.classList.toggle('hidden', false);
    Ui.buttonLobbyCreate.classList.toggle('hidden', false);

    PainterServiceClient.setNotifyLobbyJoined((id, users, owner) => {
      Ui.labelLobbyId.classList.toggle('hidden', false);
      Ui.labelLobbyUsers.classList.toggle('hidden', false);
      Ui.labelLobbyOwner.classList.toggle('hidden', false);
      Ui.labelLobbyId.innerHTML = `Lobby: ${id}`;
      Ui.labelLobbyUsers.innerHTML = `Users: ${users.filter(u => u !== displayName)}`;
      Ui.labelLobbyOwner.innerHTML = `Owner: ${owner}`;
      // Lobby elements
      Ui.inputLobbyJoin.classList.toggle('hidden', true);
      Ui.buttonLobbyJoin.classList.toggle('hidden', true);
      Ui.buttonLobbyCreate.classList.toggle('hidden', true);
      Ui.buttonLobbyExit.classList.toggle('hidden', false);
      // Game elements
      let iAmOwner = displayName === owner;
      Ui.buttonGameStart.classList.toggle('hidden', !iAmOwner || gameStart);
    });
    PainterServiceClient.setNotifyLobbyExited(_ => {
      gameStart = false; // Clear memo
      iAmOwner = false;
      clearInterval(countdownInterval);
      Ui.labelLobbyId.classList.toggle('hidden', true);
      Ui.labelLobbyUsers.classList.toggle('hidden', true);
      Ui.labelLobbyOwner.classList.toggle('hidden', true);
      Ui.labelLobbyId.innerHTML = ''
      Ui.labelLobbyUsers.innerHTML = ''
      Ui.labelLobbyOwner.innerHTML = ''
      Ui.labelLobbyPainter.innerHTML = ''
      iAmPainter = undefined;
      // Paint elements
      Ui.footerControls.classList.toggle('hidden', true);
      Ui.content.classList.toggle('hidden', true);
      // Lobby elements
      Ui.buttonLobbyJoin.classList.toggle('hidden', false);
      Ui.inputLobbyJoin.classList.toggle('hidden', false);
      Ui.buttonLobbyCreate.classList.toggle('hidden', false);
      Ui.buttonLobbyExit.classList.toggle('hidden', true);
      // Game elements
      Ui.labelGameTimer.classList.toggle('hidden', true);
      Ui.buttonGameStart.classList.toggle('hidden', true);
      Ui.labelLobbyPainter.classList.toggle('hidden', true);
      Ui.labelGameMessage.classList.toggle('hidden', true);
      Ui.inputGameWord.classList.toggle('hidden', true);
      Ui.buttonGameSend.classList.toggle('hidden', true);
    });
    PainterServiceClient.setNotifyClose(_ => {
      gameStart = false; // Clear memo
      iAmOwner = false;
      clearInterval(countdownInterval);
      Ui.labelLobbyId.classList.toggle('hidden', true);
      Ui.labelLobbyUsers.classList.toggle('hidden', true);
      Ui.labelLobbyOwner.classList.toggle('hidden', true);
      Ui.labelUserId.innerHTML = ''
      Ui.labelLobbyId.innerHTML = ''
      Ui.labelLobbyUsers.innerHTML = ''
      Ui.labelLobbyOwner.innerHTML = ''
      iAmPainter = false;
      // Paint elements
      Ui.footerControls.classList.toggle('hidden', true);
      Ui.content.classList.toggle('hidden', true);
      // Game elements
      Ui.labelGameTimer.classList.toggle('hidden', true);
      Ui.labelLobbyPainter.classList.toggle('hidden', true);
      Ui.buttonGameStart.classList.toggle('hidden', true);
      Ui.labelGameMessage.classList.toggle('hidden', true);
      Ui.inputGameWord.classList.toggle('hidden', true);
      Ui.buttonGameSend.classList.toggle('hidden', true);
      // Lobby elements
      Ui.inputLobbyJoin.classList.toggle('hidden', true);
      Ui.buttonLobbyJoin.classList.toggle('hidden', true);
      Ui.buttonLobbyCreate.classList.toggle('hidden', true);
      Ui.buttonLobbyExit.classList.toggle('hidden', true);
      // Connect elements
      Ui.inputDisplayName.classList.toggle('hidden', false);
      Ui.buttonConnect.classList.toggle('hidden', false);
      Ui.buttonDisconnect.classList.toggle('hidden', true);
    });
    PainterServiceClient.setNotifyGameStart((rounds) => {
      gameStart = true; // Memo
      // Clear canvas
      canvasContext.fillStyle = 'white';
      canvasContext.fillRect(0, 0, view.width, view.height)
      canvasContext.fillStyle = drawStyle.color;
      // Game elements
      Ui.buttonGameStart.classList.toggle('hidden', true);
      Ui.labelGameMessage.classList.toggle('hidden', false);
      Ui.labelGameMessage.innerHTML = `Game Started... ${rounds} round${rounds === 1 ? '' : 's'}`
      // Paint elements
      Ui.content.classList.toggle('hidden', false);
      syncCanvasSize();
    });
    PainterServiceClient.setNotifyGameEventSelecting((guessers, painter, timeRemaining, wordChoices) => {
      Ui.labelLobbyPainter.classList.toggle('hidden', false);
      Ui.labelLobbyPainter.innerHTML = `Painter: ${painter}`;
      if (displayName === painter) {
        Ui.inputGameWord.innerHTML = "";
        Ui.inputGameWord.classList.toggle('hidden', false);
        Ui.buttonGameSend.classList.toggle('hidden', false);
        Ui.labelGameMessage.innerHTML = `Select a word: ${wordChoices.join(', ')}`;
      } else {
        Ui.labelGameMessage.innerHTML = `${painter} is selecting a word...`;
      }
      setCountdown(timeRemaining);
    });
    PainterServiceClient.setNotifyGameEventPainting((guessers, painter, timeRemaining, wordChoice) => {
      iAmPainter = (displayName === painter);
      Ui.footerControls.classList.toggle('hidden', !iAmPainter);
      if (iAmPainter) {
        Ui.labelGameMessage.innerHTML = `Paint word: ${wordChoice}`;
        Ui.sliderLineWidth.setValue(drawStyle.lineWidth)
        Ui.inputGameWord.classList.toggle('hidden', true);
        Ui.buttonGameSend.classList.toggle('hidden', true);
      } else {
        Ui.inputGameWord.innerHTML = "";
        Ui.inputGameWord.classList.toggle('hidden', false);
        Ui.buttonGameSend.classList.toggle('hidden', false);
        Ui.labelGameMessage.innerHTML = `${painter} is painting...`;
        releaseBrush();
      }
      setCountdown(timeRemaining);
    });
    PainterServiceClient.setNotifyGameEventCorrectGuess((userPoints, guesser) => {
      if (guesser === displayName) {
        let pts = userPoints[displayName];
        Ui.labelGameMessage.innerHTML = `You guessed correctly! +${pts} points`;
        Ui.inputGameWord.classList.toggle('hidden', true);
        Ui.buttonGameSend.classList.toggle('hidden', true);
      } else {
        // console.log(`${guesser} guessed correctly!`, userPoints);
      }
    });
    PainterServiceClient.setNotifyGameEventIntermission((timeRemaining) => {
      iAmPainter = false;
      Ui.footerControls.classList.toggle('hidden', true);
      Ui.labelGameMessage.innerHTML = `Round over`;
      Ui.inputGameWord.classList.toggle('hidden', true);
      Ui.buttonGameSend.classList.toggle('hidden', true);
      setCountdown(timeRemaining);
    });
    PainterServiceClient.setNotifyGameEventEnded(() => {
      Ui.labelGameTimer.classList.toggle('hidden', true);
      gameStart = false; // Clear memo
      clearInterval(countdownInterval);
      Ui.labelGameMessage.classList.toggle('hidden', true);
      Ui.labelGameMessage.innerHTML = ""
      Ui.labelLobbyPainter.classList.toggle('hidden', true);
      Ui.labelLobbyPainter.innerHTML = ""
      // Paint elements
      Ui.content.classList.toggle('hidden', true);
      // Game elements
      Ui.buttonGameStart.classList.toggle('hidden', !iAmOwner);
    });
    PainterServiceClient.setNotifyStroke((brushX, brushY) => {
      // Start point
      if (lastNetworkedStrokePosition.x === undefined) {
        lastNetworkedStrokePosition.x = brushX;
        lastNetworkedStrokePosition.y = brushY;
        canvasContext.beginPath();
        canvasContext.moveTo(brushX, brushY);
      } else {
        // Stroke to moved position
        canvasContext.lineTo(brushX, brushY);
        canvasContext.stroke();
        // Reset start point
        canvasContext.beginPath();
        canvasContext.moveTo(brushX, brushY);
      }
    });
    PainterServiceClient.setNotifyStrokeEnd(_ => {
      // Reset stroke position
      lastNetworkedStrokePosition.x = undefined;
      lastNetworkedStrokePosition.y = undefined;
    });
    PainterServiceClient.setNotifyStrokeClear(_ => {
      canvasContext.fillStyle = 'white';
      canvasContext.fillRect(0, 0, view.width, view.height)
      canvasContext.fillStyle = drawStyle.color;
    });
    PainterServiceClient.setNotifyStrokeSettings((color, size) => {
      // Color
      Array.from(Ui.colorPalette.children).forEach(elem =>
        elem.classList.toggle('selected', elem.style.backgroundColor === color)
      );
      drawStyle.setColor(color)

      // Size
      Ui.sliderLineWidth.setValue(size);
      Ui.sliderLabelLineWidth.innerHTML = `Line Width: ${size}`;
      drawStyle.lineWidth = size;
      canvasContext.lineWidth = size;
    });
  })
}

// Initialize app ====
(function _() {
  syncCanvasSize();
  initUi();
})()
// ===================

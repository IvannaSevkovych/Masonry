/* eslint-disable */


/*
 * Imports
 */
// npm
import * as PIXI from 'pixi.js';

// shaders
import backgroundFragment from './shaders/masonryBackgroundFragment.glsl';
import stageFragment from './shaders/masonryStageFragment.glsl';

// libs
import { Grid } from "./grid";


/*
 * Declarations
 */
// Constants
const imagePadding = 10;
const container = document.getElementById('container');
// Settings for grid
const gridSize = 50;
const gridMin = 3;


// Variables
let app;
let background;
let width;
let height;
// Target for pointer. If down, value is 1, else value is 0
let pointerDownTarget = 0;
let uniforms;
let pointerDiffStart = new PIXI.Point();
let pointerStart = new PIXI.Point();
let diffX;
let diffY;
let imageContainer;
let images;
let imagesUrls;
let resizeTimer
// Variables and settings for grid
let gridColumnsCount, gridRowsCount, gridColumns, gridRows, grid;
let widthRest, heightRest, centerX, centerY, rects;

/*
 * Calls
 */
init();


/*
 * Helper functions
 */
function initDimensions() {
  width = container.offsetWidth;
  height = container.offsetHeight;
  diffX = 0;
  diffY = 0;
}


function init() {

  initDimensions();

  // Set initial values for uniforms
  uniforms = {
    uResolution: new PIXI.Point(width, height),
    uPointerDown: pointerDownTarget,
    uPointerDiff: new PIXI.Point()
  }

  initGrid();

  // Create fallback canvas
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  // Create PIXI Application object
  app = new PIXI.Application({
    view: canvas,
    width: width,
    height: height,
  });
  app.renderer.autoDensity = true;

  initBackground();

  initDistortion();

  initImageContainer();

  initRectsAndImages();

  initEvents();

  app.ticker.add(() => {
    uniforms.uPointerDown += (pointerDownTarget - uniforms.uPointerDown) * 0.075;
    uniforms.uPointerDiff.x += (diffX - uniforms.uPointerDiff.x) * 0.2;
    uniforms.uPointerDiff.y += (diffY - uniforms.uPointerDiff.y) * 0.2;
    imageContainer.x = uniforms.uPointerDiff.x - centerX;
    imageContainer.y = uniforms.uPointerDiff.y - centerY;
    // Check rects and load/cancel images as needded
    checkRectsAndImages()
  });
}


// Clean the current Application
function clean() {
  // Stop the current animation
  app.ticker.stop();
  // Remove event listeners
  app.stage
    .off("pointerdown", onPointerDown)
    .off('pointerup', onPointerUp)
    .off('pointerupoutside', onPointerUp)
    .off('pointermove', onPointerMove);
  // Abort all fetch calls in progress
  rects.forEach((rect) => {
    if (rect.discovered && !rect.loaded) {
      rect.controller.abort();
    }
  });
}


function initBackground() {
  // Create an empty sprite and define its size
  background = new PIXI.Sprite();
  background.width = width;
  background.height = height;

  // Create a new Filter using the fragment shader
  // We don't need a custom vertex shader, so we set it as `undefined`
  const backgroundFilter = new PIXI.Filter(undefined, backgroundFragment, uniforms);

  // Assign the filter to the background sprite
  background.filters = [backgroundFilter];

  // Add the background to the stage
  app.stage.addChild(background);
}

// Sets the distortion filter for the entire stage
function initDistortion() {
  const stageFilter = new PIXI.Filter(undefined, stageFragment, uniforms);
  app.stage.filters = [stageFilter];
}


function initEvents() {
  // Make stage interactive so it can listen to events
  app.stage.interactive = true;

  // Set multiple mouse listeners
  app.stage
    .on("pointerdown", onPointerDown)
    .on('pointerup', onPointerUp)
    .on('pointerupoutside', onPointerUp)
    .on('pointermove', onPointerMove);

  window.addEventListener('resize', onResize);
}


// Apply distortion filter when mouse is clicked
function onPointerDown(e) {
  pointerDownTarget = 1;

  const { x, y } = e.data.global;
  pointerStart.set(x, y);
  pointerDiffStart = uniforms.uPointerDiff.clone();
};


// Remove distortion filter when mouse is unclicked
function onPointerUp() {
  pointerDownTarget = 0;
};


function onPointerMove(e) {
  const { x, y } = e.data.global;
  if (pointerDownTarget) {
    diffX = pointerDiffStart.x + (x - pointerStart.x);
    diffY = pointerDiffStart.y + (y - pointerStart.y);
    diffX = diffX > 0 ? Math.min(diffX, centerX + imagePadding) : Math.max(diffX, -(centerX + widthRest));
    diffY = diffY > 0 ? Math.min(diffY, centerY + imagePadding) : Math.max(diffY, -(centerY + heightRest));
  }
};


// On resize, reinit the app (clean and init)
// But first debounce the calls, so we don't call init too often
function onResize() {
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = setTimeout(() => {
    clean();
    init();
  }, 200);
};


// Initialize the random grid layout
function initGrid() {
  gridColumnsCount = Math.ceil(width / gridSize);
  gridRowsCount = Math.ceil(height / gridSize);
  // Make the grid 5 times bigger than viewport
  gridColumns = gridColumnsCount * 5;
  gridRows = gridRowsCount * 5;
  // Create a new Grid instance with our settings
  grid = new Grid(gridSize, gridColumns, gridRows, gridMin);
  // Calculate the center position for the grid in the viewport
  widthRest = Math.ceil(gridColumnsCount * gridSize - width)
  heightRest = Math.ceil(gridRowsCount * gridSize - height)
  centerX = (gridColumns * gridSize / 2) - (gridColumnsCount * gridSize / 2)
  centerY = (gridRows * gridSize / 2) - (gridRowsCount * gridSize / 2)
  // Generate the list of rects
  rects = grid.generateRects()
  // For the list of images
  images = []
  // For storing the image URL and avoid duplicates
  imagesUrls = {}
}


// Initialize a Container element for solid rectangles and images
function initImageContainer() {
  imageContainer = new PIXI.Container();
  app.stage.addChild(imageContainer)
}


// Add solid rectangles and images
function initRectsAndImages() {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(0xffffff);
  rects.forEach(rect => {
    // Create a new Sprite element for each image
    const image = new PIXI.Sprite();
    // Set image's position and size
    image.x = rect.x * gridSize;
    image.y = rect.y * gridSize;
    image.width = rect.w * gridSize - imagePadding;
    image.height = rect.h * gridSize - imagePadding;
    // Set it's alpha to 0, so it is not visible initially
    image.alpha = 0
    // Add image to the list
    images.push(image);
    // Draw the rectangle
    graphics.drawRect(image.x, image.y, image.width, image.height);
  });
  graphics.endFill();
  imageContainer.addChild(graphics);
  // Add all new Sprites to the container
  images.forEach(image => {
    imageContainer.addChild(image);
  });
}


// Load images from unsplash.com
function loadTextureForImage(index) {
  // Get image Sprite
  const image = images[index];

  // Set the url to get a random image from Unsplash Source, given image dimensions
  const url = `https://source.unsplash.com/random/${image.width}x${image.height}`;

  // Get the corresponding rect
  const rect = rects[index];

  // Create a new AbortController, to abort fetch if needed
  rect.controller = new AbortController();

  // Fetch the image, and react to promise
  fetch(url, rect.controller).then(response => {
    // Get image URL, and if it was downloaded before, load another image
    // Otherwise, save image URL and set the texture
    const id = response.url.split('?')[0];
    if (imagesUrls[id]) {
      loadTextureForImage(index);
    }
    else {
      imagesUrls[id] = true;
      image.texture = PIXI.Texture.from(response.url);
      rect.loaded = true;
    }
  }).catch(() => {
    // Catch errors silently, for not showing the following error message if it is aborted:
    // AbortError: The operation was aborted.
  });
}


// Check if rects intersects with the viewport
// and loads corresponding image
function checkRectsAndImages() {
  // Loop over rects
  rects.forEach((rect, index) => {
    // Get corresponding image
    const image = images[index];

    // Check if the rect intersects with the viewport
    if (rectIntersectsWithViewport(rect)) {
      // If rect just has been discovered
      // start loading image
      if (!rect.discovered) {
        rect.discovered = true;
        loadTextureForImage(index);
      }

      // If image is loaded, increase alpha if possible
      if (rect.loaded && image.alpha < 1) {
        image.alpha += 0.01;
      }
    } else {
      // The rect is not intersecting
      // If the rect was in viewport before, but the
      // image is not loaded yet, abort the fetch
      if (rect.discovered && !rect.loaded) {
        rect.discovered = false;
        rect.controller.abort();
      }
      // Decrease alpha if possible
      if (image.alpha > 0) {
        image.alpha -= 0.01;
      }
    }
  })
}


// Check if a rect intersects the viewport
function rectIntersectsWithViewport(rect) {
  return (
    rect.x * gridSize + imageContainer.x <= width &&
    0 <= (rect.x + rect.w) * gridSize + imageContainer.x &&
    rect.y * gridSize + imageContainer.y <= height &&
    0 <= (rect.y + rect.h) * gridSize + imageContainer.y
  );
}

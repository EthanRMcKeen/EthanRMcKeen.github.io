const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');

let stars = [];
const starCount = 300;
let hyperspace = true;

function resize() {
  const header = document.querySelector('header');
  canvas.width = header.offsetWidth;
  canvas.height = header.offsetHeight;

  // Reset the canvas scaling to prevent distortion
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function createStars() {
  stars = [];
  for (let i = 0; i < starCount; i++) {
    const speed = Math.random() * 0.5 + 0.5; // Start with a fast initial speed
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * canvas.width, // Depth for hyperspace effect
      speed: speed
    });
  }
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let star of stars) {
    ctx.beginPath();
    const starX = (star.x - canvas.width / 2) * (canvas.width / star.z) + canvas.width / 2;
    const starY = (star.y - canvas.height / 2) * (canvas.width / star.z) + canvas.height / 2;
    const starRadius = Math.max(1, 3 - star.z / (canvas.width / 2)); // Vary size based on depth
    ctx.fillStyle = `rgba(255, 255, 255, ${1 - star.z / canvas.width})`; // Fade effect based on depth
    ctx.arc(starX, starY, starRadius, 0, 2 * Math.PI);
    ctx.fill();

    star.z -= star.speed * (hyperspace ? 30 : 10); // Adjust speed based on hyperspace state
    if (star.z <= 0) {
      star.z = canvas.width;
      star.x = Math.random() * canvas.width;
      star.y = Math.random() * canvas.height;
    }
  }

  requestAnimationFrame(animateStars);
}


function transitionHeader() {
  const header = document.querySelector('header');
  const xwing = document.getElementById('xwing');

  header.classList.add('shrink-header'); // Add the class to shrink the header

  header.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'height') {
      hyperspace = false; // Stop hyperspace effect
      resize(); // Ensure the canvas resizes correctly

      xwing.style.display = 'block';
      setTimeout(() => {
        xwing.style.display = 'none';
      }, 1800); //18 frames
    }
  });
}

window.addEventListener('resize', () => {
  resize();
  createStars();
});

resize();
createStars();
animateStars();

setTimeout(() => {
  document.querySelector('header').classList.add('fade-in');
  transitionHeader();
}, 1000);
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');

let stars = [];
const starCount = 200;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = 300;
}

function createStars() {
  stars = [];
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5,
      speed: Math.random() * 0.1 + 0.2
    });
  }
}

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';

  for (let star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
    ctx.fill();

    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  }

  requestAnimationFrame(animateStars);
}

window.addEventListener('resize', () => {
  resize();
  createStars();
});

resize();
createStars();
animateStars();

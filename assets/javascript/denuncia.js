const slider = document.getElementById('slider');
const button = document.getElementById('slider-button');
const text = document.querySelector('.slider-text');



let isDragging = false;
let startX;
let currentX = 0;

const sliderPadding = 3;
const maxMove = slider.clientWidth - button.clientWidth - sliderPadding * 2;

// Função para iniciar o arrasto
function startDrag(x) {
    isDragging = true;
    startX = x - currentX;
}

// Função para arrastar
function duringDrag(x) {
    if (!isDragging) return;
    currentX = x - startX;
    if (currentX < 0) currentX = 0;
    if (currentX > maxMove) currentX = maxMove;
    button.style.transform = `translateX(${currentX}px)`;
    const opacity = 0.7 - (currentX / maxMove);
    text.style.opacity = opacity;
}


// Função para soltar
function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (currentX >= maxMove) {
        alert('Alarme desativado!');
        // Aqui você pode adicionar sua função de desbloqueio
    }

    currentX = 0;
    button.style.transform = `translateX(0px)`;

    text.style.opacity = 0.7;

}

// Eventos para desktop
button.addEventListener('mousedown', e => startDrag(e.clientX));
document.addEventListener('mousemove', e => duringDrag(e.clientX));
document.addEventListener('mouseup', endDrag);

// Eventos para mobile
button.addEventListener('touchstart', e => startDrag(e.touches[0].clientX));
document.addEventListener('touchmove', e => {
    duringDrag(e.touches[0].clientX);
});
document.addEventListener('touchend', endDrag);
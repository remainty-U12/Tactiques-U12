/* Rugby U12 — Prototype interactif
   Fonctions: terrain dessiné, pions glissables, modes (attaque/défense/contre), flèches, sauvegarde/localStorage, reset.
*/

const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');
const container = document.getElementById('field-container');
const piecesContainer = document.getElementById('pieces');

// UI
const btnAttack = document.getElementById('mode-attaque');
const btnDefense = document.getElementById('mode-defense');
const btnCounter = document.getElementById('mode-contre');
const btnAddArrow = document.getElementById('add-arrow');
const btnRemoveArrows = document.getElementById('remove-arrows');
const btnSave = document.getElementById('save');
const btnLoad = document.getElementById('load');
const btnReset = document.getElementById('reset');

// Flèches stockées
let arrows = [];
let addingArrow = false;
let arrowStart = null;

// Dessin du terrain (vue simplifiée demi-terrain élargi)
function drawField() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Fond vert
  ctx.fillStyle = getComputedStyle(canvas).backgroundColor || '#8fd18f';
  ctx.fillRect(0, 0, w, h);

  // Lignes de touche et en-but
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;

  // Encadrement
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Ligne médiane
  ctx.beginPath();
  ctx.moveTo(w / 2, 20);
  ctx.lineTo(w / 2, h - 20);
  ctx.stroke();

  // Lignes des 22 m (approx visuelle)
  const twentyTwoLeft = w / 2 - 220;
  const twentyTwoRight = w / 2 + 220;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(twentyTwoLeft, 20);
  ctx.lineTo(twentyTwoLeft, h - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(twentyTwoRight, 20);
  ctx.lineTo(twentyTwoRight, h - 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // Zones en-but
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(20, 20, 60, h - 40);
  ctx.fillRect(w - 80, 20, 60, h - 40);

  // Flèches existantes
  drawAllArrows();
}

function drawArrow(from, to) {
  const headLength = 12;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  // Ligne
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  // Pointe
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = '#333333';
  ctx.fill();
}

function drawAllArrows() {
  arrows.forEach(a => drawArrow(a.from, a.to));
}

// Placement utilitaire
function setPiecePosition(el, x, y) {
  // Convertir en position absolue relative au container
  const rect = canvas.getBoundingClientRect();
  el.style.left = `${rect.left + window.scrollX + x - 20}px`;
  el.style.top = `${rect.top + window.scrollY + y - 20}px`;
}

// Récupérer position centrée du pion
function getPieceCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - canvas.getBoundingClientRect().left, y: r.top + r.height / 2 - canvas.getBoundingClientRect().top };
}

// Drag & drop des pions
function enableDragging() {
  const pieces = document.querySelectorAll('#pieces .piece');
  pieces.forEach(p => {
    p.addEventListener('mousedown', onMouseDown);
    p.addEventListener('touchstart', onTouchStart, { passive: false });
  });
}

function onMouseDown(e) {
  e.preventDefault();
  const el = e.currentTarget;
  const shiftX = e.clientX - el.getBoundingClientRect().left;
  const shiftY = e.clientY - el.getBoundingClientRect().top;

  function onMouseMove(ev) {
    el.style.left = `${ev.pageX - shiftX}px`;
    el.style.top = `${ev.pageY - shiftY}px`;
    drawField();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onTouchStart(e) {
  e.preventDefault();
  const el = e.currentTarget;
  const touch = e.touches[0];
  const startX = touch.clientX - el.getBoundingClientRect().left;
  const startY = touch.clientY - el.getBoundingClientRect().top;

  function onTouchMove(ev) {
    const t = ev.touches[0];
    el.style.left = `${t.pageX - startX}px`;
    el.style.top = `${t.pageY - startY}px`;
    drawField();
  }

  function onTouchEnd() {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: false });
}

// Préréglages de modes
function setModeAttack() {
  const w = canvas.width, h = canvas.height;
  const mid = w / 2;

  // Avants: groupe au centre côté gauche (fixation)
  placeRole('avant', [
    { x: mid - 140, y: h / 2 - 40 },
    { x: mid - 120, y: h / 2 + 10 },
    { x: mid - 160, y: h / 2 + 60 },
    { x: mid - 100, y: h / 2 - 90 },
    { x: mid - 80,  y: h / 2 + 100 },
  ]);

  // Trois-quarts: ligne en profondeur, décalée vers l’aile droite
  placeRole('troisquarts', [
    { x: mid - 40,  y: h / 2 - 80 },
    { x: mid + 0,   y: h / 2 - 20 },
    { x: mid + 40,  y: h / 2 + 40 },
    { x: mid + 120, y: h / 2 - 40 },
    { x: mid + 180, y: h / 2 + 20 },
  ]);

  // Défense: ligne médiane
  placeRole('defense', [
    { x: mid + 40,  y: h / 2 - 120 },
    { x: mid + 40,  y: h / 2 - 80 },
    { x: mid + 40,  y: h / 2 - 40 },
    { x: mid + 40,  y: h / 2 +   0 },
    { x: mid + 40,  y: h / 2 +  40 },
    { x: mid + 40,  y: h / 2 +  80 },
    { x: mid + 40,  y: h / 2 + 120 },
    { x: mid + 80,  y: h / 2 - 60 },
    { x: mid + 80,  y: h / 2 +  60 },
    { x: mid + 120, y: h / 2 },
  ]);

  drawField();
}

function setModeDefense() {
  const w = canvas.width, h = canvas.height;
  const mid = w / 2;

  // Avants: ligne compacte au centre pour la montée
  placeRole('avant', [
    { x: mid - 60, y: h / 2 - 80 },
    { x: mid - 60, y: h / 2 - 20 },
    { x: mid - 60, y: h / 2 + 40 },
    { x: mid - 60, y: h / 2 + 90 },
    { x: mid - 60, y: h / 2 - 130 },
  ]);

  // Trois-quarts: couverture des extérieurs
  placeRole('troisquarts', [
    { x: mid + 20, y: h / 2 - 120 },
    { x: mid + 20, y: h / 2 - 40 },
    { x: mid + 20, y: h / 2 + 40 },
    { x: mid + 20, y: h / 2 + 120 },
    { x: mid - 20, y: h / 2 },
  ]);

  // Défense: en face (illustration)
  placeRole('defense', [
    { x: mid + 120, y: h / 2 - 120 },
    { x: mid + 120, y: h / 2 - 80 },
    { x: mid + 120, y: h / 2 - 40 },
    { x: mid + 120, y: h / 2 +   0 },
    { x: mid + 120, y: h / 2 +  40 },
    { x: mid + 120, y: h / 2 +  80 },
    { x: mid + 120, y: h / 2 + 120 },
    { x: mid + 160, y: h / 2 - 60 },
    { x: mid + 160, y: h / 2 +  60 },
    { x: mid + 200, y: h / 2 },
  ]);

  drawField();
}

function setModeCounter() {
  const w = canvas.width, h = canvas.height;
  const mid = w / 2;

  // Avants: soutien proche du point de récupération
  placeRole('avant', [
    { x: mid - 160, y: h / 2 - 20 },
    { x: mid - 140, y: h / 2 + 20 },
    { x: mid - 120, y: h / 2 + 60 },
    { x: mid - 100, y: h / 2 - 60 },
    { x: mid - 80,  y: h / 2 + 90 },
  ]);

  // Trois-quarts: profondeur et largeur pour exploiter l’espace
  placeRole('troisquarts', [
    { x: mid - 20,  y: h / 2 - 120 },
    { x: mid + 40,  y: h / 2 - 60 },
    { x: mid + 100, y: h / 2 },
    { x: mid + 160, y: h / 2 + 60 },
    { x: mid + 220, y: h / 2 + 120 },
  ]);

  // Défense: repli en désordre (illustration)
  placeRole('defense', [
    { x: mid + 80,  y: h / 2 - 140 },
    { x: mid + 60,  y: h / 2 - 20 },
    { x: mid + 120, y: h / 2 + 20 },
    { x: mid + 140, y: h / 2 + 100 },
    { x: mid + 100, y: h / 2 - 80 },
    { x: mid + 180, y: h / 2 - 40 },
    { x: mid + 200, y: h / 2 + 40 },
    { x: mid + 220, y: h / 2 - 120 },
    { x: mid + 240, y: h / 2 + 60 },
    { x: mid + 260, y: h / 2 },
  ]);

  drawField();
}

// Placement utilitaire pour un rôle
function placeRole(roleClass, positions) {
  const els = Array.from(document.querySelectorAll(`#pieces .${roleClass}`));
  els.forEach((el, i) => {
    const pos = positions[i % positions.length];
    setPiecePosition(el, pos.x, pos.y);
  });
}

// Sauvegarde / chargement
function saveState() {
  const pieces = Array.from(document.querySelectorAll('#pieces .piece')).map(el => {
    const rect = el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      role: el.dataset.role,
      x: rect.left - canvasRect.left + rect.width / 2,
      y: rect.top - canvasRect.top + rect.height / 2,
      classList: Array.from(el.classList)
    };
  });
  const data = { pieces, arrows };
  localStorage.setItem('rugby-u12-state', JSON.stringify(data));
  flash('Configuration sauvegardée.');
}

function loadState() {
  const raw = localStorage.getItem('rugby-u12-state');
  if (!raw) { flash('Aucune sauvegarde trouvée.'); return; }
  const data = JSON.parse(raw);
  // Replacer les pions
  data.pieces.forEach(p => {
    const el = document.querySelector(`#pieces .piece[data-role="${p.role}"]`);
    if (el) {
      const x = p.x, y = p.y;
      setPiecePosition(el, x, y);
    }
  });
  // Recharger flèches
  arrows = data.arrows || [];
  drawField();
  flash('Configuration chargée.');
}

function resetAll() {
  arrows = [];
  setModeAttack();
  flash('Terrain réinitialisé au mode attaque.');
}

// Feedback visuel
function flash(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  div.style.position = 'fixed';
  div.style.bottom = '16px';
  div.style.left = '50%';
  div.style.transform = 'translateX(-50%)';
  div.style.background = '#111827';
  div.style.color = '#fff';
  div.style.padding = '10px 14px';
  div.style.borderRadius = '8px';
  div.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
  div.style.zIndex = '9999';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1400);
}

// Gestion des flèches
function startAddArrow() {
  addingArrow = true;
  arrowStart = null;
  flash('Clique sur le terrain: départ puis arrivée de la flèche.');
}

canvas.addEventListener('click', (e) => {
  if (!addingArrow) return;
  const rect = canvas.getBoundingClientRect();
  const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

  if (!arrowStart) {
    arrowStart = pos;
  } else {
    arrows.push({ from: arrowStart, to: pos });
    arrowStart = null;
    addingArrow = false;
    drawField();
    flash('Flèche ajoutée.');
  }
});

function removeArrows() {
  arrows = [];
  drawField();
  flash('Toutes les flèches ont été supprimées.');
}

// Événements UI
btnAttack.addEventListener('click', setModeAttack);
btnDefense.addEventListener('click', setModeDefense);
btnCounter.addEventListener('click', setModeCounter);
btnAddArrow.addEventListener('click', startAddArrow);
btnRemoveArrows.addEventListener('click', removeArrows);
btnSave.addEventListener('click', saveState);
btnLoad.addEventListener('click', loadState);
btnReset.addEventListener('click', resetAll);

// Initialisation
function init() {
  drawField();
  enableDragging();
  setModeAttack(); // position de départ
}
init();

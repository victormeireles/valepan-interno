// Código estático incorporado ao HTML; nenhum texto do usuário é interpolado.
const FIT_SCRIPT = `
class EtiquetaFitCoordinator {
  start() {
    document.fonts.ready.then(() => this.fit());
    window.addEventListener('beforeprint', () => this.fit());
  }

  fit() {
    this.fitTitle();
    document.querySelectorAll('[data-fit-width]').forEach(element => this.fitWidth(element));
  }

  fitTitle() {
    const title = document.querySelector('.family-title');
    const container = document.querySelector('.title-container');
    if (!title || !container) return;
    title.style.whiteSpace = 'nowrap';
    if (this.resizeTitle(title, container, 124, 64, 1)) return;
    title.style.whiteSpace = 'normal';
    this.resizeTitle(title, container, 64, 12, 2);
  }

  resizeTitle(title, container, maximum, minimum, lines) {
    for (let size = maximum; size >= minimum; size--) {
      title.style.fontSize = size + 'px';
      if (title.scrollWidth <= container.clientWidth
        && title.getBoundingClientRect().height <= Math.min(container.clientHeight, size * .98 * lines + 2)) {
        return true;
      }
    }
    return false;
  }

  fitWidth(element) {
    const maximum = Number(element.dataset.fitWidth);
    for (let size = maximum; size >= 8; size--) {
      element.style.fontSize = size + 'px';
      if (element.scrollWidth <= element.clientWidth) return;
    }
  }
}
new EtiquetaFitCoordinator().start();
`;

export class EtiquetaFitScript {
  render(): string { return FIT_SCRIPT; }
}

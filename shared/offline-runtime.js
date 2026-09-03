/* Shared startup guard for static, offline-safe SP015 simulations. */

const SP015Runtime = Object.freeze({
  missingDependencies(names) {
    return names.filter((name) => {
      if (name === 'p5') return typeof window.p5 === 'undefined';
      if (name === 'katex') return typeof window.katex === 'undefined';
      return true;
    });
  },

  requireDependencies(names) {
    const missing = this.missingDependencies(names);
    if (!missing.length) return true;

    this.showDependencyError(missing);
    return false;
  },

  showDependencyError(missing) {
    if (document.querySelector('.dependency-error')) return;
    const message = document.createElement('section');
    message.className = 'dependency-error';
    message.setAttribute('role', 'alert');
    message.innerHTML = `<h2>Simulation unavailable</h2><p>This simulation needs local runtime files that did not load: <strong>${missing.join(', ')}</strong>.</p><p>Check that the repository's <code>vendor/</code> folder is present, then reload the page.</p>`;
    document.body.prepend(message);
  },
});

// Global-mode p5 calls setup() only when p5 itself loaded, so perform a
// page-level check as well. The sketch-level guard gives instance-mode sims
// the same behavior and keeps startup failures explicit.
document.addEventListener('DOMContentLoaded', () => {
  SP015Runtime.requireDependencies(['p5', 'katex']);
});

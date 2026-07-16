(() => {
  const button = document.querySelector('[data-native-share]');
  button?.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else await navigator.clipboard.writeText(location.href).catch(() => {});
  });
})();
